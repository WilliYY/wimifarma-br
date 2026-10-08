import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

// Synthetic transactions retain product locks until commit, detecting a wait cycle.
// No database, gateway or real network is used.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
type Gateway = "mercado-pago" | "asaas";
const bundles = new Map<Gateway, ReturnType<typeof build>>();
for (const gateway of ["mercado-pago", "asaas"] as const) {
  bundles.set(gateway, build({ entryPoints: [`src/features/payments/${gateway === "asaas" ? "asaas-commerce-service" : "service"}.ts`],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "stock-lock-fixture", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/headers$|lib\/secret-vault$|cashback\/(service|redemption)$|miauby\/commerce-service$|^\.\/(integration|asaas-integration|provider|asaas-provider|asaas-commerce-service)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path.endsWith("auth") ? "export const auth=async()=>null;" :
        args.path.endsWith("headers") ? "export const cookies=async()=>({get:()=>undefined});" :
        args.path.endsWith("prisma") ? "export const getPrisma=()=>fixture.prisma;" :
        args.path.endsWith("secret-vault") ? "export const encryptValue=value=>({ciphertext:value,iv:'synthetic',tag:'synthetic'}); export const decryptValue=value=>value.ciphertext;" :
        args.path.endsWith("integration") ? "export const readPaymentIntegration=async()=>fixture.connection; export const readAsaasIntegration=async()=>fixture.connection;" :
        args.path.endsWith("asaas-provider") ? "export const assertAsaasPaymentBinding=()=>{}; export const createAsaasPix=async()=>{throw new Error('synthetic stop before network');}; export const createAsaasCheckout=createAsaasPix; export const listAsaasPayments=async()=>[]; export const selectBoundAsaasPayment=()=>fixture.remote; export const retrieveAsaasPayment=async()=>fixture.remote;" :
        args.path.endsWith("provider") ? "export class MercadoPagoProviderError extends Error {} export const mercadoPagoRequest=async()=>{throw new Error('synthetic stop before network');};" :
        args.path.endsWith("asaas-commerce-service") ? "export const startAsaasCommercePayment=async()=>{}; export const refreshAsaasCommercePayment=async()=>{}; export const asaasCommercePaymentView=async()=>{};" :
        "export const settleOrderCashback=async()=>{}; export const settleOrderBenefits=async()=>{}; export const queueCommerceOrder=async()=>{};" }));
    } }] }));
}

function lockManager() {
  const owners = new Map<string, string>();
  const waiting = new Map<string, string>();
  const wake = new Map<string, () => void>();
  const traces = new Map<string, string[]>();
  return { traces, async acquire(transaction: string, productId: string) {
    const owner = owners.get(productId);
    if (owner && owner !== transaction) {
      waiting.set(transaction, owner);
      let dependency: string | undefined = owner;
      while (dependency) {
        if (dependency === transaction) throw new Error("synthetic stock deadlock");
        dependency = waiting.get(dependency);
      }
      await new Promise<void>(resolve => wake.set(transaction, resolve));
      waiting.delete(transaction);
    }
    owners.set(productId, transaction);
    traces.set(transaction, [...traces.get(transaction) ?? [], productId]);
    // Yield with the first lock held so the other transaction can request its first lock.
    await new Promise<void>(resolve => setImmediate(resolve));
  }, release(transaction: string) {
    for (const [id, owner] of owners) if (owner === transaction) owners.delete(id);
    for (const [id, owner] of waiting) if (owner === transaction) { wake.get(id)?.(); wake.delete(id); }
  } };
}

async function harness(gateway: Gateway, operation: "reserve" | "release", locks: ReturnType<typeof lockManager>) {
  const name = `${gateway}-${operation}`;
  const products = new Map(["A", "B"].map(id => [id, { id, status: "ACTIVE", stock: 5, price: "5.00", promotionalPrice: null,
    updatedAt: new Date(), requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "UNREVIEWED" }]));
  const items = ["B", "A"].map(productId => ({ productId, quantity: productId === "A" ? 2 : 1, unitPriceCents: 500, totalCents: productId === "A" ? 1000 : 500 }));
  const order: Data = { id: name, number: "SYNTHETIC", status: "PENDING", paymentStatus: "PENDING", createdAt: new Date(),
    customerEmail: "synthetic@example.invalid", requiresPrescriptionReview: false, items };
  const payment: Data = { id: name, orderId: name, provider: gateway, integrationId: gateway, environment: "production",
    accountId: "synthetic-account", integrationRevision: 1, amountCents: 1500, status: operation === "reserve" ? "NEW" : "PENDING",
    stockReserved: operation === "release", providerOrderId: null, providerUpdatedAt: null, method: "pix", createdAt: new Date(),
    pixQrCodeId: "synthetic-qr", idempotencyKey: name, lastCheckedAt: null };
  const connection = { accountId: payment.accountId, environment: "production", enabled: true, revision: 1,
    secrets: { methods: ["pix"], webhookId: "synthetic-hook", accessToken: "synthetic-token", pixAddressKey: "synthetic-key" } };
  const remote = gateway === "asaas" ? { id: "pay_synthetic", billingType: "PIX", status: "PENDING", deleted: true, value: 15, netValue: 14 }
    : { id: "ORDSYNTHETIC", external_reference: payment.id, total_amount: "15.00", user_id: payment.accountId,
      status: "canceled", last_updated_date: new Date().toISOString(), transactions: { payments: [{ amount: "15.00", status: "canceled", payment_method: {} }] } };
  const tx = { $queryRaw: async () => {}, paymentIntegration: { findUnique: async () => connection },
    order: { findUniqueOrThrow: async () => ({ ...order, onlinePayment: { ...payment } }), update: async ({ data }: Data) => Object.assign(order, data) },
    onlinePayment: { findUnique: async () => payment, findUniqueOrThrow: async () => ({ ...payment, order }),
      update: async ({ data }: Data) => Object.assign(payment, data), updateMany: async ({ data }: Data) => { Object.assign(payment, data); return { count: 1 }; } },
    product: { findUnique: async ({ where }: Data) => products.get(where.id),
      updateMany: async ({ where, data }: Data) => { await locks.acquire(name, where.id); products.get(where.id)!.stock -= data.stock.decrement; return { count: 1 }; },
      update: async ({ where, data }: Data) => { await locks.acquire(name, where.id); products.get(where.id)!.stock += data.stock.increment; } },
    auditLog: { create: async () => {} } };
  const fixture = { connection, remote, prisma: { ...tx, $transaction: async (callback: (value: Data) => Promise<unknown>) => {
    try { return await callback(tx); } finally { locks.release(name); }
  } } };
  const loaded = { exports: {} as Data };
  vm.runInNewContext((await bundles.get(gateway)!).outputFiles![0].text, { module: loaded, exports: loaded.exports,
    fixture, require: createRequire(import.meta.url), Buffer, URL, console, process });
  return { name, products, payment, items, async run() {
    if (operation === "release") return gateway === "asaas" ? loaded.exports.refreshAsaasCommercePayment(name) : loaded.exports.applyProviderOrder(remote);
    try {
      await (gateway === "asaas" ? loaded.exports.startAsaasCommercePayment : loaded.exports.startPayment)(name, { method: "pix", email: order.customerEmail });
      assert.fail("The provider fixture must stop submission after stock reservation");
    } catch (error) {
      assert.match((error as Error).message, /synthetic stop before network|A criação não foi confirmada/);
      assert.equal(payment.status, "UNKNOWN");
    }
  } };
}

for (const reserveGateway of ["mercado-pago", "asaas"] as const) for (const releaseGateway of ["mercado-pago", "asaas"] as const) {
  test(`concurrent ${reserveGateway} reserve and ${releaseGateway} release use the same product lock order`, async () => {
    const locks = lockManager();
    const reserve = await harness(reserveGateway, "reserve", locks);
    const release = await harness(releaseGateway, "release", locks);
    await Promise.all([reserve.run(), release.run()]);
    assert.deepEqual(locks.traces.get(reserve.name), ["A", "B"]);
    assert.deepEqual(locks.traces.get(release.name), ["A", "B"]);
    assert.equal(reserve.products.get("A")!.stock, 3); assert.equal(reserve.products.get("B")!.stock, 4);
    assert.equal(release.products.get("A")!.stock, 7); assert.equal(release.products.get("B")!.stock, 6);
    assert.equal(release.payment.stockReserved, false);
    await release.run();
    assert.deepEqual(locks.traces.get(release.name), ["A", "B"]);
    assert.deepEqual(release.items.map(item => item.productId), ["B", "A"]);
  });
}
