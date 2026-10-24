import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { readClassification } from "@/features/products/catalog-operations";
import { updateCatalogBulk } from "@/features/products/catalog-bulk-service";
import { lockProductCatalog, ProductMutationError } from "@/features/products/mutations";
import { cashbackProductIsEligible } from "./rules";

export const medicineCashbackPlanSchema = z.object({
  rule: z.literal("generic-similar-1pct-v1"),
  createdAt: z.iso.datetime(),
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
  items: z.array(z.object({
    id: z.string().min(1).max(80), expectedUpdatedAt: z.iso.datetime(),
    eanNormalized: z.string().nullable(), cashbackEnabled: z.boolean(), cashbackRateBps: z.number().int(),
  }).strict()).max(5000).refine(items => new Set(items.map(item => item.id)).size === items.length, "Produtos duplicados."),
}).strict();
export type MedicineCashbackPlan = z.infer<typeof medicineCashbackPlanSchema>;

const activationSelect = { id: true, eanNormalized: true, updatedAt: true, cashbackEnabled: true, cashbackRateBps: true,
  catalogClassification: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true } as const;

function isTarget(product: Parameters<typeof cashbackProductIsEligible>[0]) {
  const classification = readClassification(product.catalogClassification);
  return cashbackProductIsEligible(product) && classification.kind === "MEDICINE" &&
    (classification.medicineClass === "GENERIC" || classification.medicineClass === "SIMILAR");
}

/** Read-only plan. Never treats an expired supplier quote as a stockout. */
export async function planMedicineCashback(tx: Prisma.TransactionClient, sourceCommit: string, now = new Date()) {
  const products = await tx.product.findMany({ where: { deletedAt: null, status: "ACTIVE" }, select: activationSelect, orderBy: { id: "asc" } });
  return medicineCashbackPlanSchema.parse({ rule: "generic-similar-1pct-v1", createdAt: now.toISOString(), sourceCommit,
    items: products.filter(product => isTarget(product) && (!product.cashbackEnabled || product.cashbackRateBps !== 100)).map(product => ({
      id: product.id, eanNormalized: product.eanNormalized, expectedUpdatedAt: product.updatedAt.toISOString(),
      cashbackEnabled: product.cashbackEnabled, cashbackRateBps: product.cashbackRateBps,
    })),
  });
}

/** Caller supplies one transaction for the entire reviewed plan. No partial batches. */
export async function applyMedicineCashback(tx: Prisma.TransactionClient, value: unknown, actorId: string, sourceCommit: string, now = new Date()) {
  z.string().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/).parse(actorId);
  const plan = medicineCashbackPlanSchema.parse(value);
  const age = now.getTime() - Date.parse(plan.createdAt);
  if (plan.sourceCommit !== sourceCommit || age < 0 || age > 15 * 60_000) throw new ProductMutationError("Plano expirado ou de outra versão. Gere uma nova revisão.", 409);
  await lockProductCatalog(tx);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR SHARE`;
  if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new ProductMutationError("ADMIN ativo obrigatório.", 403);
  const items = [...plan.items].sort((a, b) => a.id.localeCompare(b.id, "en"));
  for (const item of items) {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${item.id} FOR UPDATE`;
    const current = await tx.product.findUnique({ where: { id: item.id, deletedAt: null, status: "ACTIVE" }, select: activationSelect });
    if (!current || !isTarget(current) || current.updatedAt.toISOString() !== item.expectedUpdatedAt ||
      current.eanNormalized !== item.eanNormalized || current.cashbackEnabled !== item.cashbackEnabled || current.cashbackRateBps !== item.cashbackRateBps) {
      throw new ProductMutationError("Produto alterado. Nenhuma configuração do lote foi aplicada.", 409);
    }
  }
  const result = [];
  for (let offset = 0; offset < items.length; offset += 50) {
    result.push(...await updateCatalogBulk(tx, { items: items.slice(offset, offset + 50).map(({ id, expectedUpdatedAt }) => ({ id, expectedUpdatedAt })),
      changes: { cashbackEnabled: true, cashbackRateBps: 100 } }, actorId));
  }
  // Existing order snapshots, accounts and financial transactions are untouched.
  return result;
}
