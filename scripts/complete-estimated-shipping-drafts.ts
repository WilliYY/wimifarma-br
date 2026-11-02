import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { lockProductCatalog } from "../src/features/products/mutations";
import { normalizeLogisticsGtin } from "../src/features/shipping/logistics-evidence";
import { shippingDraftSchema } from "../src/features/shipping/product-draft";

const POLICY_VERSION = "complete-estimated-shipping-drafts-v1";
const physicalKeys = ["weightGrams", "lengthCm", "widthCm", "heightCm"] as const;
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const scenarios = {
  SOLID_300: { weightGrams: 300, lengthCm: 24, widthCm: 15, heightCm: 10 },
  ALBENDAZOL_GLASS_300: { weightGrams: 300, lengthCm: 24, widthCm: 15, heightCm: 10 },
  CLOPIDOGREL_360: { weightGrams: 360, lengthCm: 30, widthCm: 20, heightCm: 15 },
  PLAX_1080: { weightGrams: 1080, lengthCm: 30, widthCm: 20, heightCm: 15 },
} as const;

// Canonical JSON binds literal values while ignoring JSON object key ordering.
export function completionSha256(value: unknown): string {
  const canonical = (input: unknown): unknown => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)]));
    return input;
  };
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

const entrySchema = z.object({
  productId: z.string().min(1).max(100), expectedEan: z.string().min(8).max(14),
  expectedName: z.string().min(1).max(500), expectedUpdatedAt: z.iso.datetime(),
  expectedShippingProfile: z.record(z.string(), z.unknown()).nullable(), expectedProfileSha256: hashSchema,
  scenario: z.enum(["SOLID_300", "ALBENDAZOL_GLASS_300", "CLOPIDOGREL_360", "PLAX_1080"]),
}).strict();
const manifestSchema = z.object({ policyVersion: z.literal(POLICY_VERSION), products: z.array(entrySchema).min(1).max(12), manifestSha256: hashSchema }).strict();

function completeProfile(previous: unknown, scenario: keyof typeof scenarios): Record<string, unknown> {
  let base: Record<string, unknown>;
  if (previous === null) {
    // Unknown cargo cannot gain carrier acceptance; services and approval remain closed.
    base = { enabled: false, transportReviewed: false, reference: null, cargoKinds: ["unspecified"], approvedServiceIds: [] };
  } else {
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) throw new Error("Perfil anterior inválido.");
    base = previous as Record<string, unknown>;
    if (!shippingDraftSchema.safeParse(base).success || base.enabled !== false || base.transportReviewed !== false || base.reference !== null ||
      base.measurementBasis !== "unknown" || base.notifyOnlyPendingLogistics !== true || physicalKeys.some(key => base[key] !== null)) {
      throw new Error("Perfil protegido: exige notify pendente, sem revisão e quatro campos físicos literalmente nulos.");
    }
  }
  const draft = { ...base, ...scenarios[scenario], measurementBasis: "estimated" };
  // Keep the original object, including unknown keys, after schema validation.
  shippingDraftSchema.parse(draft);
  return draft;
}

/** Separate, explicit owner hypothesis path. It never rewrites documentary evidence or recipe policy. */
export async function completeEstimatedShippingDrafts(db: Pick<PrismaClient, "$transaction">, value: unknown, actorId: string, apply = false, expectedPlan?: string) {
  const manifest = manifestSchema.parse(value);
  if (!actorId.trim()) throw new Error("ADMIN ativo obrigatório.");
  if (new Set(manifest.products.map(row => row.productId)).size !== manifest.products.length) throw new Error("ID repetido no manifesto.");
  if (completionSha256(manifest.products) !== manifest.manifestSha256) throw new Error("SHA-256 do manifesto inválido.");
  for (const entry of manifest.products) {
    if (!normalizeLogisticsGtin(entry.expectedEan)) throw new Error("EAN inválido no manifesto.");
    if (completionSha256(entry.expectedShippingProfile) !== entry.expectedProfileSha256) throw new Error("SHA-256 do perfil literal inválido.");
    completeProfile(entry.expectedShippingProfile, entry.scenario);
  }
  if (apply && !hashSchema.safeParse(expectedPlan).success) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return db.$transaction(async tx => {
    await lockProductCatalog(tx);
    if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("ADMIN ativo obrigatório.");
    const products = await tx.product.findMany({
      where: { id: { in: manifest.products.map(row => row.productId) }, status: "ACTIVE", deletedAt: null }, orderBy: { id: "asc" },
      select: { id: true, name: true, ean: true, eanNormalized: true, status: true, deletedAt: true, updatedAt: true,
        shippingProfile: true, logisticsEvidence: true, catalogClassification: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true },
    });
    if (products.length !== manifest.products.length) throw new Error("Identidade ausente ou ambígua; lote cancelado.");
    const plans = manifest.products.map(entry => {
      const product = products.find(row => row.id === entry.productId);
      if (!product || product.status !== "ACTIVE" || product.deletedAt !== null || product.name !== entry.expectedName || product.ean !== entry.expectedEan ||
        normalizeLogisticsGtin(product.eanNormalized ?? product.ean) !== normalizeLogisticsGtin(entry.expectedEan) ||
        product.updatedAt.toISOString() !== entry.expectedUpdatedAt ||
        completionSha256(product.shippingProfile) !== entry.expectedProfileSha256) throw new Error("Identidade, revisão ou perfil mudou; lote cancelado.");
      const blocked = product.isPopularPharmacy || ["CONTROLLED", "ANTIMICROBIAL"].includes(product.prescriptionType) || (product.requiresPrescription && product.prescriptionType !== "ORDINARY");
      return { productId: product.id, action: blocked ? "PENDING_PHYSICAL_REVIEW" : "COMPLETE_ESTIMATED_DRAFT", scenario: entry.scenario,
        previousProfile: product.shippingProfile, revision: entry.expectedUpdatedAt, draft: blocked ? null : completeProfile(product.shippingProfile, entry.scenario) };
    });
    const snapshotSha256 = completionSha256(products);
    const planSha256 = completionSha256({ policyVersion: POLICY_VERSION, actorId, manifest, snapshotSha256, products: plans });
    if (apply && expectedPlan !== planSha256) throw new Error("Plano mudou desde o dry-run; nenhuma gravação aplicada.");
    for (const plan of plans) {
      if (!apply || !plan.draft) continue;
      const changed = await tx.product.updateMany({ where: { id: plan.productId, status: "ACTIVE", deletedAt: null, updatedAt: new Date(plan.revision) }, data: { shippingProfile: plan.draft as Prisma.InputJsonObject } });
      if (changed.count !== 1) throw new Error("Produto mudou durante a aplicação; lote revertido.");
      await tx.auditLog.create({ data: { userId: actorId, action: "PRODUCT_EMPTY_SHIPPING_DRAFT_COMPLETED", entity: "Product", entityId: plan.productId,
        metadata: { policyVersion: POLICY_VERSION, planSha256, manifestSha256: manifest.manifestSha256, snapshotSha256,
          manifestEntry: manifest.products.find(entry => entry.productId === plan.productId), previousProfile: plan.previousProfile,
          draft: plan.draft, basis: "OWNER_STIPULATED_PACKAGE_HYPOTHESIS", weightMarginPercentIncluded: 20, additionalWeightMarginApplied: 0,
          physicalMeasurementConfirmed: false, packingFitConfirmed: false, tare: null, innerDimensions: null,
          outerBoxSource: plan.draft.lengthCm === 24 ? "OWNER_DECLARED" : "PLANNED_NOT_CONFIRMED",
          authorizationBasis: "Completar somente quatro campos físicos nulos de perfil nulo ou Avise-me pendente, preservando sinalização e demais chaves. Valores finais estipulados com 20% já incluídos uma vez. Sem medição, encaixe, revisão ou aceitação de transporte; evidências conflitantes e política de receita preservadas." } as Prisma.InputJsonObject } });
    }
    return { applied: apply, policyVersion: POLICY_VERSION, planSha256, manifestSha256: manifest.manifestSha256, snapshotSha256, products: plans };
  }, { isolationLevel: "RepeatableRead", timeout: 180000 });
}

export function parseCompletionArgs(args: string[]) {
  const options = new Map<string, string | boolean>();
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (options.has(option)) throw new Error(`Opção repetida: ${option}.`);
    if (option === "--apply") { options.set(option, true); continue; }
    if (!["--manifest", "--actor-id", "--expect-plan"].includes(option) || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Use --manifest <JSON> --actor-id <ADMIN> [--apply --expect-plan <SHA-256>].");
    options.set(option, args[++i]);
  }
  if (!options.has("--manifest") || !options.has("--actor-id")) throw new Error("Informe --manifest e --actor-id. Dry-run é o padrão.");
  const apply = options.has("--apply"), expectedPlan = options.get("--expect-plan") as string | undefined;
  if (apply && !hashSchema.safeParse(expectedPlan).success) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return { manifestPath: options.get("--manifest") as string, actorId: options.get("--actor-id") as string, apply, expectedPlan };
}

async function main() {
  const args = parseCompletionArgs(process.argv.slice(2));
  if ((await stat(args.manifestPath)).size > 1_000_000) throw new Error("Manifesto excede 1 MB.");
  const value: unknown = JSON.parse(await readFile(args.manifestPath, "utf8"));
  const db = getPrisma();
  try { console.log(JSON.stringify(await completeEstimatedShippingDrafts(db, value, args.actorId, args.apply, args.expectedPlan))); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).replaceAll("\\", "/").endsWith("/complete-estimated-shipping-drafts.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha ao completar rascunhos estimados."); process.exitCode = 1; });
}
