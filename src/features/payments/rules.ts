import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentError, type PaymentInput, type ProviderOrder } from "./schema";
export const PIX_EXPIRATION_MS = 2 * 60 * 60_000;

export function paymentBody<T extends PaymentInput>(input: T, amountCents: number, reference: string) {
  if (input.method === "hosted-card") throw new PaymentError("Este meio de pagamento utiliza a página segura Asaas.", 422);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw new PaymentError("O valor do pagamento deve ser maior que zero.");
  const amount = (amountCents / 100).toFixed(2);
  return { type: "online", processing_mode: "automatic", total_amount: amount, external_reference: reference,
    payer: { email: input.email, ...(input.method === "card" && input.identification ? { identification: input.identification } : {}) },
    transactions: { payments: [{ amount, ...(input.method === "pix" ? { expiration_time: "PT2H" } : {}),
      payment_method: input.method === "pix" ? { id: "pix", type: "bank_transfer" }
        : { id: input.paymentMethodId, type: input.paymentType, token: input.token, installments: input.installments },
    }] },
  };
}
export function providerState(order: ProviderOrder) {
  const payment = order.transactions.payments[0];
  if (order.status === "processed" && order.status_detail === "partially_refunded") return "PARTIALLY_REFUNDED";
  if (order.status === "processed" && payment.status === "processed" && payment.status_detail === "accredited") return "PAID";
  if (order.status === "refunded") return "REFUNDED";
  if (order.status === "charged_back") return "DISPUTED";
  if (order.status === "failed") return "FAILED";
  if (["canceled", "cancelled", "expired"].includes(order.status)) return "CANCELED";
  return "PENDING";
}
export function providerStatusDetail(order: ProviderOrder) {
  return order.transactions.payments[0].status_detail ?? order.status_detail ?? null;
}
export function assertPaymentBinding(remote: ProviderOrder, expected: { id: string; providerOrderId: string | null; amountCents: number; accountId: string }) {
  const cents = (value: string) => Math.round(Number(value) * 100);
  if (remote.external_reference !== expected.id || remote.user_id !== expected.accountId
    || (expected.providerOrderId && remote.id !== expected.providerOrderId)
    || cents(remote.total_amount) !== expected.amountCents || cents(remote.transactions.payments[0].amount) !== expected.amountCents) {
    throw new PaymentError("O pagamento recebido não corresponde ao pedido. A equipe precisa conferir.", 502);
  }
}
export function webhookSignatureFailure(request: Request, secret: string, now = Date.now()) {
  const id = new URL(request.url).searchParams.get("data.id");
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature") ?? "";
  const ts = signature.match(/(?:^|,)\s*ts=(\d+)(?:,|$)/)?.[1];
  const digest = signature.match(/(?:^|,)\s*v1=([a-f0-9]{64})(?:,|$)/i)?.[1];
  if (!id || !/^ORD[A-Z0-9]+$/i.test(id)) return "invalid_resource";
  if (!requestId || requestId.length > 200) return "invalid_request_id";
  if (!ts || !digest) return "invalid_signature_format";
  const millis = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
  if (!Number.isFinite(millis) || Math.abs(now - millis) > 10 * 60_000) return "expired_signature";
  // Preserve the signed resource exactly as the official Orders SDK does.
  const expected = createHmac("sha256", secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest();
  return timingSafeEqual(expected, Buffer.from(digest, "hex")) ? null : "signature_mismatch";
}
export function validWebhookSignature(request: Request, secret: string, now = Date.now()) {
  return webhookSignatureFailure(request, secret, now) === null;
}
export function paymentAccessToken(orderId: string, requestId: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET ausente");
  return createHmac("sha256", process.env.AUTH_SECRET).update(`payment:${orderId}:${requestId}`).digest("hex");
}
export function validPaymentAccess(value: string | undefined, orderId: string, requestId: string | null) {
  if (!requestId || !value || !/^[a-f0-9]{64}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(paymentAccessToken(orderId, requestId), "hex"));
}
