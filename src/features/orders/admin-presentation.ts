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
  items: Array<{ productName: string }>;
}, search: string): boolean {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  return !term || [order.number, order.customerName, order.customerPhone, ...order.items.map(item => item.productName)]
    .some(value => value.toLocaleLowerCase("pt-BR").includes(term));
}
