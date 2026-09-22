export type CustomerOrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";
export type OrderHistoryFilter = "all" | "active" | "completed" | "canceled";
export type OrderHistoryQuery = { page: number; filter: OrderHistoryFilter };
export const ORDER_HISTORY_PAGE_SIZE = 8;

export type CustomerOrder = {
  id: string;
  number: string;
  status: CustomerOrderStatus;
  fulfillmentMethod: "DELIVERY" | "PICKUP";
  paymentMethod: "PIX" | "CARD_ON_DELIVERY" | "CASH";
  paymentStatus: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  cashbackRedeemedCents: number;
  street: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{ id: string; productName: string; productImageUrl: string | null; quantity: number; unitPriceCents: number; totalCents: number }>;
};
export type CustomerOrderHistory = OrderHistoryQuery & {
  pageSize: number;
  total: number;
  counts: { all: number; active: number; completed: number; canceled: number };
  orders: CustomerOrder[];
  activeOrder: CustomerOrder | null;
};

export function parseOrderHistoryQuery(params: URLSearchParams): OrderHistoryQuery | null {
  const page = Number(params.get("page") ?? "1");
  const filter = params.get("filter") ?? "all";
  if (!Number.isInteger(page) || page < 1 || page > 1000) return null;
  if (!["all", "active", "completed", "canceled"].includes(filter)) return null;
  return { page, filter: filter as OrderHistoryFilter };
}

export function getOrderTracking(status: CustomerOrderStatus, method: CustomerOrder["fulfillmentMethod"]) {
  const pickup = method === "PICKUP";
  const steps = ["Recebido", "Confirmado", "Preparando", pickup ? "Para retirar" : "Em entrega", pickup ? "Retirado" : "Entregue"];
  const states = {
    PENDING: { label: "Aguardando confirmação", description: "Recebemos seu pedido. A equipe vai conferir os itens e combinar os próximos passos.", step: 0 },
    CONFIRMED: { label: "Pedido confirmado", description: "A farmácia confirmou seu pedido. Em breve, os itens serão separados.", step: 1 },
    PREPARING: { label: "Preparando seu pedido", description: "A equipe está separando os itens com cuidado.", step: 2 },
    READY: { label: pickup ? "Pronto para retirada" : "Pronto para entrega", description: pickup ? "Seu pedido está pronto. Confira o atendimento antes de ir à farmácia." : "Os itens estão separados e aguardam a saída para entrega.", step: pickup ? 3 : 2 },
    OUT_FOR_DELIVERY: { label: "Saiu para entrega", description: "A equipe registrou a saída do pedido para o endereço informado.", step: 3 },
    COMPLETED: { label: pickup ? "Pedido retirado" : "Pedido entregue", description: "Pedido concluído pela equipe. Obrigado por escolher a Wimifarma!", step: 4 },
    CANCELED: { label: "Pedido cancelado", description: "Este pedido foi cancelado. Se precisar, nossa equipe pode ajudar pelo WhatsApp.", step: -1 },
  };
  const current = states[status];
  return { label: current.label, description: current.description, currentStep: current.step, steps, canceled: status === "CANCELED" };
}

export const orderPaymentLabels = { PENDING: "Pagamento pendente", PAID: "Pagamento confirmado", CANCELED: "Pagamento cancelado", REFUNDED: "Pagamento reembolsado" } as const;
