import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

// Synthetic records only. Transaction serialization models the Order row lock.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
const bundle = build({ entryPoints: ["src/features/payments/asaas-commerce-service.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "commerce-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|asaas-integration$|cashback\/(service|redemption)$|miauby\/commerce-service$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>fixture.prisma;" : args.path.endsWith("integration")
        ? "export const readAsaasIntegration=async()=>fixture.connection;" : args.path.includes("cashback")
          ? "export const settleOrderCashback=async()=>fixture.effects.cashback++; export const settleOrderBenefits=async()=>fixture.effects.benefits++;"
          : "export const queueCommerceOrder=async()=>fixture.effects.messages++;" }));
  } }] });

async function harness() {
  const connection = { id: "asaas", accountId: "synthetic-wallet", environment: "production", enabled: true, revision: 2,
    secrets: { accessToken: "$aact_prod_synthetic", webhookId: "synthetic-hook", methods: ["pix", "card"], pixAddressKey: "123e4567-e89b-42d3-a456-426614174000" } };
  const product = { id: "synthetic-product", price: "5.00", promotionalPrice: null, stock: 2, updatedAt: new Date(),
    status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "UNREVIEWED" };
  const order: Data = { id: "synthetic-order", number: "SYNTHETIC", status: "PENDING", paymentStatus: "PENDING", createdAt: new Date(),
    requiresPrescriptionReview: false, customerEmail: "synthetic@example.invalid", items: [{ productId: product.id, productName: "Fictício", unitPriceCents: 500, quantity: 1, totalCents: 500 }] };
  const payment: Data = { id: "synthetic-attempt", orderId: order.id, provider: "asaas", integrationId: "asaas", environment: "production",
    accountId: connection.accountId, integrationRevision: 2, amountCents: 500, status: "NEW", stockReserved: false,
    method: null, installments: null, providerOrderId: null, pixQrCodeId: null, checkoutSessionId: null, pixCode: null,
    pixExpiresAt: null, fundsAvailable: false, lastCheckedAt: null };
  const effects = { cashback: 0, benefits: 0, messages: 0 };
  const calls = { posts: 0, gets: 0, locks: 0 };
  const audits: Data[] = [];
  const controls = { uncertain: false, badAmount: false, deleted: false, empty: false, status: "RECEIVED", refunds: [] as Data[] };
  const prisma = {
    $queryRaw: async () => { calls.locks++; }, paymentIntegration: { findUnique: async () => connection },
    order: { findUniqueOrThrow: async () => ({ ...order, onlinePayment: { ...payment } }),
      update: async ({ data }: Data) => Object.assign(order, data) },
    product: { findUnique: async () => product,
      updateMany: async ({ data }: Data) => { product.stock -= data.stock.decrement; return { count: 1 }; },
      update: async ({ data }: Data) => { product.stock += data.stock.increment; return product; } },
    onlinePayment: { findUniqueOrThrow: async () => ({ ...payment, order: { ...order } }),
      update: async ({ data }: Data) => Object.assign(payment, data),
      updateMany: async ({ where, data }: Data) => {
        if (where.status && payment.status !== where.status) return { count: 0 };
        Object.assign(payment, data); return { count: 1 };
      } }, auditLog: { create: async ({ data }: Data) => { audits.push(data); return data; } },
  };
  let queue = Promise.resolve();
  const fixture = { connection, effects, prisma: { ...prisma, $transaction: (callback: (tx: Data) => Promise<unknown>) => {
    const result = queue.then(() => callback(prisma)); queue = result.then(() => undefined, () => undefined); return result;
  } } };
  const loaded = { exports: {} as { startAsaasCommercePayment(id: string, input: Data): Promise<Data>; refreshAsaasCommercePayment(id: string, checkoutEvent?: Data): Promise<Data> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(`${process.cwd()}/package.json`), fixture, Buffer, URL, AbortSignal, Date,
    process: { env: { AUTH_URL: "https://example.invalid" } }, fetch: async (_url: string, options: Data) => {
      if (options.method === "POST") {
        calls.posts++; assert.equal(payment.status, "SUBMITTING"); assert.equal(product.stock, 1);
        if (controls.uncertain) throw new Error("synthetic uncertain network");
        return payment.method === "card" ? Response.json({ id: "123e4567-e89b-42d3-a456-426614174001", link: "https://asaas.com/checkoutSession/show?id=123e4567-e89b-42d3-a456-426614174001", status: "ACTIVE" })
          : Response.json({ id: "synthetic-qr", payload: "synthetic-pix", encodedImage: "YWJj", expirationDate: new Date(Date.now() + 7200000).toISOString(), allowsMultiplePayments: false });
      }
      calls.gets++;
      const remote = { id: "pay_synthetic", billingType: payment.method === "card" ? "CREDIT_CARD" : "PIX", status: controls.status,
        value: controls.badAmount ? 6 : 5, netValue: 4.5, deleted: controls.deleted, pixQrCodeId: "synthetic-qr", checkoutSession: "123e4567-e89b-42d3-a456-426614174001", refunds: controls.refunds };
      return Response.json(_url.includes("/payments?") ? { data: controls.empty ? [] : [remote], hasMore: false } : remote);
    } });
  return { ...loaded.exports, product, payment, order, connection, effects, calls, controls, audits, input: { method: "pix", email: "synthetic@example.invalid" } };
}

test("canceled or expired checkout with no canonical payment becomes visible review and retains its reservation", async () => {
  for (const eventType of ["CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"]) {
    const f = await harness(); await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
    f.controls.empty = true;
    const event = { eventType, checkoutSessionId: f.payment.checkoutSessionId };
    const view = await f.refreshAsaasCommercePayment(f.order.id, event);
    await f.refreshAsaasCommercePayment(f.order.id, event);
    assert.equal(view.status, "REVIEW"); assert.equal(view.checkoutUrl, null);
    assert.equal(f.payment.financialReviewReason, eventType); assert.equal(f.order.paymentStatus, "PENDING");
    assert.equal(f.payment.stockReserved, true); assert.equal(f.product.stock, 1);
    assert.equal(f.audits.filter(a => a.action === "ASAAS_CHECKOUT_REVIEW").length, 1);
    await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
    assert.equal(f.calls.posts, 1); assert.equal(f.calls.gets, 2); assert.equal(f.effects.messages, 0);
    f.controls.empty = false; f.controls.status = "CONFIRMED";
    await f.refreshAsaasCommercePayment(f.order.id); await f.refreshAsaasCommercePayment(f.order.id);
    assert.equal(f.payment.status, "PAID"); assert.equal(f.payment.financialReviewReason, null);
    assert.equal(f.effects.messages, 1); assert.equal(f.product.stock, 1);
  }
});

test("checkout timeout with empty canonical list requires review without releasing stock", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
  f.controls.empty = true;
  await f.refreshAsaasCommercePayment(f.order.id); assert.equal(f.payment.status, "PENDING");
  f.payment.submissionStartedAt = new Date(Date.now() - 3 * 60 * 60_000);
  const view = await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(view.status, "REVIEW"); assert.equal(view.checkoutUrl, null);
  assert.equal(f.payment.financialReviewReason, "CHECKOUT_TIMEOUT");
  assert.equal(f.payment.stockReserved, true); assert.equal(f.product.stock, 1); assert.equal(f.order.status, "PENDING");
});

test("checkout review retains stock for canonical pending and releases it once only after canonical cancellation", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
  f.controls.status = "PENDING";
  await f.refreshAsaasCommercePayment(f.order.id, { eventType: "CHECKOUT_CANCELED", checkoutSessionId: f.payment.checkoutSessionId });
  assert.equal(f.payment.status, "REVIEW"); assert.equal(f.payment.financialReviewReason, "CHECKOUT_CANCELED");
  assert.equal(f.product.stock, 1); assert.equal(f.payment.stockReserved, true);
  await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "REVIEW"); assert.equal(f.product.stock, 1);
  f.controls.deleted = true;
  await f.refreshAsaasCommercePayment(f.order.id); await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "CANCELED"); assert.equal(f.order.status, "CANCELED");
  assert.equal(f.product.stock, 2); assert.equal(f.payment.stockReserved, false); assert.equal(f.calls.posts, 1);
  f.controls.deleted = false; f.controls.status = "RECEIVED";
  await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "REVIEW"); assert.equal(f.effects.messages, 0); assert.equal(f.order.paymentStatus, "CANCELED");
});

test("checkout event cannot affect another session or override canonical paid state or general review", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
  await assert.rejects(f.refreshAsaasCommercePayment(f.order.id, { eventType: "CHECKOUT_CANCELED", checkoutSessionId: "another-session" }));
  assert.equal(f.payment.status, "PENDING");
  await f.refreshAsaasCommercePayment(f.order.id, { eventType: "CHECKOUT_CANCELED", checkoutSessionId: f.payment.checkoutSessionId });
  assert.equal(f.payment.status, "PAID");
  f.payment.status = "REVIEW"; f.payment.financialReviewReason = "OTHER_REVIEW";
  await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "REVIEW");
});

test("canonical financial review cannot inherit checkout timeout or cancellation recovery privileges", async () => {
  for (const initial of ["PAID_TIMEOUT", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED", "CHECKOUT_TIMEOUT"]) {
    const f = await harness(); await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
    if (initial === "PAID_TIMEOUT") {
      f.payment.submissionStartedAt = new Date(Date.now() - 3 * 60 * 60_000);
      f.controls.status = "CONFIRMED"; await f.refreshAsaasCommercePayment(f.order.id);
      assert.equal(f.payment.status, "PAID");
    } else {
      f.controls.empty = true;
      if (initial === "CHECKOUT_TIMEOUT") f.payment.submissionStartedAt = new Date(Date.now() - 3 * 60 * 60_000);
      await f.refreshAsaasCommercePayment(f.order.id, initial === "CHECKOUT_TIMEOUT" ? undefined : {
        eventType: initial, checkoutSessionId: f.payment.checkoutSessionId });
      assert.equal(f.payment.status, "REVIEW"); assert.equal(f.payment.financialReviewReason, initial);
      f.controls.empty = false;
    }
    const reserved = f.payment.stockReserved;
    const effects = { ...f.effects };
    f.controls.status = "REFUND_IN_PROGRESS";
    await f.refreshAsaasCommercePayment(f.order.id);
    assert.equal(f.payment.status, "REVIEW");
    assert.equal(f.payment.financialReviewReason, "Confira o estado financeiro canônico antes de alterar o pedido.", initial);
    f.controls.status = "CONFIRMED";
    await f.refreshAsaasCommercePayment(f.order.id); await f.refreshAsaasCommercePayment(f.order.id);
    assert.equal(f.payment.status, "REVIEW", initial);
    assert.equal(f.payment.statusDetail, "REFUND_IN_PROGRESS");
    assert.equal(f.payment.stockReserved, reserved); assert.equal(f.product.stock, 1);
    assert.deepEqual(f.effects, effects); assert.equal(f.calls.posts, 1);
  }
});

test("concurrent starts reserve stock and create only one Asaas resource", async () => {
  const f = await harness(); await Promise.all([f.startAsaasCommercePayment(f.order.id, f.input), f.startAsaasCommercePayment(f.order.id, f.input)]);
  assert.equal(f.calls.posts, 1); assert.equal(f.product.stock, 1); assert.equal(f.payment.stockReserved, true);
});
test("unknown POST is never repeated by start or refresh and retains stock reservation", async () => {
  const f = await harness(); f.controls.uncertain = true;
  await assert.rejects(f.startAsaasCommercePayment(f.order.id, f.input));
  assert.equal(f.payment.status, "UNKNOWN");
  await f.startAsaasCommercePayment(f.order.id, f.input); await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.calls.posts, 1); assert.equal(f.calls.gets, 0); assert.equal(f.product.stock, 1);
});
test("rejects test, stale configuration, MP token and unavailable stock before POST", async () => {
  for (const change of ["test", "revision", "method", "stock", "disabled", "price"] as const) {
    const f = await harness();
    if (change === "test") f.payment.environment = "test";
    if (change === "revision") f.connection.revision++;
    if (change === "stock") f.product.stock = 0;
    if (change === "disabled") f.connection.enabled = false;
    if (change === "price") f.product.price = "6.00";
    await assert.rejects(f.startAsaasCommercePayment(f.order.id, change === "method" ? { ...f.input, method: "card", token: "synthetic-token" } : f.input));
    assert.equal(f.calls.posts, 0);
  }
});
test("Pix CONFIRMED stays pending; RECEIVED pays once and sends one commercial notification", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, f.input); f.controls.status = "CONFIRMED";
  await f.refreshAsaasCommercePayment(f.order.id); assert.equal(f.order.paymentStatus, "PENDING");
  f.controls.status = "RECEIVED"; await f.refreshAsaasCommercePayment(f.order.id); await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.order.paymentStatus, "PAID"); assert.equal(f.payment.fundsAvailable, true); assert.equal(f.effects.messages, 1);
  assert.equal(f.product.stock, 1); assert.equal(f.payment.stockReserved, false);
});
test("hosted card is 1x; CONFIRMED approves without settled funds", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, { ...f.input, method: "hosted-card" });
  assert.equal(f.payment.method, "card"); assert.equal(f.payment.installments, 1);
  f.controls.status = "CONFIRMED"; await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "PAID"); assert.equal(f.payment.fundsAvailable, false); assert.equal(f.effects.messages, 1);
});
test("canonical binding mismatch never marks paid or releases stock", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, f.input); f.controls.badAmount = true;
  await assert.rejects(f.refreshAsaasCommercePayment(f.order.id));
  assert.equal(f.order.paymentStatus, "PENDING"); assert.equal(f.product.stock, 1); assert.equal(f.effects.messages, 0);
});
test("refund cancels payment without presuming physical return; duplicate does not repeat benefits", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, f.input); await f.refreshAsaasCommercePayment(f.order.id);
  f.controls.status = "REFUNDED"; await f.refreshAsaasCommercePayment(f.order.id);
  const effects = { ...f.effects }; await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.order.paymentStatus, "REFUNDED"); assert.equal(f.product.stock, 1); assert.deepEqual(f.effects, effects);
});
test("late paid after canceled fulfillment requires review and cannot restart commerce", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, f.input); f.order.status = "CANCELED";
  await f.refreshAsaasCommercePayment(f.order.id); assert.equal(f.payment.status, "REVIEW"); assert.equal(f.effects.messages, 0);
});

test("canonical unpaid deletion releases stock once; late receipt cannot resurrect canceled order", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, f.input);
  f.controls.status = "PENDING"; f.controls.deleted = true;
  await f.refreshAsaasCommercePayment(f.order.id); await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.product.stock, 2); assert.equal(f.payment.stockReserved, false); assert.equal(f.order.status, "CANCELED");
  f.controls.status = "RECEIVED"; f.controls.deleted = false; await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "REVIEW"); assert.equal(f.order.paymentStatus, "CANCELED"); assert.equal(f.effects.messages, 0);
});

test("partial refund blocks automatic benefit settlement, while dispute reverses benefits once", async () => {
  const f = await harness(); await f.startAsaasCommercePayment(f.order.id, f.input); await f.refreshAsaasCommercePayment(f.order.id);
  const paidEffects = { ...f.effects }; f.controls.refunds = [{ status: "DONE", value: 1 }];
  await f.refreshAsaasCommercePayment(f.order.id); assert.equal(f.payment.status, "PARTIALLY_REFUNDED"); assert.deepEqual(f.effects, paidEffects);
  f.controls.status = "CHARGEBACK_REQUESTED"; await f.refreshAsaasCommercePayment(f.order.id);
  const disputeEffects = { ...f.effects }; await f.refreshAsaasCommercePayment(f.order.id);
  assert.equal(f.payment.status, "DISPUTED"); assert.equal(f.order.paymentStatus, "REFUNDED");
  assert.equal(f.product.stock, 1); assert.deepEqual(f.effects, disputeEffects);
});

test("method not homologated or different from checkout cannot reserve or charge", async () => {
  for (const fault of ["homologation", "method"] as const) {
    const f = await harness();
    if (fault === "homologation") f.connection.secrets.methods = ["card"];
    else f.payment.method = "card";
    await assert.rejects(f.startAsaasCommercePayment(f.order.id, f.input));
    assert.equal(f.calls.posts, 0); assert.equal(f.product.stock, 2);
  }
});
