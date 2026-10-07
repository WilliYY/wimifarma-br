import assert from "node:assert/strict";
import test from "node:test";
import { readPaymentView, type PaymentView } from "./client-recovery";

const pendingPayment: PaymentView = {
  orderId: "synthetic-order", number: "TEST-1", amountCents: 798,
  status: "PENDING", statusDetail: null, pixCode: "synthetic-pix",
  pixExpiresAt: "2026-10-07T18:00:00.000Z", payerEmail: "buyer@example.com",
  qrDataUrl: null, environment: "test", publicKey: "synthetic-key",
};

test("payment recovery retries the same order using only uncached GET after a network failure", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher = async (input: string, init?: RequestInit) => {
    requests.push({ input, init });
    if (requests.length === 1) throw new TypeError("Failed to fetch");
    return Response.json({ data: pendingPayment });
  };
  await assert.rejects(readPaymentView(pendingPayment.orderId, fetcher), /Não foi possível consultar/);
  assert.deepEqual(await readPaymentView(pendingPayment.orderId, fetcher), pendingPayment);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.input, "/api/pagamentos/synthetic-order");
    assert.equal(request.init?.method, "GET");
    assert.equal(request.init?.cache, "no-store");
    assert.equal(request.init?.body, undefined);
  }
});

test("404 and authorization failures do not automatically retry or produce a successful payment view", async () => {
  for (const status of [401, 403, 404, 503]) {
    let requests = 0;
    const message = status === 401 ? "Entre na conta que fez o pedido." : "Pagamento indisponível.";
    await assert.rejects(readPaymentView(pendingPayment.orderId, async () => {
      requests += 1;
      return Response.json({ error: message }, { status });
    }), { message });
    assert.equal(requests, 1);
  }
});

test("payment recovery preserves uncertain and pending states with their original Pix expiration", async () => {
  for (const status of ["UNKNOWN", "SUBMITTING", "PENDING"]) {
    const payment = { ...pendingPayment, status };
    const recovered = await readPaymentView(payment.orderId, async () => Response.json({ data: payment }));
    assert.deepEqual(recovered, payment);
  }
});

test("invalid response bodies remain a readable recoverable error", async () => {
  await assert.rejects(readPaymentView(pendingPayment.orderId, async () => new Response("Gateway unavailable", { status: 502 })), /Não foi possível consultar/);
  await assert.rejects(readPaymentView(pendingPayment.orderId, async () => Response.json({ data: { ...pendingPayment, orderId: "other-order" } })), /Não foi possível consultar/);
});
