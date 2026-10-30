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
import { estimateOwnerPackagingHypothesis, ownerPackagingHypothesesSchema } from "../src/features/shipping/owner-packaging-hypothesis";
import { logisticsGtinSchema, normalizeLogisticsGtin } from "../src/features/shipping/logistics-evidence";
import { shippingDraftSchema } from "../src/features/shipping/product-draft";

const inputSchema = z.array(logisticsGtinSchema).min(1).max(5000)
  .refine(values => new Set(values).size === values.length, "GTIN repetido no lote.");
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const operationModes = z.enum(["NULL_ONLY", "FILL_ESTIMATED_DIMENSIONS_ONLY", "FILL_EMPTY_ESTIMATED_PROFILE"]);
const weightSourceActions = ["PRODUCT_WEIGHT_DRAFT_ESTIMATED", "PRODUCT_WEIGHT_DRAFT_REFINED"];
type OperationMode = z.infer<typeof operationModes>;

function eligibleEstimatedProfile(value: unknown, hasWeight: boolean) {
  const parsed = shippingDraftSchema.safeParse(value);
  if (!parsed.success || value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return profile.enabled === false && profile.transportReviewed === false && profile.measurementBasis === "estimated" &&
    profile.reference === null && !parsed.data.approvedServiceIds?.length &&
    profile.lengthCm === null && profile.widthCm === null && profile.heightCm === null &&
    (hasWeight ? typeof profile.weightGrams === "number" && profile.weightGrams > 0 : profile.weightGrams === null);
}

/** Existing profiles stay protected unless an explicit, reviewed fill mode applies to their missing fields. */
export async function applyProductPackagingHypotheses(db: Pick<PrismaClient, "$transaction">, values: unknown, actorId: string, apply = false, expectedPlan?: string, hypotheses: unknown = [], mode: OperationMode = "NULL_ONLY") {
  const operationMode = operationModes.parse(mode);
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
    const eligibleIds = operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY" ? catalog
      .filter(product => gtins.includes(product.gtin) && eligibleEstimatedProfile(product.shippingProfile, true)).map(product => product.id) : [];
    const weightAudits = eligibleIds.length ? await tx.auditLog.findMany({
      where: { action: { in: weightSourceActions }, entity: "Product", entityId: { in: eligibleIds } },
      select: { id: true, action: true, entity: true, entityId: true, metadata: true }, orderBy: { id: "asc" },
    }) : [];
    const plans = gtins.map(gtin => {
      const matches = catalog.filter(product => product.gtin === gtin);
      if (matches.length !== 1) throw new Error(`GTIN ${gtin}: correspondência ausente ou ambígua; lote cancelado.`);
      const product = matches[0];
      const identity = { productId: product.id, gtin, revision: product.updatedAt.toISOString(), previousProfile: product.shippingProfile };
      const preserve = { ...identity, action: "PRESERVE_EXISTING_PROFILE" as const, estimate: null };
      if (operationMode === "NULL_ONLY" ? product.shippingProfile !== null : !eligibleEstimatedProfile(product.shippingProfile, operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY")) return preserve;
      // Explicit fill modes bind the manifest identity before even the documentary estimator runs.
      if (operationMode !== "NULL_ONLY" && !groups.some(group => group.members.some(member => member.gtin === gtin && member.expectedName === product.name))) return preserve;
      const profileSourceAudit = operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY" ? weightAudits.find(audit => {
        const metadata = audit.metadata;
        return weightSourceActions.includes(audit.action) && audit.entity === "Product" && audit.entityId === product.id &&
          metadata !== null && typeof metadata === "object" && !Array.isArray(metadata) &&
          ["weight-only-v1", "weight-only-v2", "weight-only-v3", "weight-only-v4"].includes(String(metadata.policyVersion)) && isDeepStrictEqual(metadata.draft, product.shippingProfile);
      }) ?? null : null;
      if (operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY" && !profileSourceAudit) return preserve;
      if (product.isPopularPharmacy || ["CONTROLLED", "ANTIMICROBIAL"].includes(product.prescriptionType) ||
        (product.requiresPrescription && product.prescriptionType !== "ORDINARY")) return { ...identity, action: "PENDING_PHYSICAL_REVIEW" as const, estimate: null };
      const estimate = estimateAverageShipping(product, catalog) ?? estimateOwnerPackagingHypothesis(product, groups);
      if (!estimate) return { ...identity, action: "PENDING_PHYSICAL_REVIEW" as const, estimate: null };
      const proposed = product.shippingProfile === null ? { ...estimate.draft, approvedServiceIds: [] } : {
        ...product.shippingProfile as Record<string, unknown>,
        ...(operationMode === "FILL_EMPTY_ESTIMATED_PROFILE" ? { weightGrams: estimate.draft.weightGrams } : {}),
        lengthCm: estimate.draft.lengthCm, widthCm: estimate.draft.widthCm, heightCm: estimate.draft.heightCm,
      };
      const draft = shippingDraftSchema.safeParse(proposed);
      if (!draft.success || draft.data.measurementBasis !== "estimated" || draft.data.reference !== null ||
        !draft.data.weightGrams || !draft.data.lengthCm || !draft.data.widthCm || !draft.data.heightCm) throw new Error(`GTIN ${gtin}: estimativa inválida; lote cancelado.`);
      return { ...identity, action: operationMode === "NULL_ONLY" ? "SAVE_ESTIMATED_PACKAGE" as const : operationMode,
        profileSourceAudit, sourceProfileOrigin: operationMode === "FILL_EMPTY_ESTIMATED_PROFILE" ? "EXISTING_EMPTY_ESTIMATED_PROFILE" as const : operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY" ? "INTACT_WEIGHT_POLICY_DRAFT" as const : "NULL_PROFILE" as const,
        estimate: { ...estimate, draft: product.shippingProfile === null ? draft.data : proposed,
          weightAppliedFrom: operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY" ? "PRESERVED_EXISTING_PROFILE" as const : "INDIVIDUAL_ESTIMATE" as const } };
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
        metadata: { actorId, gtin: plan.gtin, operationMode, planSha256, cohortSha256, packagingHypothesesSha256, previousProfile: plan.previousProfile,
          profileSourceAudit: plan.profileSourceAudit, sourceProfileOrigin: plan.sourceProfileOrigin, ...plan.estimate,
          authorizationBasis: operationMode === "FILL_ESTIMATED_DIMENSIONS_ONLY" ? "Hipóteses geométricas autorizadas para completar somente medidas nulas de rascunhos íntegros da política de peso; peso e demais chaves preservados, sem aprovação de transporte." : operationMode === "FILL_EMPTY_ESTIMATED_PROFILE" ? "Hipóteses por grupo autorizadas para preencher somente peso e medidas literalmente nulos de perfis estimados, desativados e sem revisão; demais chaves preservadas, sem medição ou aprovação de transporte." : "Hipóteses aproximadas por grupo de embalagem autorizadas pelo lojista para conferência, somente em perfis nulos; sem medição, encaixe confirmado ou aprovação de transporte." } } });
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
    if (["--apply", "--fill-estimated-dimensions-only", "--fill-empty-estimated-profile"].includes(option)) continue;
    if (["--input", "--hypotheses", "--actor-id", "--expect-plan"].includes(option) && args[index + 1] && !args[index + 1].startsWith("--")) { index++; continue; }
    throw new Error("Use node --import tsx scripts/apply-product-packaging-hypotheses.ts --input <GTINs.json> --hypotheses <hipoteses.json> --actor-id <ADMIN> [--fill-estimated-dimensions-only | --fill-empty-estimated-profile] [--apply --expect-plan <SHA-256>].");
  }
  if (seen.has("--fill-estimated-dimensions-only") && seen.has("--fill-empty-estimated-profile")) throw new Error("Modos de preenchimento são mutuamente exclusivos.");
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
  const mode: OperationMode = seen.has("--fill-estimated-dimensions-only") ? "FILL_ESTIMATED_DIMENSIONS_ONLY" : seen.has("--fill-empty-estimated-profile") ? "FILL_EMPTY_ESTIMATED_PROFILE" : "NULL_ONLY";
  try { console.log(JSON.stringify(await applyProductPackagingHypotheses(db, values, actor, seen.has("--apply"), expectedPlan, hypotheses, mode))); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).replaceAll("\\", "/").endsWith("/apply-product-packaging-hypotheses.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha no lote de hipóteses de embalagem."); process.exitCode = 1; });
}
