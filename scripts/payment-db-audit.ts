import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import { build } from "esbuild";
import { getPrisma } from "../src/lib/prisma";
import { encryptValue } from "../src/lib/secret-vault";
import { createCheckout } from "../src/features/orders/create-checkout";
import { checkoutRequestSchema } from "../src/features/orders/checkout";
import { processCommerceEvents } from "../src/features/miauby/commerce-service";

async function main() {
const url = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.PAYMENTS_DB_TEST !== "isolated-disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/wimifarma_payment_test") throw new Error("Disposable isolated database required");
process.env.AUTH_SECRET = "synthetic-test-auth-secret"; process.env.SECRET_VAULT_KEY = "synthetic-test-vault-secret";
const prisma = getPrisma();
const bundle = await build({ entryPoints: ["src/features/payments/service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-payment", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/headers$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>null;" : args.path.endsWith("headers") ? "export const cookies=async()=>({get:()=>undefined});" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
} }] });
type Remote = { id: string; type: string; external_reference: string; total_amount: string; country_code: string; user_id: string; status: string; status_detail: string; last_updated_date: string; transactions: { payments: { amount: string; status: string; status_detail: string; date_of_expiration?: string; payment_method: { id: string; type: string } }[] } };
type Api = { startPayment: (id: string, input: { method: "pix"; email: string } | { method: "card"; email: string; token: string; paymentMethodId: string; paymentType: "credit_card"; installments: number }) => Promise<unknown>; applyProviderOrder: (remote: Remote) => Promise<unknown>; refreshPayment: (id: string) => Promise<unknown>; cancelUnsubmittedPayment: (id: string) => Promise<void> };
const loaded = { exports: {} as Api }; let calls = 0; let failNetwork = false;
const remotes = new Map<string, Remote>(); const keys: string[] = []; const bodies: Record<string, unknown>[] = [];
const fetchFixture = async (_url: string, options: RequestInit) => {
  calls++; const body = JSON.parse(String(options.body)); bodies.push(body); const key = new Headers(options.headers).get("X-Idempotency-Key")!; keys.push(key);
  if (failNetwork) { failNetwork = false; throw new Error("synthetic network failure"); }
  const remote: Remote = { id: `ORD${body.external_reference.toUpperCase()}`, type: "online", external_reference: body.external_reference, total_amount: body.total_amount, country_code: "BRA", user_id: "123", status: "action_required", status_detail: "waiting_transfer", last_updated_date: "2026-09-29T12:00:00Z", transactions: { payments: [{ amount: body.total_amount, status: "action_required", status_detail: "waiting_transfer", payment_method: { id: "pix", type: "bank_transfer" } }] } };
  remote.transactions.payments[0].payment_method = { id: body.transactions.payments[0].payment_method.id, type: body.transactions.payments[0].payment_method.type };
  if (body.transactions.payments[0].payment_method.id === "pix") {
    assert.equal(body.transactions.payments[0].expiration_time, "PT2H");
    remote.transactions.payments[0].date_of_expiration = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
  }
  remotes.set(body.external_reference, remote); return new Response(JSON.stringify(remote));
};
vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, Headers, AbortSignal, console, process, Buffer, fetch: fetchFixture, fixture: { prisma } });
const api = loaded.exports;
const input = (productId: string, requestId = crypto.randomUUID()) => checkoutRequestSchema.parse({ customer: { name: "Pessoa de teste", email: "buyer@example.com", phone: "44999990000" }, fulfillmentMethod: "PICKUP", paymentMethod: "ONLINE", privacyConsent: true, checkoutRequestId: requestId, items: [{ productId, quantity: 1, expectedUnitPriceCents: 1000 }] });
const makeOrder = (productId: string) => prisma.$transaction(tx => createCheckout(tx, input(productId)));
const pay = (orderId: string) => api.startPayment(orderId, { method: "pix", email: "buyer@example.com" });
const stock = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;
try {
  assert.equal(await prisma.order.count(), 0, "database must start empty");
  assert.equal(await prisma.miaubyEvent.count(), 0, "commerce outbox must start empty");
  await prisma.miaubyConfig.create({ data: { id: "commerce", enabled: true, cartAlerts: true, orderAlerts: true, paymentAlerts: true } });
  await prisma.paymentIntegration.create({ data: { id: "mercado-pago", enabled: true, environment: "production", publicKey: "synthetic-public-key", accountId: "123", ...encryptValue(JSON.stringify({ accessToken: "synthetic-access-token", webhookSecret: "synthetic-webhook-secret" })) } });
  const product = await prisma.product.create({ data: { name: "Produto sintético", slug: "payment-db-audit", price: 10, stock: 1, status: "ACTIVE" } });
  const duplicateInput = input(product.id);
  const duplicates = await Promise.all([prisma.$transaction(tx => createCheckout(tx, duplicateInput)), prisma.$transaction(tx => createCheckout(tx, duplicateInput))]);
  assert.equal(duplicates[0].id, duplicates[1].id); assert.equal(await prisma.order.count(), 1);
  assert.equal(await prisma.miaubyEvent.count({ where: { key: `order:${duplicates[0].id}` } }), 1, "duplicate checkout creates one order alert");
  const second = await makeOrder(product.id);
  const results = await Promise.allSettled([pay(duplicates[0].id), pay(second.id)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(await stock(product.id), 0); assert.equal(calls, 1);
  const active = await prisma.onlinePayment.findFirstOrThrow({ where: { status: "PENDING" } });
  assert.equal(active.pixExpiresAt?.toISOString(), remotes.get(active.id)!.transactions.payments[0].date_of_expiration, "canonical Pix expiry is persisted");
  await Promise.all([pay(active.orderId), pay(active.orderId)]); assert.equal(calls, 1, "same payment is not charged twice");
  assert.equal((await prisma.onlinePayment.findUniqueOrThrow({ where: { id: active.id } })).pixExpiresAt?.getTime(), active.pixExpiresAt?.getTime(), "reload and repeated submission do not extend Pix validity");
  const pending = remotes.get(active.id)!;
  const paid: Remote = { ...pending, status: "processed", status_detail: "accredited", last_updated_date: "2026-09-29T12:01:00Z", transactions: { payments: [{ ...pending.transactions.payments[0], status: "processed", status_detail: "accredited" }] } };
  await Promise.all([api.applyProviderOrder(paid), api.applyProviderOrder(paid)]);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: active.orderId } })).paymentStatus, "PAID");
  assert.equal(await prisma.miaubyEvent.count({ where: { key: `order:${active.orderId}` } }), 1, "order alert remains unique");
  assert.equal(await prisma.miaubyEvent.count({ where: { key: `payment:${active.orderId}` } }), 1, "duplicate gateway confirmations create one payment alert");
  const sentEvents: string[] = [];
  const sendMock: Parameters<typeof processCommerceEvents>[1] = async event => {
    sentEvents.push(event.id);
    return { ok: true, eventId: event.id, status: "accepted", messageId: `synthetic-${event.id}`, accepted: true, delivered: null, uncertain: false, duplicate: false, retryable: false };
  };
  await processCommerceEvents(prisma, sendMock);
  await processCommerceEvents(prisma, sendMock);
  assert.equal(sentEvents.length, 3, "two orders and one gateway payment are sent exactly once without network");
  assert.equal(new Set(sentEvents).size, sentEvents.length);
  assert.equal(await prisma.miaubyEvent.count({ where: { status: "SENT" } }), 3);
  await api.applyProviderOrder(pending); assert.equal((await prisma.onlinePayment.findUniqueOrThrow({ where: { id: active.id } })).status, "PAID");
  await api.applyProviderOrder({ ...paid, status: "refunded", status_detail: "refunded", last_updated_date: "2026-09-29T12:02:00Z" });
  assert.equal(await stock(product.id), 0, "refund does not assert physical return");
  await prisma.product.update({ where: { id: product.id }, data: { stock: 2 } });
  const canceled = await makeOrder(product.id); await pay(canceled.id); const canceledPayment = await prisma.onlinePayment.findUniqueOrThrow({ where: { orderId: canceled.id } });
  const cancellation = { ...remotes.get(canceledPayment.id)!, status: "canceled", status_detail: "canceled", last_updated_date: "2026-09-29T12:03:00Z" };
  await Promise.all([api.applyProviderOrder(cancellation), api.applyProviderOrder(cancellation)]); assert.equal(await stock(product.id), 2, "reservation restored exactly once");
  const uncertain = await makeOrder(product.id); failNetwork = true; await assert.rejects(pay(uncertain.id)); assert.equal(await stock(product.id), 1);
  const unknown = await prisma.onlinePayment.findUniqueOrThrow({ where: { orderId: uncertain.id } }); assert.equal(unknown.status, "UNKNOWN"); assert.ok(unknown.requestCiphertext); assert.doesNotMatch(unknown.requestCiphertext, /buyer@example/);
  await prisma.onlinePayment.update({ where: { id: unknown.id }, data: { lastCheckedAt: new Date(0) } });
  await api.refreshPayment(uncertain.id); assert.equal(keys.at(-1), keys.at(-2), "unknown retries retain the same key"); assert.equal(await stock(product.id), 1);
  const refreshed = await prisma.onlinePayment.findUniqueOrThrow({ where: { id: unknown.id } }); assert.equal(refreshed.requestCiphertext, null);
  const beforeCalls = calls; const draft = await makeOrder(product.id); await api.cancelUnsubmittedPayment(draft.id); assert.equal(calls, beforeCalls); assert.equal(await stock(product.id), 1);
  const card = await makeOrder(product.id);
  await api.startPayment(card.id, { method: "card", email: "buyer@example.com", token: "synthetic-card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 12 });
  assert.equal((bodies.at(-1) as { transactions: { payments: { payment_method: { installments: number } }[] } }).transactions.payments[0].payment_method.installments, 12, "selected installment count reaches the gateway unchanged");
  assert.equal((await prisma.onlinePayment.findUniqueOrThrow({ where: { orderId: card.id } })).pixExpiresAt, null, "card has no Pix expiration");
  await prisma.product.update({ where: { id: product.id }, data: { stock: 2 } });
  const manual = { ...input(product.id), paymentMethod: "CASH" as const };
  const manualDuplicates = await Promise.all([prisma.$transaction(tx => createCheckout(tx, manual)), prisma.$transaction(tx => createCheckout(tx, manual))]);
  assert.equal(manualDuplicates[0].id, manualDuplicates[1].id, "guest manual checkout is also idempotent");
  console.log("PASS: idempotent online/manual checkout, stock concurrency, canonical 2h Pix expiration and reload, card installments, commerce deduplication, stale events, refund, single release, uncertain retry, cancellation");
} finally { await prisma.$disconnect(); }
}
void main().catch(error => { console.error("Payment database audit failed", error); process.exitCode = 1; });
