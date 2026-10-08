import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/features/payments/asaas-service.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "synthetic-asaas", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|asaas-sandbox-integration$|asaas-provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>fixture.prisma;" : args.path.endsWith("integration")
        ? "export const ASAAS_SANDBOX_INTEGRATION_ID='asaas-sandbox'; export const readAsaasSandboxIntegration=async()=>fixture.connection;"
        : "export const createAsaasPix=fixture.create; export const createAsaasCheckout=fixture.create; export const retrieveAsaasPayment=fixture.retrieve; export const listAsaasPayments=fixture.list; export const selectBoundAsaasPayment=fixture.select; export const assertAsaasPaymentBinding=fixture.bind;" }));
  } }] });

async function harness() {
  const connection = { id: "asaas-sandbox", accountId: "synthetic-wallet", revision: 2, environment: "test", enabled: false,
    connection: { accessToken: "synthetic", environment: "test" }, secrets: { webhookId: "synthetic-hook", pixAddressKey: "synthetic-key" } };
  const product = { id: "synthetic-product", name: "Produto fictício", slug: "ficticio", imageUrl: null, price: "4.99", promotionalPrice: null,
    stock: 4, status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "UNREVIEWED" };
  const records: { order: Record<string, unknown>; payment: Record<string, unknown> }[] = [];
  const calls = { posts: 0, gets: 0, locks: 0, audits: [] as string[] };
  const controls = { uncertain: false, remote: null as Record<string, unknown> | null, badBinding: false };
  const byOrder = (id: string) => records.find(row => row.order.id === id);
  const prisma = {
    $executeRaw: async () => { calls.locks++; }, $queryRaw: async () => { calls.locks++; },
    paymentIntegration: { findUnique: async () => connection },
    product: { findUnique: async () => product, findMany: async () => [product] },
    order: {
      findUnique: async ({ where }: { where: { checkoutRequestId: string } }) => {
        const row = records.find(row => row.order.checkoutRequestId === where.checkoutRequestId);
        return row ? { ...row.order, onlinePayment: row.payment } : null;
      },
      create: async ({ data }: { data: Record<string, unknown> & { onlinePayment: { create: object }; items: { create: object } } }) => {
        const order = { ...data, id: `order-${records.length}`, createdAt: new Date(), status: "PENDING", paymentStatus: "PENDING", items: [data.items.create] };
        const payment = { ...data.onlinePayment.create, id: `payment-${records.length}`, orderId: order.id, createdAt: new Date(),
          pixQrCodeId: null, checkoutSessionId: null, providerOrderId: null, pixCode: null, pixExpiresAt: null, fundsAvailable: false };
        records.push({ order, payment }); return { ...order, onlinePayment: payment };
      },
      update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(byOrder(where.id)!.order, data),
    },
    onlinePayment: {
      count: async () => records.filter(row => ["NEW", "SUBMITTING", "UNKNOWN", "REVIEW", "PARTIALLY_REFUNDED", "DISPUTED"].includes(String(row.payment.status))).length,
      findUniqueOrThrow: async ({ where }: { where: { orderId: string } }) => ({ ...byOrder(where.orderId)!.payment, order: byOrder(where.orderId)!.order }),
      findMany: async () => records.map(row => ({ ...row.payment, order: row.order })),
      update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(records.find(row => row.payment.id === where.id)!.payment, data),
      updateMany: async ({ where, data }: { where: { id: string }; data: object }) => { Object.assign(records.find(row => row.payment.id === where.id)!.payment, data); return { count: 1 }; },
    },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { calls.audits.push(data.action); } },
  };
  const fixture = { prisma: { ...prisma, $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(prisma) }, connection,
    create: async () => {
      calls.posts++; assert.ok(records.length); assert.ok(records.at(-1)!.payment.submissionStartedAt);
      if (controls.uncertain) throw new Error("uncertain synthetic private response");
      return records.at(-1)!.payment.method === "card" ? { checkoutSessionId: "synthetic-session", checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show?id=synthetic-session", status: "ACTIVE" }
        : { pixQrCodeId: "synthetic-qr", pixCode: "synthetic-pix", pixExpiresAt: new Date(Date.now() + 7200000).toISOString() };
    },
    retrieve: async () => { calls.gets++; return controls.remote; }, list: async () => { calls.gets++; return controls.remote ? [controls.remote] : []; },
    select: (payments: unknown[]) => payments[0] ?? null,
    bind: () => { if (controls.badBinding) throw new Error("wrong amount or resource"); },
  };
  const loaded = { exports: {} as {
    createAsaasSandboxPayment: (input: object, userId: string) => Promise<unknown>;
    refreshAsaasSandboxPayment: (orderId: string) => Promise<unknown>;
  } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    URL, Buffer, console, crypto: webcrypto, process: { env: { AUTH_URL: "https://example.com" } }, fixture });
  const input = { productId: product.id, method: "pix", requestId: "123e4567-e89b-42d3-a456-426614174000" };
  return { ...loaded.exports, input, connection, product, calls, controls, records,
    remote: (status = "RECEIVED", billingType = "PIX") => ({ id: "pay_synthetic", value: 4.99, netValue: 4.5, billingType, status, pixQrCodeId: "synthetic-qr", checkoutSession: "synthetic-session", refunds: [] }) };
}

test("Sandbox creation persists binding before one POST, with no stock, customer, cashback or commercial message", async () => {
  const f = await harness(); await f.createAsaasSandboxPayment(f.input, "synthetic-admin");
  assert.equal(f.calls.posts, 1); assert.equal(f.product.stock, 4);
  const { order, payment } = f.records[0];
  assert.equal(order.customerId, null); assert.equal(order.customerEmail, "homologacao@example.invalid");
  assert.equal(order.cashbackEarnedCents, 0); assert.equal(order.cashbackRedeemedCents, 0);
  assert.equal(payment.provider, "asaas"); assert.equal(payment.environment, "test"); assert.equal(payment.stockReserved, false);
  assert.equal(payment.status, "PENDING"); assert.equal(payment.pixQrCodeId, "synthetic-qr");
  await f.createAsaasSandboxPayment(f.input, "synthetic-admin"); assert.equal(f.calls.posts, 1); assert.equal(f.records.length, 1);
});

test("uncertain financial submission is never repeated by refresh, same request or another request", async () => {
  const f = await harness(); f.controls.uncertain = true;
  await assert.rejects(f.createAsaasSandboxPayment(f.input, "synthetic-admin"));
  assert.equal(f.records[0].payment.status, "UNKNOWN");
  await f.createAsaasSandboxPayment(f.input, "synthetic-admin");
  await f.refreshAsaasSandboxPayment("order-0");
  await assert.rejects(f.createAsaasSandboxPayment({ ...f.input, requestId: "123e4567-e89b-42d3-a456-426614174001" }, "synthetic-admin"));
  assert.equal(f.calls.posts, 1); assert.equal(f.calls.gets, 0);
});

test("test preparation rejects real environment, absent webhook, assisted items and stale prices without POST", async () => {
  for (const mutation of ["production", "webhook", "controlled", "stock", "price"] as const) {
    const f = await harness();
    if (mutation === "production") f.connection.environment = "production";
    if (mutation === "webhook") f.connection.secrets.webhookId = "";
    if (mutation === "controlled") f.product.prescriptionType = "CONTROLLED";
    if (mutation === "stock") f.product.stock = 0;
    if (mutation === "price") f.product.price = "101.00";
    await assert.rejects(f.createAsaasSandboxPayment(f.input, "synthetic-admin")); assert.equal(f.calls.posts, 0);
  }
});

test("empty canonical payment list retains pending QR and two hour deadline", async () => {
  const f = await harness(); await f.createAsaasSandboxPayment(f.input, "synthetic-admin");
  await f.refreshAsaasSandboxPayment("order-0");
  assert.equal(f.records[0].payment.status, "PENDING"); assert.equal(f.records[0].payment.pixCode, "synthetic-pix");
  assert.equal(f.calls.posts, 1); assert.equal(f.calls.gets, 1);
});

test("canonical receipt applies once; Pix confirmed stays pending and card confirmed has no settled funds", async () => {
  for (const method of ["pix", "card"] as const) {
    const f = await harness(); await f.createAsaasSandboxPayment({ ...f.input, method }, "synthetic-admin");
    f.controls.remote = f.remote("CONFIRMED", method === "pix" ? "PIX" : "CREDIT_CARD");
    await f.refreshAsaasSandboxPayment("order-0");
    assert.equal(f.records[0].payment.status, method === "pix" ? "PENDING" : "PAID");
    assert.equal(f.records[0].payment.fundsAvailable, false);
    f.controls.remote = f.remote("RECEIVED", method === "pix" ? "PIX" : "CREDIT_CARD");
    await f.refreshAsaasSandboxPayment("order-0"); await f.refreshAsaasSandboxPayment("order-0");
    assert.equal(f.records[0].order.paymentStatus, "PAID"); assert.equal(f.records[0].payment.fundsAvailable, true);
    assert.equal(f.records[0].payment.providerOrderId, "pay_synthetic"); assert.equal(f.product.stock, 4);
  }
});

test("late receipt of canceled order records review without resurrecting fulfillment", async () => {
  const f = await harness(); await f.createAsaasSandboxPayment(f.input, "synthetic-admin");
  Object.assign(f.records[0].order, { status: "CANCELED", paymentStatus: "CANCELED" });
  f.records[0].payment.status = "CANCELED"; f.controls.remote = f.remote();
  await f.refreshAsaasSandboxPayment("order-0");
  assert.equal(f.records[0].payment.status, "REVIEW"); assert.equal(f.records[0].order.status, "CANCELED");
  assert.equal(f.records[0].order.paymentStatus, "CANCELED");
});

test("mismatched account or canonical resource cannot approve an order", async () => {
  for (const mismatch of ["account", "binding"] as const) {
    const f = await harness(); await f.createAsaasSandboxPayment(f.input, "synthetic-admin"); f.controls.remote = f.remote();
    if (mismatch === "account") f.connection.accountId = "other-wallet"; else f.controls.badBinding = true;
    await assert.rejects(f.refreshAsaasSandboxPayment("order-0")); assert.equal(f.records[0].order.paymentStatus, "PENDING");
  }
});

test("a delayed card confirmation never erases settled funds, while canonical refunds still remove them", async () => {
  const f = await harness(); await f.createAsaasSandboxPayment({ ...f.input, method: "card" }, "synthetic-admin");
  f.controls.remote = f.remote("RECEIVED", "CREDIT_CARD"); await f.refreshAsaasSandboxPayment("order-0");
  f.controls.remote = f.remote("CONFIRMED", "CREDIT_CARD"); await f.refreshAsaasSandboxPayment("order-0");
  assert.equal(f.records[0].payment.fundsAvailable, true);
  f.controls.remote = f.remote("REFUNDED", "CREDIT_CARD"); await f.refreshAsaasSandboxPayment("order-0");
  assert.equal(f.records[0].payment.fundsAvailable, false); assert.equal(f.records[0].payment.status, "REFUNDED");
});
