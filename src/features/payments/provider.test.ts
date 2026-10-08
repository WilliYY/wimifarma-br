import assert from "node:assert/strict";
import test from "node:test";
import { mercadoPagoRequest } from "./provider";
import { PaymentError } from "./schema";
import { paymentFailure } from "./http";

const requestId = "3f8fb848-a986-4ef4-908a-834782277a13";
const privateValues = "synthetic-private-token buyer@example.com synthetic-card-token synthetic-pix-code";
const request = () => mercadoPagoRequest("/v1/orders", "synthetic-private-token", {
  payer: { email: "buyer@example.com" }, token: "synthetic-card-token", qr_code: "synthetic-pix-code",
}, "synthetic-idempotency-key");

function diagnostic(error: unknown) {
  assert.ok(error instanceof PaymentError);
  assert.equal(error.status, 503);
  assert.doesNotMatch(error.message + JSON.stringify(error), /synthetic-private-token|buyer@example\.com|synthetic-card-token|synthetic-pix-code/);
  assert.ok("diagnostics" in error, "provider failures retain sanitized internal diagnostics");
  return error.diagnostics;
}

test("provider keeps HTTP status, approved codes and request ID without exposing private error data", async context => {
  let status = 400; let code = "required_properties"; let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return Response.json({ errors: [{ code, message: privateValues }], payer: privateValues, data: { token: privateValues } }, {
      status, headers: { "x-request-id": requestId },
    });
  });
  for (const [nextStatus, nextCode] of [[400, "required_properties"], [401, "invalid_credentials"], [422, "property_value"], [500, "internal_error"]] as const) {
    status = nextStatus; code = nextCode;
    await assert.rejects(request(), error => {
      assert.deepEqual(diagnostic(error), { upstreamStatus: status, code, requestId, reason: "http_error" });
      return true;
    });
  }
  assert.equal(calls, 4, "transport never retries a financial request automatically");
});

test("provider rejects unknown codes and non-identifier request headers", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ errors: [{ code: "synthetic_private_token", message: privateValues }] }, {
    status: 400, headers: { "x-request-id": "buyer@example.com" },
  }));
  await assert.rejects(request(), error => {
    assert.deepEqual(diagnostic(error), { upstreamStatus: 400, code: null, requestId: null, reason: "http_error" });
    return true;
  });
});

test("provider separates timeout and network failure without retaining exception text", async context => {
  let failure: Error = new DOMException(privateValues, "TimeoutError"); let calls = 0;
  context.mock.method(globalThis, "fetch", async () => { calls += 1; throw failure; });
  for (const [error, reason] of [[failure, "timeout"], [new DOMException(privateValues, "AbortError"), "timeout"], [new Error(privateValues), "network_error"]] as const) {
    failure = error;
    await assert.rejects(request(), caught => {
      assert.deepEqual(diagnostic(caught), { upstreamStatus: null, code: null, requestId: null, reason });
      return true;
    });
  }
  assert.equal(calls, 3);
});

test("invalid and excessive error responses keep bounded diagnostics", async context => {
  let payload = "not-json " + privateValues;
  context.mock.method(globalThis, "fetch", async () => new Response(payload, { status: 500, headers: { "x-request-id": requestId } }));
  for (const value of [payload, JSON.stringify({ errors: [{ code: "internal_error", message: privateValues.repeat(1000) }] })]) {
    payload = value;
    await assert.rejects(request(), error => {
      assert.deepEqual(diagnostic(error), { upstreamStatus: 500, code: null, requestId, reason: "http_error" });
      return true;
    });
  }
});

test("invalid success JSON records response failure and public HTTP response remains generic", async context => {
  context.mock.method(globalThis, "fetch", async () => new Response(privateValues, { headers: { "x-request-id": requestId } }));
  let caught: unknown;
  try { await request(); } catch (error) { caught = error; }
  assert.deepEqual(diagnostic(caught), { upstreamStatus: 200, code: null, requestId, reason: "invalid_response" });
  const response = paymentFailure(caught);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.doesNotMatch(body, /diagnostics|upstreamStatus|requestId|synthetic-private|buyer@example/);
  assert.match(body, /Consulte o status/);
});
