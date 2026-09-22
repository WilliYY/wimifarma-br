import type { Prisma } from "@/generated/prisma/client";
import { lockProductCatalog, ProductMutationError } from "./mutations";
import { productPurgeDate } from "./trash-policy";

export async function moveProductToTrash(tx: Prisma.TransactionClient, id: string, expectedUpdatedAt: Date, userId: string, now = new Date()) {
  await lockProductCatalog(tx);
  const purgeAt = productPurgeDate(now);
  const result = await tx.product.updateMany({ where: { id, deletedAt: null, updatedAt: expectedUpdatedAt }, data: { deletedAt: now, purgeAt, status: "ARCHIVED", featuredPosition: null } });
  if (!result.count) throw new ProductMutationError("Produto alterado ou já excluído. Atualize o catálogo e tente novamente.", 409);
  await tx.offer.updateMany({ where: { productId: id }, data: { status: "ARCHIVED", highlight: false } });
  await tx.auditLog.create({ data: { action: "PRODUCT_TRASHED", entity: "Product", entityId: id, userId, metadata: { deletedAt: now.toISOString(), purgeAt: purgeAt.toISOString() } } });
  return { id, deletedAt: now.toISOString(), purgeAt: purgeAt.toISOString() };
}

export async function restoreTrashedProduct(tx: Prisma.TransactionClient, id: string, expectedUpdatedAt: Date, userId: string, now = new Date()) {
  await lockProductCatalog(tx);
  const result = await tx.product.updateMany({ where: { id, updatedAt: expectedUpdatedAt, deletedAt: { not: null }, purgeAt: { gt: now }, status: "ARCHIVED" }, data: { deletedAt: null, purgeAt: null, status: "DRAFT", featuredPosition: null } });
  if (!result.count) throw new ProductMutationError("O prazo expirou ou o produto foi alterado. Atualize a lixeira.", 409);
  await tx.auditLog.create({ data: { action: "PRODUCT_RESTORED", entity: "Product", entityId: id, userId, metadata: { status: "DRAFT" } } });
  return { id, status: "DRAFT" };
}

export async function purgeExpiredProducts(tx: Prisma.TransactionClient, now = new Date()) {
  await lockProductCatalog(tx);
  const where = { deletedAt: { not: null }, purgeAt: { lte: now }, status: "ARCHIVED" as const };
  const products = await tx.product.findMany({ where, select: { id: true }, orderBy: [{ purgeAt: "asc" }, { id: "asc" }], take: 100 });
  if (!products.length) return 0;
  const result = await tx.product.deleteMany({ where: { ...where, id: { in: products.map(product => product.id) } } });
  await tx.auditLog.createMany({ data: products.map(product => ({ action: "PRODUCT_PURGED", entity: "Product", entityId: product.id, metadata: { expiredAtOrBefore: now.toISOString() } })) });
  return result.count;
}
