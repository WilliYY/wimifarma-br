import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { lockProductCatalog } from "../src/features/products/mutations";
import { estimateAverageShipping } from "../src/features/shipping/average-estimate";
import { logisticsGtinSchema, normalizeLogisticsGtin } from "../src/features/shipping/logistics-evidence";
import { shippingDraftSchema } from "../src/features/shipping/product-draft";

const inputSchema = z.array(logisticsGtinSchema).min(1).max(5000)
  .refine(items => new Set(items).size === items.length, "GTIN repetido no lote.");
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function eligibleExistingDraft(value: unknown) {
  const parsed = shippingDraftSchema.safeParse(value);
  return parsed.success && value !== null && typeof value === "object" && !Array.isArray(value) &&
    "measurementBasis" in value && value.measurementBasis === "estimated" && "reference" in value && value.reference === null && !parsed.data.approvedServiceIds?.length &&
    "lengthCm" in value && value.lengthCm === null && "widthCm" in value && value.widthCm === null && "heightCm" in value && value.heightCm === null;
}

export async function applyProductAverageDrafts(db: Pick<PrismaClient, "$transaction">, values: unknown, actorId: string, apply = false, expectedPlan?: string) {
  const gtins = inputSchema.parse(values);
  if (apply && !/^[a-f0-9]{64}$/.test(expectedPlan ?? "")) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return db.$transaction(async tx => {
    await lockProductCatalog(tx);
    if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("ADMIN ativo obrigatório.");
    const products = await tx.product.findMany({
      where: { status: "ACTIVE", deletedAt: null }, orderBy: { id: "asc" },
      select: { id: true, name: true, ean: true, eanNormalized: true, category: true, brand: true, activeIngredients: true, requiresPrescription: true, prescriptionType: true,
        isPopularPharmacy: true, shippingProfile: true, logisticsEvidence: true, updatedAt: true },
    });
    const catalog = products.map(product => ({ ...product, gtin: normalizeLogisticsGtin(product.eanNormalized ?? product.ean) }))
      .filter((product): product is typeof product & { gtin: string } => product.gtin !== null);
    const cohortSha256 = sha256(catalog);
    const eligibleIds = catalog.filter(product => gtins.includes(product.gtin) && eligibleExistingDraft(product.shippingProfile)).map(product => product.id);
    const weightAudits = eligibleIds.length ? await tx.auditLog.findMany({
      where: { action: "PRODUCT_WEIGHT_DRAFT_ESTIMATED", entity: "Product", entityId: { in: eligibleIds } },
      select: { id: true, entityId: true, metadata: true }, orderBy: { id: "asc" },
    }) : [];
    const plans = gtins.map(gtin => {
      const matches = catalog.filter(product => product.gtin === gtin);
      if (matches.length !== 1) throw new Error(`GTIN ${gtin}: correspondência ausente ou ambígua; lote cancelado.`);
      const product = matches[0], previousProfile = product.shippingProfile;
      const identity = { productId: product.id, gtin, revision: product.updatedAt.toISOString(), previousProfile, weightSourceAudit: null };
      const preserve = { ...identity, action: "PRESERVE_EXISTING_PROFILE" as const, estimate: null };
      if (previousProfile !== null && !eligibleExistingDraft(previousProfile)) return preserve;
      const estimate = estimateAverageShipping(product, catalog);
      if (!estimate) return { ...identity, action: "PENDING_PHYSICAL_REVIEW" as const, estimate: null };
      const weightSourceAudit = previousProfile === null ? null : weightAudits.find(audit => {
        const metadata = audit.metadata;
        return audit.entityId === product.id && metadata !== null && typeof metadata === "object" && !Array.isArray(metadata) &&
          ["weight-only-v1", "weight-only-v2", "weight-only-v3", "weight-only-v4"].includes(String(metadata.policyVersion)) && isDeepStrictEqual(metadata.draft, previousProfile);
      }) ?? null;
      // Only an intact draft from our earlier weight policy permits refining an existing weight.
      const draft = previousProfile === null ? estimate.draft : { ...previousProfile as Record<string, unknown>,
        ...(weightSourceAudit ? { weightGrams: estimate.draft.weightGrams } : {}),
        lengthCm: estimate.draft.lengthCm, widthCm: estimate.draft.widthCm, heightCm: estimate.draft.heightCm };
      if (!shippingDraftSchema.safeParse(draft).success) throw new Error(`GTIN ${gtin}: estimativa inválida; lote cancelado.`);
      return { ...identity, action: previousProfile === null ? "SAVE_ESTIMATED_PACKAGE" as const : weightSourceAudit ? "REFINE_ESTIMATED_PACKAGE" as const : "FILL_ESTIMATED_DIMENSIONS_ONLY" as const,
        weightSourceAudit, estimate: { ...estimate, draft } };
    });
    const planSha256 = sha256({ operation: "ESTIMATE_PACKAGE_AVERAGES", cohortSha256, products: plans });
    if (apply && expectedPlan !== planSha256) throw new Error("Plano mudou desde o dry-run; nenhuma gravação aplicada.");
    for (const plan of plans) {
      if (!apply || !plan.estimate) continue;
      const changed = await tx.product.updateMany({
        where: { id: plan.productId, status: "ACTIVE", deletedAt: null, updatedAt: new Date(plan.revision) },
        data: { shippingProfile: plan.estimate.draft },
      });
      if (changed.count !== 1) throw new Error("Produto mudou durante a aplicação; lote revertido.");
      await tx.auditLog.create({ data: { userId: actorId, action: "PRODUCT_PACKAGE_DRAFT_ESTIMATED", entity: "Product", entityId: plan.productId,
        metadata: { gtin: plan.gtin, planSha256, cohortSha256, previousProfile: plan.previousProfile, weightSourceAudit: plan.weightSourceAudit, ...plan.estimate,
          weightPolicy: plan.action === "FILL_ESTIMATED_DIMENSIONS_ONLY" ? "PRESERVE_EXISTING_WEIGHT" : plan.weightSourceAudit ? "REFINE_INTACT_POLICY_DRAFT" : "ESTIMATE_NEW_PROFILE",
          authorizationBasis: "Médias aproximadas autorizadas para conferência; sem medição ou transporte liberado." } } });
    }
    return { applied: apply, planSha256, cohortSha256, products: plans };
  }, { timeout: 180000 });
}

async function main() {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--apply") continue;
    if (["--input", "--actor-id", "--expect-plan"].includes(args[index]) && args[index + 1] && !args[index + 1].startsWith("--")) { index++; continue; }
    throw new Error("Use --input <GTINs.json> --actor-id <ADMIN> [--apply --expect-plan <SHA-256>].");
  }
  if (!args.includes("--input") || !args.includes("--actor-id")) throw new Error("Informe --input e --actor-id. Dry-run é o padrão.");
  const input = args[args.indexOf("--input") + 1], actor = args[args.indexOf("--actor-id") + 1];
  if ((await stat(input)).size > 1_000_000) throw new Error("Arquivo excede 1 MB.");
  const values: unknown = JSON.parse(await readFile(input, "utf8"));
  inputSchema.parse(values);
  const db = getPrisma();
  try { console.log(JSON.stringify(await applyProductAverageDrafts(db, values, actor, args.includes("--apply"), args.includes("--expect-plan") ? args[args.indexOf("--expect-plan") + 1] : undefined))); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).replaceAll("\\", "/").endsWith("/apply-product-average-drafts.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha no lote de médias."); process.exitCode = 1; });
}
