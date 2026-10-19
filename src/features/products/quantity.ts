/** Finite protocol guard, not supplier inventory or a commercial allocation. */
export const MAX_ORDER_ITEM_QUANTITY = 999;

export function orderQuantityLimit(product: { stock: number; inventorySource?: string; supplierDemandAllowed?: boolean }) {
  if (!Number.isSafeInteger(product.stock) || product.stock < 1) return 0;
  return product.inventorySource === "DISTRIBUTOR" && product.supplierDemandAllowed
    ? MAX_ORDER_ITEM_QUANTITY
    : Math.min(product.stock, MAX_ORDER_ITEM_QUANTITY);
}
