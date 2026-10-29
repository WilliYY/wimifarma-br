import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { lockProductCatalog } from "../src/features/products/mutations";
import { estimateAverageShipping } from "../src/features/shipping/average-estimate";
import { estimateOwnerPackagingHypothesis, ownerPackagingHypothesesSchema } from "../src/features/shipping/owner-packaging-hypothesis";
import { logisticsGtinSchema, normalizeLogisticsGtin } from "../src/features/shipping/logistics-evidence";
import { shippingDraftSchema } from "../src/features/shipping/product-draft";

const inputSchema = z.array(logisticsGtinSchema).min(1).max(5000)
  .refine(values => new Set(values).size === values.length, "GTIN repetido no lote.");
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const operationMode = "NULL_ONLY" as const;

/** Only null profiles may receive an estimate. Existing JSON is preserved before any estimator is called. */
export async function applyProductPackagingHypotheses(db: Pick<PrismaClient, "$transaction">, values: unknown, actorId: string, apply = false, expectedPlan?: string, hypotheses: unknown = []) {
  const gtins = inputSchema.parse(values);
  const groups = ownerPackagingHypothesesSchema.parse(hypotheses);
  const packagingHypothesesSha256 = sha256(groups);
  if (apply && !/^[a-f0-9]{64}$/.test(expectedPlan ?? "")) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return db.$transaction(async tx => {
    await lockProductCatalog(tx);
    if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("ADMIN ativo obrigatório.");
    const products = await tx.product.findMany({
      where: { status: "ACTIVE", deletedAt: null }, orderBy: { id: "asc" },
      select: { id: true, name: true, ean: true, eanNormalized: true, category: true, brand: true, activeIngredients: true, requiresPrescription: true, prescriptionType: true,
        isPopularPharmacy: true, shippingProfile: true, logisticsEvidence: true, updatedAt: true },
    });
    // Even active rows without a valid GTIN participate: no catalog change may escape the reviewed snapshot.
    const cohortSha256 = sha256(products);
    const catalog = products.map(product => ({ ...product, gtin: normalizeLogisticsGtin(product.eanNormalized ?? product.ean) }))
      .filter((product): product is typeof product & { gtin: string } => product.gtin !== null);
    const plans = gtins.map(gtin => {
      const matches = catalog.filter(product => product.gtin === gtin);
      if (matches.length !== 1) throw new Error(`GTIN ${gtin}: correspondência ausente ou ambígua; lote cancelado.`);
      const product = matches[0];
      const identity = { productId: product.id, gtin, revision: product.updatedAt.toISOString(), previousProfile: product.shippingProfile };
      if (product.shippingProfile !== null) return { ...identity, action: "PRESERVE_EXISTING_PROFILE" as const, estimate: null };
      if (product.isPopularPharmacy || ["CONTROLLED", "ANTIMICROBIAL"].includes(product.prescriptionType) ||
        (product.requiresPrescription && product.prescriptionType !== "ORDINARY")) return { ...identity, action: "PENDING_PHYSICAL_REVIEW" as const, estimate: null };
      const estimate = estimateAverageShipping(product, catalog) ?? estimateOwnerPackagingHypothesis(product, groups);
      if (!estimate) return { ...identity, action: "PENDING_PHYSICAL_REVIEW" as const, estimate: null };
      const draft = shippingDraftSchema.safeParse({ ...estimate.draft, approvedServiceIds: [] });
      if (!draft.success || draft.data.measurementBasis !== "estimated" || draft.data.reference !== null) throw new Error(`GTIN ${gtin}: estimativa inválida; lote cancelado.`);
      return { ...identity, action: "SAVE_ESTIMATED_PACKAGE" as const, estimate: { ...estimate, draft: draft.data } };
    });
    const planSha256 = sha256({ operation: "ESTIMATE_PACKAGING_HYPOTHESES", operationMode, cohortSha256, packagingHypothesesSha256, products: plans });
    if (apply && expectedPlan !== planSha256) throw new Error("Plano mudou desde o dry-run; nenhuma gravação aplicada.");
    for (const plan of plans) {
      if (!apply || !plan.estimate) continue;
      const changed = await tx.product.updateMany({
        where: { id: plan.productId, status: "ACTIVE", deletedAt: null, updatedAt: new Date(plan.revision) },
        data: { shippingProfile: plan.estimate.draft },
      });
      if (changed.count !== 1) throw new Error("Produto mudou durante a aplicação; lote revertido.");
      await tx.auditLog.create({ data: { userId: actorId, action: "PRODUCT_PACKAGE_DRAFT_ESTIMATED", entity: "Product", entityId: plan.productId,
        metadata: { actorId, gtin: plan.gtin, operationMode, planSha256, cohortSha256, packagingHypothesesSha256, previousProfile: null, ...plan.estimate,
          authorizationBasis: "Hipóteses aproximadas por grupo de embalagem autorizadas pelo lojista para conferência, somente em perfis nulos; sem medição, encaixe confirmado ou aprovação de transporte." } } });
    }
    return { applied: apply, operationMode, planSha256, cohortSha256, packagingHypothesesSha256, products: plans };
  }, { timeout: 180000 });
}

async function main() {
  const args = process.argv.slice(2);
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (seen.has(option)) throw new Error(`Opção repetida: ${option}.`);
    seen.add(option);
    if (option === "--apply") continue;
    if (["--input", "--hypotheses", "--actor-id", "--expect-plan"].includes(option) && args[index + 1] && !args[index + 1].startsWith("--")) { index++; continue; }
    throw new Error("Use node --import tsx scripts/apply-product-packaging-hypotheses.ts --input <GTINs.json> --hypotheses <hipoteses.json> --actor-id <ADMIN> [--apply --expect-plan <SHA-256>].");
  }
  if (!["--input", "--hypotheses", "--actor-id"].every(option => seen.has(option))) throw new Error("Informe --input, --hypotheses e --actor-id. Dry-run é o padrão.");
  const expectedPlan = seen.has("--expect-plan") ? args[args.indexOf("--expect-plan") + 1] : undefined;
  if (seen.has("--apply") && !/^[a-f0-9]{64}$/.test(expectedPlan ?? "")) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  const input = args[args.indexOf("--input") + 1], manifest = args[args.indexOf("--hypotheses") + 1], actor = args[args.indexOf("--actor-id") + 1];
  if ((await stat(input)).size > 1_000_000) throw new Error("Arquivo de entrada excede 1 MB.");
  const values: unknown = JSON.parse(await readFile(input, "utf8"));
  inputSchema.parse(values);
  if ((await stat(manifest)).size > 5_000_000) throw new Error("Manifesto de hipóteses excede 5 MB.");
  const hypotheses = ownerPackagingHypothesesSchema.parse(JSON.parse(await readFile(manifest, "utf8")));
  const db = getPrisma();
  try { console.log(JSON.stringify(await applyProductPackagingHypotheses(db, values, actor, seen.has("--apply"), expectedPlan, hypotheses))); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).replaceAll("\\", "/").endsWith("/apply-product-packaging-hypotheses.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha no lote de hipóteses de embalagem."); process.exitCode = 1; });
}
