import assert from "node:assert/strict";
import test from "node:test";
import { assertAsaasPaymentBinding, createAsaasCheckout, createAsaasPix, listAsaasPayments,
  retrieveActiveRandomPix, retrieveAsaasApproval, retrieveAsaasPayment, retrieveAsaasWalletId,
  selectBoundAsaasPayment, type AsaasConnection } from "./asaas-provider";

const connection: AsaasConnection = { environment: "test", accessToken: "$aact_hmlg_synthetic-not-a-real-key" };
const uuid = "131ca662-56c8-4479-b5b3-fd61a413fce7";
const qrId = "9bea9bcd226b45c7980065f598be54d5";
const expected = { amountCents: 1234, method: "pix" as const, resource: { pixQrCodeId: qrId } };
const payment = { id: "pay_synthetic123", billingType: "PIX" as const, status: "RECEIVED" as const,
  value: 12.34, netValue: 11.85, pixQrCodeId: qrId, refunds: [] };
async function mocked(run: (calls: { url: string; options: RequestInit }[]) => Promise<void>, response: unknown,
  status = 200, failure = false) {
  const original = globalThis.fetch;
  const calls: { url: string; options: RequestInit }[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options: options! });
    if (failure) throw new Error(connection.accessToken);
    return new Response(typeof response === "string" ? response : JSON.stringify(response), { status });
  };
  try { await run(calls); } finally { globalThis.fetch = original; }
}
test("credentials and environment must match before HTTP; retrieval IDs cannot change the path", async () => {
  await mocked(async calls => {
    for (const invalid of [{ ...connection, accessToken: "$aact_prod_synthetic" },
      { environment: "production" as const, accessToken: connection.accessToken },
      { ...connection, accessToken: `${connection.accessToken}\n` }]) {
      await assert.rejects(retrieveAsaasWalletId(invalid));
    }
    for (const id of ["../wallets", "pay_x?token=secret", "https://evil.example", ""]) {
      await assert.rejects(retrieveAsaasPayment(connection, id));
    }
    assert.equal(calls.length, 0);
  }, {});
});
test("wallet, approval and active EVP read only their fixed official endpoints", async () => {
  await mocked(async calls => {
    assert.equal(await retrieveAsaasWalletId(connection), uuid);
    assert.equal(calls[0].url, "https://api-sandbox.asaas.com/v3/wallets/");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.body, undefined);
    assert.equal(calls[0].options.redirect, "error");
    assert.equal(calls[0].options.cache, "no-store");
  }, { data: [{ id: uuid }], hasMore: false });
  await mocked(async () => assert.equal(await retrieveAsaasApproval(connection), true), { general: "APPROVED" });
  await mocked(async () => assert.equal(await retrieveAsaasApproval(connection), false), { general: "PENDING" });
  await mocked(async calls => {
    assert.deepEqual(await retrieveActiveRandomPix(connection), { id: uuid, key: uuid });
    assert.equal(calls[0].url, "https://api-sandbox.asaas.com/v3/pix/addressKeys?status=ACTIVE&limit=100&offset=0");
  }, { data: [{ id: uuid, key: uuid, type: "EVP", status: "ACTIVE", account: "private" }], hasMore: false });
  await mocked(async () => assert.equal(await retrieveActiveRandomPix(connection), null),
    { data: [{ id: uuid, key: "private@email.invalid", type: "EMAIL", status: "ACTIVE" }], hasMore: false });
  await mocked(async calls => {
    await retrieveAsaasApproval({ environment: "production", accessToken: "$aact_prod_synthetic" });
    assert.equal(calls[0].url, "https://api.asaas.com/v3/myAccount/status/");
  }, { general: "APPROVED" });
});
test("Pix sends fixed single-use amount/expiry and returns bounded canonical resource", async () => {
  const expirationDate = new Date(Date.now() + 7200000).toISOString();
  await mocked(async calls => {
    const result = await createAsaasPix(connection, { amountCents: 1234, externalReference: "order-123", addressKey: uuid });
    assert.equal(result.pixQrCodeId, qrId);
    assert.equal(result.pixCode, "000201synthetic-payload");
    assert.equal(result.allowsMultiplePayments, false);
    assert.equal(result.pixExpiresAt, expirationDate);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api-sandbox.asaas.com/v3/pix/qrCodes/static");
    assert.deepEqual(JSON.parse(String(calls[0].options.body)), { addressKey: uuid, description: "Pedido Wimifarma",
      value: 12.34, format: "ALL", expirationSeconds: 7200, allowsMultiplePayments: false, externalReference: "order-123" });
  }, { id: qrId, payload: "000201synthetic-payload", encodedImage: "c3ludGhldGlj", expirationDate, allowsMultiplePayments: false });
});
const callbacks = { successUrl: "https://wimifarma.com.br/pedido?result=success",
  cancelUrl: "https://wimifarma.com.br/pedido?result=cancel", expiredUrl: "https://wimifarma.com.br/pedido?result=expired" };
test("hosted card checkout fixes 1x, quantity and duration without PAN/CVV/customerData", async () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://wimifarma.com.br";
  try {
    await mocked(async calls => {
      const resource = await createAsaasCheckout(connection, { amountCents: 1234, externalReference: "order-123", callback: callbacks });
      assert.equal(resource.checkoutSessionId, uuid);
      assert.equal(resource.checkoutUrl, `https://sandbox.asaas.com/checkoutSession/show/${uuid}`);
      assert.deepEqual(JSON.parse(String(calls[0].options.body)), { billingTypes: ["CREDIT_CARD"], chargeTypes: ["DETACHED"],
        minutesToExpire: 120, externalReference: "order-123", items: [{ name: "Pedido Wimifarma", quantity: 1, value: 12.34 }], callback: callbacks });
    }, { id: uuid, link: `https://sandbox.asaas.com/checkoutSession/show/${uuid}`, status: "ACTIVE", externalReference: "order-123" });
    for (const link of [`https://sandbox.asaas.com.evil.example/checkoutSession/show/${uuid}`,
      `https://user:password@sandbox.asaas.com/checkoutSession/show/${uuid}`,
      `https://asaas.com/checkoutSession/show/${uuid}`, `https://sandbox.asaas.com/checkoutSession/show/other-id`]) {
      await mocked(async () => assert.rejects(createAsaasCheckout(connection,
        { amountCents: 1234, externalReference: "order-123", callback: callbacks })), { id: uuid, link, status: "ACTIVE" });
    }
    await mocked(async calls => {
      await assert.rejects(createAsaasCheckout(connection, { amountCents: 1234, externalReference: "order-123",
        callback: { ...callbacks, successUrl: "https://evil.example" } }));
      assert.equal(calls.length, 0);
    }, {});
  } finally { if (previous === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = previous; }
});
test("invalid amounts or unsafe multiple-use/missing expiry responses never become usable QR", async () => {
  await mocked(async calls => {
    for (const amountCents of [0, -1, 1.1, Infinity, 100000001]) await assert.rejects(createAsaasPix(connection,
      { amountCents, externalReference: "order-123", addressKey: uuid }));
    assert.equal(calls.length, 0);
  }, {});
  for (const response of [{ allowsMultiplePayments: true }, { allowsMultiplePayments: false }]) {
    await mocked(async () => assert.rejects(createAsaasPix(connection,
      { amountCents: 1234, externalReference: "order-123", addressKey: uuid })),
    { id: qrId, payload: "000201synthetic", encodedImage: "c3ludGhldGlj", ...response });
  }
});
test("network/HTTP/malformed/oversized POST results are uncertain, sanitized and never retried", async () => {
  for (const [response, status, failure] of [[{}, 200, true], [{ error: connection.accessToken }, 400, false],
    [connection.accessToken, 200, false], ["x".repeat(256001), 200, false]] as const) {
    await mocked(async calls => {
      await assert.rejects(createAsaasPix(connection, { amountCents: 1234, externalReference: "order-123", addressKey: uuid }),
        (error: Error) => !error.message.includes(connection.accessToken) && /Consulte/.test(error.message));
      assert.equal(calls.length, 1);
    }, response, status, failure);
  }
});
test("payment reads parse official canonical fields, refunds and chargeback without private payer data", async () => {
  const canonical = { ...payment, status: "REFUNDED", deleted: false,
    refunds: [{ status: "DONE", value: 12.34, dateCreated: "2026-10-08 12:00:00", effectiveDate: "2026-10-08", description: "private" }],
    chargeback: { id: uuid, payment: payment.id, status: "DONE", value: 12.34, creditCard: { number: "private" } }, customer: "private" };
  await mocked(async calls => {
    const parsed = await retrieveAsaasPayment(connection, payment.id);
    assert.equal(parsed.status, "REFUNDED");
    assert.deepEqual(parsed.refunds, [{ status: "DONE", value: 12.34, dateCreated: "2026-10-08 12:00:00", effectiveDate: "2026-10-08" }]);
    assert.equal(parsed.deleted, false);
    assert.ok(!JSON.stringify(parsed).includes("private"));
    assert.equal(calls[0].url, `https://api-sandbox.asaas.com/v3/payments/${payment.id}`);
  }, canonical);
  await mocked(async () => assert.rejects(retrieveAsaasPayment(connection, "pay_other")), canonical);
  await mocked(async calls => {
    assert.equal((await listAsaasPayments(connection, expected.resource)).length, 1);
    assert.equal(calls[0].url, `https://api-sandbox.asaas.com/v3/payments?pixQrCodeId=${qrId}&limit=100&offset=0`);
  }, { data: [payment], hasMore: false });
  await mocked(async () => assert.rejects(listAsaasPayments(connection, expected.resource)), { data: [payment], hasMore: true });
});
test("unknown payment/refund/chargeback statuses fail closed instead of becoming paid", async () => {
  for (const changed of [{ ...payment, status: "PARTIALLY_REFUNDED" },
    { ...payment, refunds: [{ status: "FUTURE_UNKNOWN", value: 1 }] },
    { ...payment, chargeback: { id: uuid, status: "FUTURE_UNKNOWN", value: 1 } }]) {
    await mocked(async () => assert.rejects(retrieveAsaasPayment(connection, payment.id)), changed);
  }
  for (const status of ["PENDING", "AWAITING_CRITICAL_ACTION_AUTHORIZATION", "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION", "CANCELLED", "DONE"]) {
    await mocked(async () => {
      const parsed = await retrieveAsaasPayment(connection, payment.id);
      assert.equal(parsed.refunds?.[0].status, status);
    }, { ...payment, refunds: [{ status, value: 1 }] });
  }
});
test("requests set a 15 second abort signal and timeout never triggers another POST", async () => {
  const original = AbortSignal.timeout;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  AbortSignal.timeout = ms => {
    assert.equal(ms, 15_000);
    const controller = new AbortController();
    controller.abort(new DOMException("Synthetic timeout", "TimeoutError"));
    return controller.signal;
  };
  globalThis.fetch = async (_url, options) => { calls++; throw options!.signal!.reason; };
  try {
    await assert.rejects(createAsaasPix(connection, { amountCents: 1234, externalReference: "order-123", addressKey: uuid }), /Consulte/);
    assert.equal(calls, 1);
  } finally { AbortSignal.timeout = original; globalThis.fetch = originalFetch; }
});
test("binding rejects changed value, instrument, resource, payment ID and ambiguous multiple payments", () => {
  assert.doesNotThrow(() => assertAsaasPaymentBinding(payment, expected));
  assert.equal(selectBoundAsaasPayment([], expected), null);
  assert.equal(selectBoundAsaasPayment([payment], expected)?.id, payment.id);
  for (const changed of [{ ...payment, value: 12.35 }, { ...payment, billingType: "CREDIT_CARD" },
    { ...payment, pixQrCodeId: "other" }, { ...payment, value: 12.341 }]) {
    assert.throws(() => assertAsaasPaymentBinding(changed, expected));
  }
  assert.throws(() => assertAsaasPaymentBinding(payment, { ...expected, paymentId: "pay_other" }));
  assert.throws(() => selectBoundAsaasPayment([payment, { ...payment, id: "pay_other" }], expected));
  const card = { ...payment, billingType: "CREDIT_CARD", pixQrCodeId: null, checkoutSession: uuid, externalReference: "order-123" };
  assert.doesNotThrow(() => assertAsaasPaymentBinding(card,
    { amountCents: 1234, method: "card", resource: { checkoutSessionId: uuid }, externalReference: "order-123" }));
  assert.throws(() => assertAsaasPaymentBinding(card,
    { amountCents: 1234, method: "card", resource: { checkoutSessionId: uuid }, externalReference: "wrong" }));
});
