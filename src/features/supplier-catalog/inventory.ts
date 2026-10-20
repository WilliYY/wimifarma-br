import type { Prisma } from "@/generated/prisma/client";
import { PaymentError } from "@/features/payments/schema";
import { resolveSupplierOffer } from "./commerce";

type Item = { id: string; productId: string | null; supplierOfferId?: string | null; supplierDemandAllowed?: boolean; quantity: number; unitPriceCents: number };
type PricingProduct = { ean?: string | null; eanNormalized?: string | null; requiresPrescription?: boolean; supplierMarkupBps?: number; catalogClassification?: unknown };

/** Physical rows first by product, then distributor rows by offer: identical global lock order. */
export function comparePaymentInventoryItems(a: Item & { inventorySource?: string }, b: Item & { inventorySource?: string }) {
  const aExternal = a.inventorySource === "DISTRIBUTOR";
  const bExternal = b.inventorySource === "DISTRIBUTOR";
  if (aExternal !== bExternal) return aExternal ? 1 : -1;
  return (aExternal ? a.supplierOfferId ?? "" : a.productId ?? "").localeCompare(bExternal ? b.supplierOfferId ?? "" : b.productId ?? "");
}

async function lockOffer(tx: Prisma.TransactionClient, offerId: string) {
  await tx.$queryRaw`SELECT id FROM "SupplierCatalogOffer" WHERE id = ${offerId} FOR UPDATE`;
  return tx.supplierCatalogOffer.findUnique({ where: { id: offerId } });
}

/** A reservation is our order allocation, never a supplier's inventory reservation. */
export async function reserveSupplierInventory(tx: Prisma.TransactionClient, item: Item, product?: PricingProduct) {
  if (!item.supplierOfferId) throw new PaymentError("A oferta do distribuidor precisa ser conferida.", 409);
  const offer = await lockOffer(tx, item.supplierOfferId);
  const previous = await tx.supplierInventoryReservation.findUnique({ where: { orderItemId: item.id } });
  if (previous) {
    if (previous.status !== "ACTIVE" || previous.offerId !== item.supplierOfferId || previous.quantity !== item.quantity) throw new PaymentError("A reserva deste item mudou.", 409);
    return;
  }
  const selected = offer && offer.productId === item.productId ? resolveSupplierOffer({ eanNormalized: offer.eanNormalized, ...product, supplierDemandAllowed: item.supplierDemandAllowed === true, supplierOffers: [offer] }, item.quantity) : null;
  if (!selected || selected.unitPriceCents !== item.unitPriceCents) throw new PaymentError("A oferta do distribuidor mudou. Revise o carrinho.", 409);
  await tx.supplierCatalogOffer.update({ where: { id: offer!.id }, data: { reservedQuantity: { increment: item.quantity } } });
  await tx.supplierInventoryReservation.create({ data: { orderItemId: item.id, offerId: offer!.id, quantity: item.quantity, unitCostCents: offer!.unitCostCents, status: "ACTIVE" } });
}

export async function validateSupplierPayment(tx: Prisma.TransactionClient, item: Item, product?: PricingProduct) {
  if (!item.supplierOfferId) throw new PaymentError("Oferta do distribuidor ausente.", 409);
  const offer = await lockOffer(tx, item.supplierOfferId);
  const reservation = await tx.supplierInventoryReservation.findUnique({ where: { orderItemId: item.id } });
  if (!offer || offer.productId !== item.productId || !reservation || reservation.status !== "ACTIVE" || reservation.offerId !== offer.id || reservation.quantity !== item.quantity) throw new PaymentError("Reserva do distribuidor indisponível. Revise o pedido.", 409);
  // Add only this order's allocation back for validation; other orders remain counted.
  const selected = resolveSupplierOffer({ eanNormalized: offer.eanNormalized, ...product, supplierDemandAllowed: item.supplierDemandAllowed === true, supplierOffers: [{ ...offer, reservedQuantity: offer.reservedQuantity - reservation.quantity }] }, item.quantity);
  if (!selected || selected.unitPriceCents !== item.unitPriceCents || reservation.unitCostCents !== offer.unitCostCents) throw new PaymentError("Preço ou disponibilidade do distribuidor mudou. Revise o pedido antes de pagar.", 409);
  const offers = await tx.supplierCatalogOffer.findMany({ where: { productId: item.productId! } });
  const best = resolveSupplierOffer({ ...(product ?? { eanNormalized: offer.eanNormalized }), supplierDemandAllowed: item.supplierDemandAllowed === true, supplierOffers: offers.map(row => row.id === offer.id ? { ...row, reservedQuantity: row.reservedQuantity - reservation.quantity } : row) }, item.quantity);
  if (!best || best.unitPriceCents !== item.unitPriceCents) throw new PaymentError("Há uma nova condição para este produto. Cancele o pedido e atualize o carrinho antes de pagar.", 409);
}

export async function settleSupplierOrder(tx: Prisma.TransactionClient, orderId: string, status: string, paymentStatus: string) {
  const canceled = status === "CANCELED" || ["CANCELED", "REFUNDED"].includes(paymentStatus);
  if (!canceled && paymentStatus !== "PAID") return;
  const rows = await tx.supplierInventoryReservation.findMany({ where: { orderItem: { orderId } }, orderBy: [{ offerId: "asc" }, { orderItemId: "asc" }] });
  for (const row of rows) {
    const offer = await lockOffer(tx, row.offerId);
    const current = await tx.supplierInventoryReservation.findUnique({ where: { orderItemId: row.orderItemId } });
    if (!offer || current?.status !== "ACTIVE") continue;
    if (offer.reservedQuantity < current.quantity) throw new PaymentError("A reserva do distribuidor precisa de revisão.", 409);
    await tx.supplierCatalogOffer.update({ where: { id: row.offerId }, data: { reservedQuantity: { decrement: current.quantity }, ...(!canceled ? { committedQuantity: { increment: current.quantity } } : {}) } });
    await tx.supplierInventoryReservation.update({ where: { orderItemId: row.orderItemId }, data: { status: canceled ? "RELEASED" : "CONSUMED" } });
  }
}
