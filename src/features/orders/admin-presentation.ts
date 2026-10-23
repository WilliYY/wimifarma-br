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

export function matchesAdminOrderQueue(order: OrderPresentation, group: "ALL" | AdminOrderGroup) {
  const current = getAdminOrderGroup(order);
  return group === "ALL" ? current === "NEW" || current === "ACTIVE" : current === group;
}

type StepStatus = "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED";
export function getAdminOrderSteps(order: OrderPresentation & { fulfillmentMethod: "PICKUP" | "DELIVERY" }) {
  const steps: Array<{ status: StepStatus; label: string }> = [
    { status: "CONFIRMED", label: "Confirmar" },
    { status: "PREPARING", label: "Separar" },
    { status: "READY", label: order.fulfillmentMethod === "PICKUP" ? "Pronto para retirada" : "Pronto para envio" },
    ...(order.fulfillmentMethod === "DELIVERY" ? [{ status: "OUT_FOR_DELIVERY" as const, label: "Saiu para entrega / envio" }] : []),
    { status: "COMPLETED", label: "Concluir" },
  ];
  const completedIndex = order.status === "OUT_FOR_DELIVERY" && order.fulfillmentMethod === "PICKUP"
    ? 2 : steps.findIndex(step => step.status === order.status);
  return steps.map((step, index) => ({ ...step, state: getAdminOrderGroup(order) === "CANCELED" ? "canceled" as const
    : index <= completedIndex ? "done" as const : index === completedIndex + 1 ? "current" as const : "pending" as const }));
}

export function groupOrderItemsBySource<T extends { inventorySource?: "PHARMACY" | "DISTRIBUTOR"; supplierCode?: string | null }>(items: T[]) {
  const groups = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of items) {
    const key = item.inventorySource === "DISTRIBUTOR" ? `supplier:${item.supplierCode ?? "unknown"}` : "pharmacy";
    if (!groups.has(key)) groups.set(key, { key, label: key === "pharmacy" ? "Farmácia" : supplierSourceLabel(item), items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) => Number(b.key === "pharmacy") - Number(a.key === "pharmacy") || a.label.localeCompare(b.label, "pt-BR"));
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
