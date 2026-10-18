import type { Prisma } from "@/generated/prisma/client";
import { resolveSupplierOffer, type CommerceProduct } from "@/features/supplier-catalog/commerce";
import { classificationIsConsistent, type QuickProductUpdate } from "./catalog-operations";
import { lockProductCatalog, ProductMutationError } from "./mutations";

/** Product row is locked by caller, also serializing checkout creation. */
export async function validateSupplierMarkupChange(tx: Prisma.TransactionClient, current: CommerceProduct & { id: string }, requested?: number) {
  if (requested === undefined || requested === (current.supplierMarkupBps ?? 6000)) return;
  if (await tx.orderItem.findFirst({ where: { productId: current.id, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } }, select: { id: true } })) {
    throw new ProductMutationError("Conclua ou cancele os pedidos em aberto deste produto antes de alterar o acréscimo.", 409);
  }
  if (current.inventorySource === "DISTRIBUTOR" && resolveSupplierOffer(current) && !resolveSupplierOffer({ ...current, supplierMarkupBps: requested })) {
    throw new ProductMutationError("Este acréscimo ultrapassa o teto de venda conferido. Reduza o percentual.");
  }
}

export async function updateCatalogOperations(tx: Prisma.TransactionClient, id: string, input: QuickProductUpdate, actorId: string) {
  await lockProductCatalog(tx);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR SHARE`;
  const actor = await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } });
  if (!actor) throw new ProductMutationError("Acesso administrativo alterado.", 403);
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
  const current = await tx.product.findUnique({ where: { id, deletedAt: null }, include: { supplierOffers: true } });
  if (!current) throw new ProductMutationError("Produto não encontrado.", 404);
  if (current.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new ProductMutationError("O produto mudou. Atualize a lista e revise o ajuste.", 409);
  if (input.catalogClassification && !classificationIsConsistent(input.catalogClassification, current)) {
    throw new ProductMutationError("Classificação incompatível com o cadastro de receita. MIP/OTC não pode remover uma exigência de receita.");
  }
  const distributor = current.inventorySource === "DISTRIBUTOR";
  if (distributor && (input.price !== undefined || input.promotionalPrice !== undefined)) throw new ProductMutationError("No distribuidor, ajuste o acréscimo sobre o custo; o preço é calculado automaticamente.");
  if (!distributor && input.supplierMarkupBps !== undefined) throw new ProductMutationError("O acréscimo de distribuidor não altera preços do estoque da farmácia.");
  const price = input.price ?? Number(current.price);
  const promo = input.promotionalPrice === undefined ? current.promotionalPrice === null ? null : Number(current.promotionalPrice) : input.promotionalPrice;
  if (promo !== null && promo > price) throw new ProductMutationError("O preço promocional não pode superar o preço normal.");
  await validateSupplierMarkupChange(tx, current, input.supplierMarkupBps);
  const saved = await tx.product.update({ where: { id }, data: {
    catalogClassification: input.catalogClassification,
    supplierMarkupBps: input.supplierMarkupBps,
    price: input.price?.toFixed(2),
    promotionalPrice: input.promotionalPrice === undefined ? undefined : input.promotionalPrice?.toFixed(2) ?? null,
  } });
  await tx.auditLog.create({ data: { action: "PRODUCT_OPERATIONS_UPDATED", entity: "Product", entityId: id, userId: actor.id, metadata: {
    before: { classification: current.catalogClassification, supplierMarkupBps: current.supplierMarkupBps, price: current.price.toString(), promotionalPrice: current.promotionalPrice?.toString() ?? null },
    after: { classification: saved.catalogClassification, supplierMarkupBps: saved.supplierMarkupBps, price: saved.price.toString(), promotionalPrice: saved.promotionalPrice?.toString() ?? null },
  } } });
  return { id: saved.id, updatedAt: saved.updatedAt.toISOString() };
}
