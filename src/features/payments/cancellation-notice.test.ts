import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

// Synthetic records and serialized transactions; no database, gateway or transport.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
const bundle = build({ entryPoints: ["src/features/payments/service.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "cancellation-fixture", setup(builder) {
    builder.onResolve({ filter: /auth\/auth$|lib\/prisma$|cashback\/(service|redemption)$|store-credit\/service$|miauby\/commerce-service$|supplier-catalog\/inventory$|^\.\/(integration|asaas-commerce-service)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>fixture.prisma;"
      : "export const auth=async()=>null; export const settleOrderCashback=async()=>{}; export const settleOrderBenefits=async()=>{}; export const settleIssuedStoreCredits=async()=>{}; export const queueCommerceOrder=async()=>{}; export const comparePaymentInventoryItems=()=>0; export const validateSupplierPayment=async()=>{}; export const readPaymentIntegration=async()=>null; export const startAsaasCommercePayment=async()=>{}; export const refreshAsaasCommercePayment=async()=>{}; export const asaasCommercePaymentView=async()=>{};" }));
  } }] });

async function harness(options: { environment?: string; enabled?: boolean; alerts?: boolean; status?: string; orderStatus?: string } = {}) {
  const order: Data = { id: "synthetic-order", number: "TEST-CANCEL", customerPhone: "(11) 99999-0000", fulfillmentMethod: "PICKUP", status: options.orderStatus ?? "PENDING", paymentStatus: "PENDING", items: [] };
  const payment: Data = { id: "synthetic-payment", orderId: order.id, provider: "mercado-pago", accountId: "synthetic-account", amountCents: 10000,
    providerOrderId: "ORDSYNTHETIC1", environment: options.environment ?? "production", status: options.status ?? "PENDING", stockReserved: false };
  const events: Data[] = [];
  let inTransaction = false;
  const tx = {
    $queryRaw: async () => [],
    onlinePayment: { findUnique: async () => ({ ...payment }), findUniqueOrThrow: async () => ({ ...payment, order: { ...order } }), update: async ({ data }: Data) => Object.assign(payment, data) },
    order: { update: async ({ data }: Data) => Object.assign(order, data) }, auditLog: { create: async () => ({}) },
    miaubyConfig: { findUnique: async () => ({ enabled: options.enabled ?? true, customerStatusAlerts: options.alerts ?? true }) },
    miaubyEvent: { upsert: async ({ create }: Data) => {
      assert.equal(inTransaction, true); assert.equal(order.status, "CANCELED");
      const existing = events.find(event => event.key === create.key);
      if (existing) return existing;
      const event = { status: "PENDING", ...create }; events.push(event); return event;
    } },
  };
  let queue = Promise.resolve();
  const fixture = { prisma: { ...tx, $transaction: (callback: (tx: Data) => Promise<unknown>) => {
    const result = queue.then(async () => { inTransaction = true; try { return await callback(tx); } finally { inTransaction = false; } });
    queue = result.then(() => undefined, () => undefined); return result;
  } } };
  const loaded = { exports: {} as { applyProviderOrder(remote: Data): Promise<unknown>; cancelUnsubmittedPayment(id: string): Promise<unknown> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, fixture,
    require: createRequire(import.meta.url), console, Buffer, process, Date });
  let revision = 0;
  const apply = (status = "canceled", detail = "expired") => loaded.exports.applyProviderOrder({ id: payment.providerOrderId, external_reference: payment.id,
    user_id: payment.accountId, total_amount: "100.00", status, status_detail: detail, last_updated_date: new Date(Date.UTC(2026, 9, 23, 0, 0, ++revision)).toISOString(),
    transactions: { payments: [{ amount: "100.00", status, status_detail: detail, payment_method: {} }] } });
  return { ...loaded.exports, order, payment, events, apply };
}

test("Mercado Pago cancellation queues the real customer outbox once in its transaction", async () => {
  const f = await harness();
  await Promise.all([f.apply(), f.apply()]);
  assert.equal(f.order.status, "CANCELED"); assert.equal(f.events.length, 1);
  assert.equal(f.events[0].recipient, "5511999990000");
  assert.equal(f.events[0].orderId, f.order.id); assert.equal(f.events[0].orderStatus, "CANCELED");
  assert.equal(f.events[0].status, "PENDING");
  assert.match(f.events[0].text, /eventual reembolso.*separadamente/);
});

test("failed/refunded/disputed payments notify only an actual canceled order transition", async () => {
  for (const [status, detail] of [["failed", "rejected"], ["refunded", "refunded"], ["charged_back", "charged_back"]]) {
    const f = await harness(); await f.apply(status, detail); await f.apply(status, detail);
    assert.equal(f.order.status, "CANCELED"); assert.equal(f.events.length, 1);
  }
  const existing = await harness({ orderStatus: "CANCELED" }); await existing.apply(); assert.equal(existing.events.length, 0);
});

test("NEW cancellation queues once and repetition retains the existing refusal", async () => {
  const f = await harness({ status: "NEW" });
  await f.cancelUnsubmittedPayment(f.order.id);
  await assert.rejects(f.cancelUnsubmittedPayment(f.order.id), /já foi iniciado/);
  assert.equal(f.events.length, 1); assert.equal(f.events[0].recipient, "5511999990000");
  const existing = await harness({ status: "NEW", orderStatus: "CANCELED" });
  await existing.cancelUnsubmittedPayment(existing.order.id); assert.equal(existing.events.length, 0);
});

test("disabled alerts and test payments never queue customer cancellation messages", async () => {
  for (const options of [{ enabled: false }, { alerts: false }, { environment: "test" }]) {
    const remote = await harness(options); await remote.apply(); assert.equal(remote.events.length, 0);
    const local = await harness({ ...options, status: "NEW" }); await local.cancelUnsubmittedPayment(local.order.id); assert.equal(local.events.length, 0);
  }
  const paid = await harness({ status: "PAID" }); await paid.apply(); assert.equal(paid.order.status, "PENDING"); assert.equal(paid.events.length, 0);
});
