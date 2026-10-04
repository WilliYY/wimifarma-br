import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const commerceSettingsSchema = z.object({ action: z.literal("settings"), enabled: z.boolean(), cartAlerts: z.boolean(), orderAlerts: z.boolean(), paymentAlerts: z.boolean() }).strict();
export const cartRequestSchema = z.object({ items: z.array(z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(20) }).strict()).max(30) }).strict().refine(value => new Set(value.items.map(item => item.productId)).size === value.items.length);
export const bridgeResultSchema = z.object({ ok: z.boolean(), eventId: z.string(), status: z.enum(["accepted", "blocked", "uncertain"]), messageId: z.string().nullable(), accepted: z.boolean(), delivered: z.boolean().nullable(), uncertain: z.boolean(), duplicate: z.boolean(), retryable: z.boolean() });
export type BridgeResult = z.infer<typeof bridgeResultSchema>;
export type CommerceType = "cart" | "order" | "payment" | "test";
export type CommerceState = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "UNCERTAIN";
const signature = (value: string, secret: string) => createHmac("sha256", secret).update(value).digest("hex");
export function createCartIdentity(secret: string, now = Date.now()) {
  const value = `${randomUUID()}.${now}`;
  return `${value}.${signature(value, secret)}`;
}
export function readCartIdentity(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || !secret || !/^[\da-f-]{36}\.\d{13}\.[\da-f]{64}$/.test(token)) return null;
  const [id, timestamp, supplied] = token.split(".");
  const age = now - Number(timestamp);
  if (age < 0 || age > 86_400_000) return null;
  const expected = signature(`${id}.${timestamp}`, secret);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)) ? id : null;
}
export const cartEventKey = (id: string, now = Date.now()) => `cart:${id}:${Math.floor(now / 600_000)}`;
export const commerceMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const safeText = (text: string) => text.replace(/[\r\n\t*_~`\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
export function formatCommerceItems(items: { name: string; quantity: number; unitPriceCents?: number; totalCents?: number }[]) {
  return items.slice(0, 10).map(item => `${item.quantity} × ${safeText(item.name)}${item.unitPriceCents !== undefined && item.totalCents !== undefined ? ` · un. ${commerceMoney(item.unitPriceCents)} · total ${commerceMoney(item.totalCents)}` : ""}`).join("\n") + (items.length > 10 ? `\nMais ${items.length - 10} itens no painel.` : "");
}
export function formatCommerceOrder(type: "order" | "payment", order: { id: string; number: string; totalCents: number; fulfillmentMethod: string;
  subtotalCents?: number; deliveryFeeCents?: number; cashbackEarnedCents?: number; cashbackState?: string; status?: string; paymentStatus?: string;
  items: Parameters<typeof formatCommerceItems>[0] }, isTest = false) {
  const title = type === "payment" ? "Pagamento confirmado pelo gateway" : "Novo pedido recebido — não confirma pagamento";
  const summary: string[] = [];
  if (order.subtotalCents !== undefined && order.deliveryFeeCents !== undefined) {
    summary.push(`Subtotal: ${commerceMoney(order.subtotalCents)}`, `Frete: ${commerceMoney(order.deliveryFeeCents)}`);
    const discount = order.subtotalCents + order.deliveryFeeCents - order.totalCents;
    if (discount > 0) summary.push(`Descontos: −${commerceMoney(discount)}`);
  }
  if ((order.cashbackEarnedCents ?? 0) > 0) {
    if (order.cashbackState === "CREDITED" && order.status === "COMPLETED" && order.paymentStatus === "PAID") summary.push(`Cashback creditado: ${commerceMoney(order.cashbackEarnedCents!)}`);
    else if (order.cashbackState === "PENDING") summary.push(`Cashback previsto: ${commerceMoney(order.cashbackEarnedCents!)}. Crédito após conclusão e pagamento.`);
  }
  return `${isTest ? "[TESTE — sem compra real]\n" : ""}Miauby · Wimifarma\n${title}\nPedido ${safeText(order.number)}\n${formatCommerceItems(order.items)}\n${summary.length ? `${summary.join("\n")}\n` : ""}Total: ${commerceMoney(order.totalCents)}\n${order.fulfillmentMethod === "PICKUP" ? "Retirada na farmácia" : "Entrega solicitada"}\nConfira os detalhes no painel de pedidos.`;
}
export function classifyBridgeResult(result: BridgeResult, eventId: string): CommerceState {
  if (result.eventId !== eventId || result.uncertain || result.status === "uncertain") return "UNCERTAIN";
  if (result.ok && result.status === "accepted" && result.accepted && result.messageId) return "SENT";
  if (result.status === "blocked" && !result.accepted) return result.retryable ? "PENDING" : "FAILED";
  return "UNCERTAIN";
}
