import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { classificationIsConsistent, readClassification } from "@/features/products/catalog-operations";
import { isCustomerOrderEmailConfigured, queueCustomerEmail } from "./customer-email-outbox";

export const orderEmailProductSelect = {
  id: true, catalogClassification: true, activeIngredients: true, cmedReference: true,
  requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true,
} as const satisfies Prisma.ProductSelect;

export function canShowProductInOrderEmail(product: Prisma.ProductGetPayload<{ select: typeof orderEmailProductSelect }>) {
  const classification = readClassification(product.catalogClassification);
  return ["HYGIENE", "PERFUMERY", "FOOD"].includes(classification.kind) &&
    classificationIsConsistent(classification, product) && !product.requiresPrescription && product.prescriptionType === "UNREVIEWED" &&
    !product.isPopularPharmacy && product.activeIngredients.length === 0 && product.cmedReference === null;
}

export async function queueOrderReceivedEmail(tx: Prisma.TransactionClient, order: { id: string; customerId: string | null }, products: readonly Prisma.ProductGetPayload<{ select: typeof orderEmailProductSelect }>[]) {
  if (!order.customerId || !isCustomerOrderEmailConfigured()) return;
  await queueCustomerEmail(tx, {
    eventKey: `order-received:v1:${order.id}`, kind: "ORDER_RECEIVED", orderId: order.id,
    discloseProductIds: products.filter(canShowProductInOrderEmail).map(product => product.id),
  });
}

export async function queueOrderStatusEmail(tx: Prisma.TransactionClient, order: { id: string; customerId: string | null; status: OrderStatus }) {
  if (!order.customerId || order.status === "PENDING") return;
  await queueCustomerEmail(tx, {
    eventKey: `order-status:v1:${order.id}:${order.status}`, kind: "ORDER_STATUS", orderId: order.id, status: order.status,
  });
}
