import type { FulfillmentMethod, OrderPaymentStatus, OrderStatus } from "@/generated/prisma/enums";

export type CustomerMessageEvent = "CART_ABANDONED" | "ORDER_RECEIVED" | "PIX_CREATED" | "PAYMENT_REMINDER" | "PAYMENT_CONFIRMED" | "POST_SALE";
export type CustomerMessageData = {
  event: CustomerMessageEvent;
  firstName: string;
  orderNumber?: string;
  items: { name: string; quantity: number; unitPriceCents: number; totalCents: number }[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discounts: { label: string; amountCents: number }[];
  totalCents: number;
  fulfillmentMethod: FulfillmentMethod;
  orderStatus: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  cashback?: { pendingCents?: number; earnedCents?: number; balanceCents?: number };
  paymentExpired?: boolean;
  cartConverted?: boolean;
  paymentPage?: { url: string; orderId: string; authorizedForRecipient: boolean };
  environment?: "PRODUCTION" | "TEST";
};
export type CustomerMessageOptions = {
  /** Only set after resolving the authorized customer's verified channel. */
  recipientVerified?: boolean;
  includeItems?: boolean;
  /** Canonical application origin from trusted server configuration. */
  trustedOrigin?: string;
};
export type CustomerMessage = {
  event: CustomerMessageEvent;
  subject: string;
  lines: string[];
  whatsappText: string;
  email: { subject: string; text: string; html: string };
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const safeText = (value: string) => value.replace(/[\r\n\t*_~`\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const titles: Record<CustomerMessageEvent, string> = {
  CART_ABANDONED: "Seu carrinho aguarda você",
  ORDER_RECEIVED: "Pedido recebido",
  PIX_CREATED: "Pix criado, aguardando pagamento",
  PAYMENT_REMINDER: "Seu pagamento continua pendente",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  POST_SALE: "Como foi sua experiência?",
};
const orderLabels: Record<OrderStatus, string> = {
  PENDING: "Recebido", CONFIRMED: "Confirmado pela equipe", PREPARING: "Em preparação",
  READY: "Pronto", OUT_FOR_DELIVERY: "Saiu para entrega", COMPLETED: "Concluído", CANCELED: "Cancelado",
};
const paymentLabels: Record<OrderPaymentStatus, string> = {
  PENDING: "Pagamento pendente", PAID: "Pago", CANCELED: "Pagamento cancelado", REFUNDED: "Pagamento reembolsado",
};

function validateMoney(data: CustomerMessageData) {
  const cents = [data.subtotalCents, data.deliveryFeeCents, data.totalCents, ...data.discounts.map(discount => discount.amountCents)];
  let subtotal = 0;
  for (const item of data.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("quantidade inválida.");
    cents.push(item.unitPriceCents, item.totalCents);
    if (item.totalCents !== item.unitPriceCents * item.quantity) throw new Error("Valores dos itens inconsistentes.");
    subtotal += item.totalCents;
  }
  const cashback = data.cashback;
  if (cashback?.pendingCents !== undefined) cents.push(cashback.pendingCents);
  if (cashback?.earnedCents !== undefined) cents.push(cashback.earnedCents);
  if (cents.some(value => !Number.isSafeInteger(value) || value < 0) || !Number.isSafeInteger(subtotal)) throw new Error("Valores devem ser centavos inteiros não negativos.");
  if (cashback?.balanceCents !== undefined && !Number.isSafeInteger(cashback.balanceCents)) throw new Error("Valores do saldo inválidos.");
  const discount = data.discounts.reduce((sum, value) => sum + value.amountCents, 0);
  const gross = data.subtotalCents + data.deliveryFeeCents;
  if (!Number.isSafeInteger(discount) || !Number.isSafeInteger(gross) || subtotal !== data.subtotalCents || gross - discount !== data.totalCents) throw new Error("Valores do resumo inconsistentes.");
}

function authorizedPaymentPage(data: CustomerMessageData, options: CustomerMessageOptions) {
  if (!options.recipientVerified || !options.trustedOrigin || !data.paymentPage?.authorizedForRecipient) return null;
  try {
    const url = new URL(data.paymentPage.url);
    const origin = new URL(options.trustedOrigin);
    if (url.protocol !== "https:" || url.origin !== origin.origin || url.username || url.password || url.search || url.hash
      || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.paymentPage.orderId)
      || url.pathname !== `/checkout/pagamento/${data.paymentPage.orderId}`) return null;
    return url.href;
  } catch { return null; }
}

/** Pure rendering only: callers remain responsible for consent, ownership and delivery. */
export function buildCustomerMessage(data: CustomerMessageData, options: CustomerMessageOptions = {}): CustomerMessage | null {
  validateMoney(data);
  if (options.includeItems && !options.recipientVerified) throw new Error("Detalhes exigem destinatário verificado e autorizado.");
  const settled = data.orderStatus === "COMPLETED" && data.paymentStatus === "PAID";
  const canceled = data.orderStatus === "CANCELED" || data.paymentStatus === "CANCELED" || data.paymentStatus === "REFUNDED";
  if (canceled) return null;
  if (data.event === "CART_ABANDONED" && (!data.items.length || data.cartConverted || data.paymentStatus !== "PENDING" || data.orderNumber)) return null;
  if (data.event !== "CART_ABANDONED" && (!data.orderNumber?.trim() || !data.items.length)) return null;
  if (data.event === "PAYMENT_CONFIRMED" && data.paymentStatus !== "PAID") return null;
  if (data.event === "POST_SALE" && !settled) return null;
  if ((data.event === "PIX_CREATED" || data.event === "PAYMENT_REMINDER") && (data.paymentStatus !== "PENDING" || data.paymentExpired || data.orderStatus === "COMPLETED")) return null;
  const paymentPage = data.event === "PIX_CREATED" ? authorizedPaymentPage(data, options) : null;
  if (data.event === "PIX_CREATED" && !paymentPage) return null;

  const title = titles[data.event];
  const subject = `${data.environment === "TEST" ? "[TESTE] " : ""}Wimifarma · ${title}`;
  const lines: string[] = [];
  if (data.environment === "TEST") lines.push("[TESTE — sem compra real]");
  lines.push(`Olá, ${safeText(data.firstName) || "cliente"}! Sou a Miauby, da Wimifarma.`, title);
  if (data.orderNumber) lines.push(`Pedido: ${safeText(data.orderNumber)}`);
  if (options.includeItems) {
    lines.push("Itens:", ...data.items.map(item => `${item.quantity} × ${safeText(item.name)} · unidade ${money(item.unitPriceCents)} · total ${money(item.totalCents)}`));
  } else {
    lines.push(`Quantidade de unidades: ${data.items.reduce((sum, item) => sum + item.quantity, 0)}`);
  }
  lines.push(`Subtotal: ${money(data.subtotalCents)}`, `Frete: ${money(data.deliveryFeeCents)}`);
  for (const discount of data.discounts) lines.push(`Desconto ${safeText(discount.label)}: −${money(discount.amountCents)}`);
  lines.push(`Total: ${money(data.totalCents)}`);
  lines.push(data.fulfillmentMethod === "PICKUP" ? "Retirada na farmácia" : "Entrega solicitada");
  if (data.event !== "CART_ABANDONED") lines.push(`Status do pedido: ${orderLabels[data.orderStatus]}`, `Status do pagamento: ${paymentLabels[data.paymentStatus]}`);
  if (data.cashback?.earnedCents !== undefined && settled) lines.push(`Cashback creditado: ${money(data.cashback.earnedCents)}`);
  else if (data.cashback?.pendingCents !== undefined) lines.push(`Cashback previsto: ${money(data.cashback.pendingCents)}. Crédito somente após pedido concluído e pago, conforme as regras.`);
  if (data.cashback?.balanceCents !== undefined) lines.push(`Saldo disponível: ${money(data.cashback.balanceCents)}`);
  if (data.event === "CART_ABANDONED") lines.push("Se quiser continuar, abra seu carrinho no site. Preços e estoque serão conferidos novamente.");
  if (data.event === "ORDER_RECEIVED" && data.paymentStatus === "PENDING") lines.push("Recebemos seu pedido. Isso ainda não confirma o pagamento.");
  if (data.event === "PIX_CREATED") lines.push(`Confira o QR Code na página segura do seu pedido: ${paymentPage}`);
  if (data.event === "PAYMENT_REMINDER") lines.push("Confira seu pedido na conta antes de pagar. Se houver dúvida, fale com nossa equipe.");
  if (data.event === "PAYMENT_CONFIRMED") lines.push("O pagamento consta confirmado. A equipe acompanha a preparação e o atendimento.");
  if (data.event === "POST_SALE") lines.push("Conte sua opinião sincera na área de avaliações da sua conta. Todas as notas são bem-vindas. A primeira avaliação de produtos elegíveis pode gerar 1% extra, independentemente da nota, conforme as regras. O bônus depende da validação da avaliação; esta mensagem não concede crédito.");
  lines.push("Obrigada por escolher a Wimifarma! 💙");
  const text = lines.join("\n");
  return { event: data.event, subject, lines, whatsappText: text, email: { subject, text, html: `<div lang="pt-BR">${lines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}</div>` } };
}
