export type AdminOrderGroup = "NEW" | "ACTIVE" | "COMPLETED" | "CANCELED";

type OrderPresentation = {
  status: string;
  paymentStatus: string;
  onlinePayment?: { status: string } | null;
};

export function getAdminOrderGroup(order: OrderPresentation): AdminOrderGroup {
  if (order.status === "CANCELED" || ["CANCELED", "REFUNDED"].includes(order.paymentStatus)
    || ["FAILED", "CANCELED", "REFUNDED", "DISPUTED"].includes(order.onlinePayment?.status ?? "")) {
    return "CANCELED";
  }
  if (order.status === "COMPLETED") return "COMPLETED";
  return order.status === "PENDING" ? "NEW" : "ACTIVE";
}

export function matchesAdminOrderSearch(order: {
  number: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ productName: string; ean?: string | null; supplierCode?: string | null; inventorySource?: "PHARMACY" | "DISTRIBUTOR" }>;
}, search: string): boolean {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  return !term || [order.number, order.customerName, order.customerPhone, ...order.items.flatMap(item => [item.productName, item.ean ?? "", item.supplierCode ?? "", supplierSourceLabel(item)])]
    .some(value => value.toLocaleLowerCase("pt-BR").includes(term));
}

export function supplierSourceLabel(item: { inventorySource?: "PHARMACY" | "DISTRIBUTOR"; supplierCode?: string | null }) {
  if (item.inventorySource !== "DISTRIBUTOR") return "Loja física";
  const labels: Record<string, string> = { ANB: "ANB", DM: "DM Paraná", PROFARMA: "Profarma", GAM: "GAM / eGAM" };
  return labels[item.supplierCode ?? ""] ?? "Distribuidora não registrada";
}
