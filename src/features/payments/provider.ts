import { PaymentError, providerOrderSchema } from "./schema";

export type MercadoPagoDiagnostic = {
  upstreamStatus: number | null;
  code: string | null;
  requestId: string | null;
  reason: "http_error" | "timeout" | "network_error" | "invalid_response";
};

export class MercadoPagoProviderError extends PaymentError {
  constructor(message: string, public readonly diagnostics: Readonly<MercadoPagoDiagnostic>) {
    super(message, 503);
    Object.freeze(diagnostics);
  }
}

// Only documented codes are retained; upstream messages and arbitrary values may contain private data.
const diagnosticCodes = new Set([
  "json_syntax_error", "required_properties", "unsupported_properties", "minimum_properties", "property_type", "property_value",
  "maximum_items", "minimum_items", "invalid_path_param", "required_search_params", "invalid_search_params", "invalid_properties",
  "empty_required_header", "invalid_idempotency_key_length", "order_builder_without_transactions", "invalid_order_mode_for_operation",
  "invalid_order_type", "invalid_transaction_id", "exceeded_number_of_transactions", "invalid_email_for_sandbox", "order_invalid_sponsor_id",
  "invalid_header_value", "invalid_total_amount", "refund_amount_exceeds", "401", "invalid_credentials", "failed", "forbidden",
  "PA_UNAUTHORIZED_RESULT_FROM_POLICIES", "order_not_found", "transaction_not_found", "cannot_refund_order", "cannot_capture_order",
  "cannot_cancel_order", "idempotency_key_already_used", "operation_not_supported", "order_already_refunded", "order_already_canceled",
  "order_refund_already_in_process", "resource_locked", "usage_quota_exceeded", "idempotency_validation_failed", "internal_error",
]);
const requestIdPattern = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;

function diagnosticCode(envelope: unknown): string | null {
  if (!envelope || typeof envelope !== "object") return null;
  const payload = envelope as { errors?: unknown; code?: unknown; error?: unknown };
  const candidates = [payload.code, payload.error];
  if (Array.isArray(payload.errors)) for (const error of payload.errors.slice(0, 5)) {
    if (error && typeof error === "object" && "code" in error) candidates.push(error.code);
  }
  return candidates.find((code): code is string => typeof code === "string" && diagnosticCodes.has(code)) ?? null;
}

async function readErrorEnvelope(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_000) { await reader.cancel(); return undefined; }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally { reader.releaseLock(); }
}

export async function mercadoPagoRequest(path: string, accessToken: string, body?: unknown, key?: string) {
  if (!/^\/(users\/me|v1\/payment_methods|v1\/orders(?:\/ORD[A-Z0-9]+)?)$/i.test(path)
    || (path.toLowerCase() === "/v1/payment_methods" && body !== undefined)) throw new PaymentError("Operação de pagamento inválida.", 400);
  let upstreamStatus: number | null = null; let requestId: string | null = null;
  try {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(key ? { "X-Idempotency-Key": key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    upstreamStatus = response.status;
    const identifier = response.headers.get("x-request-id");
    if (identifier && requestIdPattern.test(identifier)) requestId = identifier;
    if (!response.ok) {
      let envelope: unknown;
      try { envelope = response.status === 402 ? await response.json() : await readErrorEnvelope(response); }
      catch { /* Malformed error bodies do not erase the known HTTP status. */ }
      // Orders returns 402 with a created order when its payment is declined.
      // Only a validated canonical order may reach the normal binding/reconciliation checks.
      if (response.status === 402 && path === "/v1/orders" && body !== undefined) {
        const order = providerOrderSchema.safeParse(
          envelope && typeof envelope === "object" && "data" in envelope ? envelope.data : undefined,
        );
        if (order.success) return order.data;
      }
      throw new MercadoPagoProviderError(response.status === 401 || response.status === 403
        ? "A conexão com o Mercado Pago precisa ser conferida pela equipe."
        : "Não foi possível confirmar o pagamento. Consulte o status antes de tentar novamente.",
      { upstreamStatus, code: diagnosticCode(envelope), requestId, reason: "http_error" });
    }
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new MercadoPagoProviderError("A confirmação do Mercado Pago está demorando. Consulte o status; não refaça a compra agora.",
      { upstreamStatus, code: null, requestId, reason: timeout ? "timeout" : upstreamStatus === null ? "network_error" : "invalid_response" });
  }
}
