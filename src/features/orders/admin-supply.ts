import { isValidGtin } from "@/features/products/identity";
import { getAdminOrderGroup, supplierSourceLabel } from "./admin-presentation";

export { supplierSourceLabel } from "./admin-presentation";

type EanSource = "offer" | "product" | null;
type SupplyItem = {
  id: string; productName: string; quantity: number; shortageQuantity?: number;
  inventorySource?: "PHARMACY" | "DISTRIBUTOR"; supplierCode?: string | null;
  ean?: string | null; eanSource?: EanSource;
};
type SupplyOrder = {
  id: string; number: string; status: string; paymentStatus: string;
  onlinePayment?: { status: string; environment: string } | null;
  items: SupplyItem[];
};
export type OrderSupplyGroup = {
  key: string; label: string; supplierCode: string | null;
  items: Array<{
    key: string; name: string; ean: string | null; eanSource: EanSource;
    quantity: number; paidQuantity: number;
    orders: Array<{ number: string; quantity: number; needsReview: boolean; paid: boolean }>;
  }>;
};

function validEan(value: string | null | undefined) {
  const ean = value?.trim();
  return ean && isValidGtin(ean) ? ean : null;
}

/** A linked offer or current product identifies the source, not a historical EAN snapshot. */
export function resolveOrderItemEan(item: {
  supplierCode?: string | null; product?: { ean: string | null } | null;
  supplierOffer?: { supplier: string; eanNormalized: string } | null;
}): { ean: string | null; eanSource: EanSource } {
  const productEan = validEan(item.product?.ean);
  const offerEan = item.supplierOffer?.supplier === item.supplierCode ? validEan(item.supplierOffer?.eanNormalized) : null;
  if (offerEan) return { ean: productEan?.padStart(14, "0") === offerEan.padStart(14, "0") ? productEan : offerEan, eanSource: "offer" };
  return { ean: productEan, eanSource: productEan ? "product" : null };
}

/** Conference only: quantities are internal demand, never a supplier purchase or stock guarantee. */
export function getOrderSupplyGroups(orders: SupplyOrder[]): OrderSupplyGroup[] {
  const groups = new Map<string, OrderSupplyGroup>();
  for (const order of orders) {
    if (["CANCELED", "COMPLETED"].includes(getAdminOrderGroup(order)) || order.onlinePayment?.environment === "test") continue;
    const paid = order.paymentStatus === "PAID" && (!order.onlinePayment || order.onlinePayment.status === "PAID");
    const needsReview = ["UNKNOWN", "SUBMITTING", "REVIEW", "PARTIALLY_REFUNDED"].includes(order.onlinePayment?.status ?? "");
    for (const item of order.items) {
      const quantity = Math.max(0, item.quantity - (item.shortageQuantity ?? 0));
      if (!quantity) continue;
      const supplierCode = item.inventorySource === "DISTRIBUTOR" ? item.supplierCode ?? null : null;
      const key = item.inventorySource === "DISTRIBUTOR" ? `supplier:${supplierCode ?? "unknown"}` : "pharmacy";
      if (!groups.has(key)) groups.set(key, { key, supplierCode, label: supplierSourceLabel(item), items: [] });
      const group = groups.get(key)!;
      const ean = validEan(item.ean);
      const itemKey = ean ? `${ean.padStart(14, "0")}:${item.productName}` : `${order.id}:${item.id}`;
      let row = group.items.find(current => current.key === itemKey);
      if (!row) {
        row = { key: itemKey, name: item.productName, ean, eanSource: item.eanSource ?? null, quantity: 0, paidQuantity: 0, orders: [] };
        group.items.push(row);
      }
      row.quantity += quantity;
      row.paidQuantity += paid ? quantity : 0;
      row.orders.push({ number: order.number, quantity, needsReview, paid });
    }
  }
  return [...groups.values()].sort((a, b) => Number(a.key === "pharmacy") - Number(b.key === "pharmacy") || a.label.localeCompare(b.label, "pt-BR"));
}
