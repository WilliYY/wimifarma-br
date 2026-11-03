import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { lockProductCatalog } from "../src/features/products/mutations";
import { shippingSettingsSchema } from "../src/features/shipping/schema";
import { ESTIMATED_REVIEW_POLICY, estimatedReviewEntrySchema, estimatedDraftOnlyEntrySchema, estimatedReviewHashSchema, estimatedReviewSha256, reviewEstimatedShipping, createEstimatedDraftOnly } from "../src/features/shipping/estimated-review";

export const estimatedReviewManifestSchema = z.object({
  policyVersion: z.literal(ESTIMATED_REVIEW_POLICY),
  products: z.array(z.union([estimatedReviewEntrySchema.extend({ action: z.literal("REVIEW_ESTIMATED") }).strict(), estimatedDraftOnlyEntrySchema])).min(1).max(50),
  manifestSha256: estimatedReviewHashSchema,
}).strict();

/** Dry-run and apply rebuild the same reviewed plan under the existing catalog lock. */
export async function reviewEstimatedShippingBatch(db: Pick<PrismaClient, "$transaction">, value: unknown, actorId: string, apply = false, expectedPlan?: string) {
  const manifest = estimatedReviewManifestSchema.parse(value);
  if (!actorId.trim()) throw new Error("ADMIN ativo obrigatório.");
  if (new Set(manifest.products.map(row => row.productId)).size !== manifest.products.length) throw new Error("ID repetido no manifesto.");
  if (estimatedReviewSha256(manifest.products) !== manifest.manifestSha256) throw new Error("SHA-256 do manifesto inválido.");
  if (apply && !estimatedReviewHashSchema.safeParse(expectedPlan).success) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return db.$transaction(async tx => {
    await lockProductCatalog(tx);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
    if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("ADMIN ativo obrigatório.");
    // Read only public settings; credentials are never selected, decrypted or returned.
    await tx.$queryRaw`SELECT id FROM "ShippingIntegration" WHERE id = ${"melhor-envio"} FOR SHARE`;
    const integration = await tx.shippingIntegration.findUnique({ where: { id: "melhor-envio" }, select: { settings: true, revision: true } });
    const settings = integration ? shippingSettingsSchema.parse(integration.settings) : null;
    if (manifest.products.some(entry => entry.action === "REVIEW_ESTIMATED") && (!settings?.enabled || settings.environment !== "production" || !settings.serviceIds.length)) throw new Error("Transporte de produção não configurado.");
    const products = await tx.product.findMany({
      where: { id: { in: manifest.products.map(row => row.productId) }, status: "ACTIVE", deletedAt: null }, orderBy: { id: "asc" },
      select: { id: true, name: true, ean: true, eanNormalized: true, category: true, status: true, deletedAt: true, updatedAt: true,
        shippingProfile: true, logisticsEvidence: true, catalogClassification: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true },
    });
    if (products.length !== manifest.products.length) throw new Error("Identidade ausente ou ambígua; lote cancelado.");
    const plans = manifest.products.map(entry => {
      const product = products.find(row => row.id === entry.productId);
      if (!product) throw new Error("Identidade ausente; lote cancelado.");
      const { action, ...reviewInput } = entry;
      return { productId: product.id, action, revision: entry.expectedUpdatedAt, previousProfile: product.shippingProfile,
        profile: entry.action === "DRAFT_ONLY" ? createEstimatedDraftOnly(product, entry) : reviewEstimatedShipping(product, reviewInput, settings!.serviceIds) };
    });
    const snapshotSha256 = estimatedReviewSha256(products);
    const planSha256 = estimatedReviewSha256({ policyVersion: ESTIMATED_REVIEW_POLICY, actorId, manifest, integration, snapshotSha256, products: plans });
    if (apply && expectedPlan !== planSha256) throw new Error("Plano mudou desde o dry-run; nenhuma gravação aplicada.");
    for (const plan of plans) {
      if (!apply) continue;
      const result = await tx.product.updateMany({ where: { id: plan.productId, status: "ACTIVE", deletedAt: null,
        updatedAt: new Date(plan.revision), ...(plan.previousProfile === null
          ? { OR: [{ shippingProfile: { equals: Prisma.DbNull } }, { shippingProfile: { equals: Prisma.JsonNull } }] }
          : { shippingProfile: { equals: plan.previousProfile as Prisma.InputJsonValue } }) },
      data: { shippingProfile: plan.profile as Prisma.InputJsonObject } });
      if (result.count !== 1) throw new Error("Produto mudou durante a aplicação; lote revertido.");
      await tx.auditLog.create({ data: { userId: actorId, action: plan.action === "DRAFT_ONLY" ? "PRODUCT_ESTIMATED_SHIPPING_DRAFT_CREATED" : "PRODUCT_ESTIMATED_SHIPPING_REVIEWED", entity: "Product", entityId: plan.productId,
        metadata: { policyVersion: ESTIMATED_REVIEW_POLICY, planSha256, manifestSha256: manifest.manifestSha256, snapshotSha256,
          integrationRevision: integration?.revision ?? null, operation: plan.action, manifestEntry: manifest.products.find(row => row.productId === plan.productId),
          before: plan.previousProfile, after: plan.profile, measurementBasis: "estimated", physicalMeasurementConfirmed: false } as Prisma.InputJsonObject } });
    }
    return { applied: apply, policyVersion: ESTIMATED_REVIEW_POLICY, manifestSha256: manifest.manifestSha256, snapshotSha256, planSha256, products: plans };
  }, { isolationLevel: "RepeatableRead", timeout: 180000 });
}

export function parseEstimatedReviewArgs(args: string[]) {
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
  if (apply && !estimatedReviewHashSchema.safeParse(expectedPlan).success) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return { manifestPath: options.get("--manifest") as string, actorId: options.get("--actor-id") as string, apply, expectedPlan };
}

async function main() {
  const args = parseEstimatedReviewArgs(process.argv.slice(2));
  if ((await stat(args.manifestPath)).size > 1_000_000) throw new Error("Manifesto excede 1 MB.");
  const value: unknown = JSON.parse(await readFile(args.manifestPath, "utf8"));
  const db = getPrisma();
  try { console.log(JSON.stringify(await reviewEstimatedShippingBatch(db, value, args.actorId, args.apply, args.expectedPlan))); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).replaceAll("\\", "/").endsWith("/review-estimated-shipping.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha ao revisar transporte estimado."); process.exitCode = 1; });
}
