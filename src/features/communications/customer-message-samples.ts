import type { CustomerMessageData, CustomerMessageEvent } from "./customer-messages";

export const customerMessageEvents: { value: CustomerMessageEvent; label: string }[] = [
  { value: "CART_ABANDONED", label: "Carrinho aguardando" },
  { value: "ORDER_RECEIVED", label: "Pedido recebido" },
  { value: "PIX_CREATED", label: "Pix criado" },
  { value: "PAYMENT_REMINDER", label: "Lembrete de pagamento" },
  { value: "PAYMENT_CONFIRMED", label: "Pagamento confirmado" },
  { value: "POST_SALE", label: "Pós-venda e avaliação" },
];

/** Synthetic data only, shared by the server renderer and the administrative preview. */
export function customerMessageSample(event: CustomerMessageEvent): CustomerMessageData {
  const completed = event === "POST_SALE";
  const paid = completed || event === "PAYMENT_CONFIRMED";
  return {
    event, environment: "TEST", firstName: "Cliente Exemplo",
    orderNumber: event === "CART_ABANDONED" ? undefined : "WBR-FICTICIO-001",
    items: [
      { name: "Sabonete fictício para demonstração", quantity: 2, unitPriceCents: 1500, totalCents: 3000 },
      { name: "Shampoo fictício para demonstração", quantity: 1, unitPriceCents: 2000, totalCents: 2000 },
    ],
    subtotalCents: 5000, deliveryFeeCents: 790,
    discounts: [{ label: "Cupom fictício", amountCents: 500 }, { label: "Cashback utilizado fictício", amountCents: 500 }],
    totalCents: 4790, fulfillmentMethod: "DELIVERY", orderStatus: completed ? "COMPLETED" : "PENDING",
    paymentStatus: paid ? "PAID" : "PENDING",
    cashback: completed ? { earnedCents: 80, balanceCents: 280 } : { pendingCents: 80 },
    paymentPage: event === "PIX_CREATED" ? { url: "https://loja.example/checkout/pagamento/fixture-order", orderId: "fixture-order", authorizedForRecipient: true } : undefined,
  };
}

export const customerMessageSampleOptions = { includeItems: true, recipientVerified: true, trustedOrigin: "https://loja.example" } as const;
