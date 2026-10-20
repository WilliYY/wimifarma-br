import type { Prisma } from "@/generated/prisma/client";
import { validateSupplierMarkupChange } from "./catalog-operations-service";
import { bulkRequiresAdmin, type BulkProductUpdate } from "./catalog-bulk";
import { lockProductCatalog, ProductMutationError } from "./mutations";
import { validatePhotoPublication } from "./photo-publication-policy";

export async function updateCatalogBulk(tx: Prisma.TransactionClient, input: BulkProductUpdate, actorId: string) {
  await lockProductCatalog(tx);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR SHARE`;
  const actor = await tx.user.findFirst({ where: { id: actorId, role: { in: ["ADMIN", "MANAGER"] }, isActive: true }, select: { id: true, role: true } });
  if (!actor || (bulkRequiresAdmin(input.changes) && actor.role !== "ADMIN")) throw new ProductMutationError("Acesso administrativo alterado.", 403);
  const items = [...input.items].sort((a, b) => a.id.localeCompare(b.id, "en"));
  // Validate every item before writing; caller's transaction also rolls back audit failures.
  const validated = [];
  for (const item of items) {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${item.id} FOR UPDATE`;
    const current = await tx.product.findUnique({ where: { id: item.id, deletedAt: null }, include: { supplierOffers: true } });
    if (!current) throw new ProductMutationError("Um produto do lote não está mais disponível. Atualize a lista.", 404);
    if (current.updatedAt.toISOString() !== item.expectedUpdatedAt) throw new ProductMutationError("Um produto mudou. Atualize a lista e revise todo o lote.", 409);
    const changes = input.changes;
    if (changes.supplierMarkupBps !== undefined && current.inventorySource !== "DISTRIBUTOR") throw new ProductMutationError("Selecione somente produtos de distribuidoras para alterar o acréscimo.");
    if ((changes.cashbackEnabled || changes.wimicoinsEnabled) && (current.requiresPrescription || current.isPopularPharmacy)) throw new ProductMutationError("Benefícios não podem ser ativados em produtos com receita ou Farmácia Popular.");
    await validateSupplierMarkupChange(tx, current, changes.supplierMarkupBps);
    await validatePhotoPublication(tx, current, { ...current, status: changes.status ?? current.status });
    validated.push(current);
  }
  const result = [];
  for (const current of validated) {
    const data: Prisma.ProductUpdateInput = { ...input.changes };
    if (input.changes.status !== undefined && input.changes.status !== "ACTIVE") data.featuredPosition = null;
    const saved = await tx.product.update({ where: { id: current.id }, data, select: { id: true, updatedAt: true } });
    const before = Object.fromEntries(Object.keys(data).map(key => [key, current[key as keyof typeof current]])) as Prisma.InputJsonObject;
    await tx.auditLog.create({ data: { action: "PRODUCT_BULK_UPDATED", entity: "Product", entityId: current.id, userId: actor.id, metadata: { before, after: data as Prisma.InputJsonObject, count: items.length } } });
    result.push({ id: saved.id, updatedAt: saved.updatedAt.toISOString() });
  }
  return result;
}
