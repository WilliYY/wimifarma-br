import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { paymentBody, providerState, assertPaymentBinding, validWebhookSignature, paymentAccessToken, validPaymentAccess } from "./rules";
import { paymentInputSchema, providerOrderSchema } from "./schema";
import { mercadoPagoRequest } from "./provider";
import { paymentJson } from "./http";

const remote = (status = "processed", detail = "accredited") => providerOrderSchema.parse({
  id: "ORDSYNTHETIC1", type: "online", external_reference: "local-synthetic", total_amount: "12.34", country_code: "BRA", user_id: "123", currency_id: "BRL",
  status, status_detail: detail, last_updated_date: "2026-09-29T12:00:00Z",
  transactions: { payments: [{ amount: "12.34", status, status_detail: detail, payment_method: { id: "pix", type: "bank_transfer" } }] },
});
test("server fixes amount/reference/installments and does not forward arbitrary client fields", () => {
  const input = paymentInputSchema.parse({ method: "card", email: "buyer@example.com", token: "synthetic-card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 1, transaction_amount: 0.01, notification_url: "https://attacker.example", card_number: "do-not-forward" });
  const body = paymentBody(input, 1234, "local-synthetic");
  assert.equal(body.total_amount, "12.34"); assert.equal(body.external_reference, "local-synthetic");
  assert.doesNotMatch(JSON.stringify(body), /attacker|card_number|do-not-forward|0\.01/);
  assert.equal(paymentBody({ method: "pix", email: "buyer@example.com" }, 100, "test").transactions.payments[0].expiration_time, "PT30M");
  assert.equal(paymentInputSchema.safeParse({ ...input, installments: 12 }).success, false);
  assert.throws(() => paymentBody(input, 0, "test"));
});
test("only accredited provider state is paid; holds, failures, refund and partial refund are distinct", () => {
  assert.equal(providerState(remote()), "PAID");
  assert.equal(providerState(remote("action_required", "waiting_transfer")), "PENDING");
  assert.equal(providerState(remote("action_required", "waiting_capture")), "PENDING");
  assert.equal(providerState(remote("processing", "pending_review_manual")), "PENDING");
  for (const [status, expected] of [["failed", "FAILED"], ["canceled", "CANCELED"], ["refunded", "REFUNDED"], ["charged_back", "DISPUTED"]]) assert.equal(providerState(remote(status, status)), expected);
  assert.equal(providerState(remote("processed", "partially_refunded")), "PARTIALLY_REFUNDED");
});
test("reconciliation rejects another merchant, another reference, another payment and changed amount/currency", () => {
  const expected = { id: "local-synthetic", providerOrderId: "ORDSYNTHETIC1", amountCents: 1234, accountId: "123" };
  assert.doesNotThrow(() => assertPaymentBinding(remote(), expected));
  for (const changed of [{ accountId: "other" }, { id: "other" }, { amountCents: 1233 }, { providerOrderId: "ORDOTHER" }]) assert.throws(() => assertPaymentBinding(remote(), { ...expected, ...changed }));
  assert.equal(providerOrderSchema.safeParse({ ...remote(), currency_id: "USD" }).success, false);
  assert.equal(providerOrderSchema.safeParse({ ...remote(), currency: "USD" }).success, false);
  assert.equal(providerOrderSchema.safeParse({ ...remote(), currency: "BRL" }).success, true);
  assert.equal(providerOrderSchema.safeParse({ ...remote(), transactions: { payments: [] } }).success, false);
});
test("webhook HMAC rejects unsigned, altered resource, replay and cross-request signatures", () => {
  const secret = "synthetic-webhook-secret", now = 1_790_683_200_000;
  const ts = String(now); const digest = createHmac("sha256", secret).update(`id:ordsynthetic1;request-id:synthetic-request;ts:${ts};`).digest("hex");
  const request = (id = "ORDSYNTHETIC1", requestId = "synthetic-request", signature = `ts=${ts},v1=${digest}`) => new Request(`https://example.com/webhook?data.id=${id}`, { headers: { "x-request-id": requestId, "x-signature": signature } });
  assert.equal(validWebhookSignature(request(), secret, now), true);
  assert.equal(validWebhookSignature(request("ORDOTHER"), secret, now), false);
  assert.equal(validWebhookSignature(request(undefined, "other"), secret, now), false);
  assert.equal(validWebhookSignature(request(undefined, undefined, ""), secret, now), false);
  assert.equal(validWebhookSignature(request(), secret, now + 11 * 60_000), false);
});
test("guest access token is bound to order and checkout attempt", () => {
  const previous = process.env.AUTH_SECRET; process.env.AUTH_SECRET = "synthetic-auth-secret-for-tests";
  try { const token = paymentAccessToken("order1", "attempt1");
    assert.equal(validPaymentAccess(token, "order1", "attempt1"), true);
    assert.equal(validPaymentAccess(token, "order2", "attempt1"), false);
    assert.equal(validPaymentAccess(token, "order1", "attempt2"), false);
    assert.equal(validPaymentAccess("", "order1", "attempt1"), false);
  } finally { if (previous === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous; }
});
test("provider uses fixed HTTPS origin, no redirects, one idempotency key and sanitized failures", async context => {
  const calls: { url: string; options?: RequestInit }[] = [];
  context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => { calls.push({ url, options }); return new Response("upstream-private-secret", { status: 500 }); });
  await assert.rejects(mercadoPagoRequest("/v1/orders", "synthetic-private-token", { safe: true }, "same-key"), (error: Error) => !/private-secret|private-token/.test(error.message));
  assert.equal(calls.length, 1); assert.equal(calls[0].url, "https://api.mercadopago.com/v1/orders");
  assert.equal(calls[0].options?.redirect, "error"); assert.equal(new Headers(calls[0].options?.headers).get("X-Idempotency-Key"), "same-key");
  await assert.rejects(mercadoPagoRequest("https://attacker.example", "synthetic-private-token")); assert.equal(calls.length, 1);
});
test("Orders 402 unwraps a canonical declined order and retains all reconciliation bindings", async context => {
  const declined = { ...remote("failed", "cc_rejected_other_reason"), currency: "BRL" };
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return Response.json({ errors: [{ code: "failed", message: "upstream-private-message" }], data: declined }, { status: 402 });
  });
  const order = providerOrderSchema.parse(await mercadoPagoRequest("/v1/orders", "synthetic-token", { safe: true }, "same-key"));
  assert.equal(calls, 1);
  assert.equal(providerState(order), "FAILED");
  const expected = { id: "local-synthetic", providerOrderId: null, amountCents: 1234, accountId: "123" };
  assert.doesNotThrow(() => assertPaymentBinding(order, expected));
  for (const changed of [{ accountId: "other" }, { id: "other" }, { amountCents: 1233 }, { providerOrderId: "ORDOTHER" }]) {
    assert.throws(() => assertPaymentBinding(order, { ...expected, ...changed }));
  }
  assert.doesNotMatch(JSON.stringify(order), /upstream-private-message/);
});
test("invalid or unrelated error responses stay uncertain instead of confirming failure", async context => {
  let status = 402;
  let payload: unknown = { errors: [{ code: "failed", message: "upstream-private-message" }] };
  context.mock.method(globalThis, "fetch", async () => Response.json(payload, { status }));
  const rejected = (path = "/v1/orders", body: unknown = {}) => assert.rejects(
    mercadoPagoRequest(path, "synthetic-token", body, "same-key"),
    (error: Error) => /Consulte o status/.test(error.message) && !/upstream-private-message/.test(error.message),
  );
  await rejected();
  payload = { data: { ...remote("failed"), currency: "USD" } }; await rejected();
  payload = { data: { ...remote("failed"), transactions: { payments: [] } } }; await rejected();
  payload = { data: remote("failed") };
  await rejected("/v1/orders/ORDSYNTHETIC1");
  await assert.rejects(mercadoPagoRequest("/v1/orders", "synthetic-token"), /Consulte o status/);
  status = 400; await rejected();
  status = 503; await rejected();
});
test("mutations enforce origin, content type, bounded body and JSON validity", async () => {
  const old = process.env.AUTH_URL; process.env.AUTH_URL = "https://example.com";
  try {
    const request = (body: string, origin = "https://example.com") => new Request("https://example.com/api/payments", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body });
    assert.deepEqual(await paymentJson(request("{}")), {});
    await assert.rejects(paymentJson(request("{}", "https://attacker.example")), /Origem/);
    await assert.rejects(paymentJson(request("{")), /JSON/);
    await assert.rejects(paymentJson(request(" ".repeat(16_001))), /grande/);
  } finally { if (old === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = old; }
});
