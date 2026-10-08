import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { readAsaasSandboxIntegration, ASAAS_SANDBOX_INTEGRATION_ID } from "./asaas-sandbox-integration";
import { assertAsaasPaymentBinding, retrieveAsaasPayment } from "./asaas-provider";
import { refreshAsaasSandboxPayment } from "./asaas-service";
import { PaymentError } from "./schema";

const supportedEvents = new Set(["PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_DELETED",
  "PAYMENT_RESTORED", "PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"]);
// Provider IDs can carry an ampersand plus a numeric suffix. Retain the opaque ID for deduplication.
const envelope = z.object({ id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+(?:&[0-9]+)?$/).refine(value => !/\s/.test(value)),
  event: z.string().min(1).max(80), payment: z.object({ id: z.string().regex(/^pay_[a-zA-Z0-9_-]{1,96}$/) }).optional(),
  checkout: z.object({ id: z.uuid() }).optional() });
const maxBodyBytes = 64 * 1024;
const leaseMilliseconds = 60_000;
const headers = { "Cache-Control": "no-store" };
function reply(status: number, error: string) { return Response.json({ error }, { status, headers }); }
function sameSecret(received: string | null, expected: string) {
  // Fixed-size decoded buffers avoid variable-size timing comparisons.
  if (!received || !/^[a-f0-9]{64}$/.test(received) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}
async function boundedBody(request: Request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maxBodyBytes) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally { reader.releaseLock(); }
}

/** Acknowledge only the durable receipt. No provider request or financial effect runs here. */
export async function receiveAsaasSandboxWebhook(request: Request): Promise<Response> {
  try {
    const integration = await readAsaasSandboxIntegration();
    const binding = new URL(request.url).searchParams.getAll("binding");
    const expected = integration ? new URL(integration.secrets.webhookUrl).searchParams.get("binding") : null;
    if (!integration || integration.environment !== "test" || !integration.accountId
      || !sameSecret(request.headers.get("asaas-access-token"), integration.secrets.webhookSecret)
      || binding.length !== 1 || !expected || binding[0] !== expected) return reply(401, "Webhook não autorizado.");
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return reply(415, "Envie JSON.");
    }
    const declared = request.headers.get("content-length");
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBodyBytes)) return reply(413, "Corpo excede o limite.");
    let body: unknown;
    try { body = await boundedBody(request); } catch { return reply(400, "Evento inválido."); }
    if (body === null) return reply(413, "Corpo ausente ou excede o limite.");
    const parsed = envelope.safeParse(body);
    if (!parsed.success || !supportedEvents.has(parsed.data.event)) return reply(400, "Evento inválido.");
    const event = parsed.data;
    const isCheckout = event.event.startsWith("CHECKOUT_");
    if (isCheckout ? !event.checkout : !event.payment) return reply(400, "Recurso do evento inválido.");
    const prisma = getPrisma();
    const identity = { provider: "asaas", environment: "test", accountId: integration.accountId, eventId: event.id };
    const identifiers = { eventType: event.event, providerPaymentId: isCheckout ? null : event.payment!.id,
      checkoutSessionId: isCheckout ? event.checkout!.id : null };
    try { await prisma.paymentWebhookEvent.create({ data: { ...identity, ...identifiers } }); }
    catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
      const stored = await prisma.paymentWebhookEvent.findUnique({ where: { provider_environment_accountId_eventId: identity } });
      // A conflicting duplicate cannot replace a pending event or change its resource.
      if (!stored || stored.eventType !== identifiers.eventType || stored.providerPaymentId !== identifiers.providerPaymentId
        || stored.checkoutSessionId !== identifiers.checkoutSessionId) return reply(409, "Evento divergente.");
    }
    return Response.json({ received: true }, { headers });
  } catch { return reply(503, "Não foi possível persistir o evento. Tente novamente."); }
}

/** Recoverable lease: crashed workers leave PENDING receipts eligible after one minute. */
export async function processAsaasWebhookInbox(maxEvents = 10) {
  const limit = Math.min(10, Math.max(1, Math.floor(maxEvents) || 10));
  const result = { processed: 0, pending: 0, review: 0 };
  const integration = await readAsaasSandboxIntegration();
  if (!integration || integration.environment !== "test" || integration.connection.environment !== "test") return result;
  const prisma = getPrisma();
  const cutoff = new Date(Date.now() - leaseMilliseconds);
  const eligible = { provider: "asaas", environment: "test", accountId: integration.accountId, status: "PENDING",
    OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: cutoff } }] };
  // Never-attempted receipts take priority; unresolved old resources cannot monopolize every batch.
  const events = await prisma.paymentWebhookEvent.findMany({ where: eligible,
    orderBy: [{ lastAttemptAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }], take: limit });
  for (const event of events) {
    const now = new Date();
    const claimed = await prisma.paymentWebhookEvent.updateMany({ where: { ...eligible, id: event.id, attempts: event.attempts },
      data: { lastAttemptAt: now, attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    let status = "PENDING";
    let bindingMismatch = false;
    try {
      const scope = { provider: "asaas", integrationId: ASAAS_SANDBOX_INTEGRATION_ID, environment: "test", accountId: integration.accountId };
      if (event.providerPaymentId) {
        const canonical = await retrieveAsaasPayment(integration.connection, event.providerPaymentId);
        const bindings = [{ providerOrderId: canonical.id },
          ...(canonical.pixQrCodeId ? [{ pixQrCodeId: canonical.pixQrCodeId }] : []),
          ...(canonical.checkoutSession ? [{ checkoutSessionId: canonical.checkoutSession }] : [])];
        const candidates = await prisma.onlinePayment.findMany({ where: { ...scope, OR: bindings }, take: 2 });
        if (candidates.length > 1) status = "REVIEW";
        else if (candidates.length === 1) {
          const local = candidates[0];
          if (local.method !== "pix" && local.method !== "card") throw new PaymentError("Instrumento persistido inválido.", 409);
          const resource = local.method === "pix" && local.pixQrCodeId ? { pixQrCodeId: local.pixQrCodeId }
            : local.method === "card" && local.checkoutSessionId ? { checkoutSessionId: local.checkoutSessionId } : null;
          if (!resource) throw new PaymentError("Recurso persistido ausente.", 409);
          assertAsaasPaymentBinding(canonical, { amountCents: local.amountCents, method: local.method, resource,
            externalReference: local.id, ...(local.providerOrderId ? { paymentId: local.providerOrderId } : {}) });
          const refreshed = await refreshAsaasSandboxPayment(local.orderId);
          status = ["NEW", "PENDING", "UNKNOWN", "SUBMITTING"].includes(refreshed.status) ? "PENDING" : "PROCESSED";
        }
      } else if (event.checkoutSessionId) {
        if (event.eventType !== "CHECKOUT_PAID") status = "REVIEW";
        else {
          const local = await prisma.onlinePayment.findFirst({ where: { ...scope, checkoutSessionId: event.checkoutSessionId } });
          if (local) {
            const refreshed = await refreshAsaasSandboxPayment(local.orderId);
            status = ["NEW", "PENDING", "UNKNOWN", "SUBMITTING"].includes(refreshed.status) ? "PENDING" : "PROCESSED";
          }
        }
      }
    } catch (error) {
      // Permanent binding failures need visible review; transport/DB failures remain recoverable.
      bindingMismatch = error instanceof PaymentError && [409, 422].includes(error.status);
      status = bindingMismatch ? "REVIEW" : "PENDING";
    }
    const finalization = { where: { id: event.id, status: "PENDING", attempts: event.attempts + 1,
      lastAttemptAt: now }, data: { status, ...(status === "PROCESSED" ? { processedAt: new Date() } : {}) } };
    // Commit review and its audit together, so audit failure leaves the receipt retryable.
    const finalized = bindingMismatch ? await prisma.$transaction(async tx => {
      const updated = await tx.paymentWebhookEvent.updateMany(finalization);
      if (updated.count) await tx.auditLog.create({ data: { action: "ASAAS_SANDBOX_WEBHOOK_REVIEW", entity: "PaymentWebhookEvent",
        entityId: event.id, metadata: { reason: "BINDING_MISMATCH", eventType: event.eventType } } });
      return updated;
    }) : await prisma.paymentWebhookEvent.updateMany(finalization);
    if (finalized.count) result[status === "PROCESSED" ? "processed" : status === "REVIEW" ? "review" : "pending"]++;
  }
  return result;
}
