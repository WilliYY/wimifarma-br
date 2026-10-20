import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

const bundle = build({ entryPoints: ["src/features/orders/item-shortage-service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "shortage-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/(cashback|club|store-credit)\/wallet$|features\/supplier-catalog\/inventory$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export const lockCashbackAccount=async()=>{globalThis.f.calls.push('cashback');return {id:'c'}}; export const lockStoreCreditAccount=async()=>{globalThis.f.calls.push('credit');return {id:'s',balanceCents:0,reviewRequired:false}}; export const lockWimicoinAccount=async()=>{globalThis.f.calls.push('coins');return {id:'w'}}; export const releaseSupplierShortage=async()=>{globalThis.f.calls.push('offer')};` }));
} }] });

async function fixture() {
  const calls: string[] = []; const writes: unknown[] = [];
  const item = { id: "item", productName: "Sintético", productSlug: "sintetico", inventorySource: "DISTRIBUTOR", quantity: 3, totalCents: 300, cashbackDiscountCents: 30, wimicoinsDiscountPoints: 30, storeCreditDiscountCents: 30, cashbackEarnedCents: 7, wimicoinsEarnedPoints: 5 };
  const order = { id: "order", number: "TEST", customerId: "customer", paymentStatus: "PAID", status: "PREPARING", onlinePayment: null, updatedAt: new Date("2026-10-20T10:00:00Z"), items: [item], subtotalCents: 300, deliveryFeeCents: 0, totalCents: 210, cashbackRedeemedCents: 30, wimicoinsRedeemedPoints: 30, storeCreditRedeemedCents: 30 };
  let row: Record<string, unknown> | null = null;
  const tx = { $queryRaw: async (strings: TemplateStringsArray) => { calls.push(strings.join("").includes('"Customer"') ? "customer" : "order"); }, user: { findUnique: async () => ({ isActive: true, role: "ADMIN" }) }, customer: { findUnique: async () => ({ id: "customer" }) }, order: { findUnique: async () => order, update: async (args: unknown) => { writes.push(args); } }, orderItem: { update: async (args: unknown) => { writes.push(args); } }, orderItemShortage: { findMany: async () => [], findUnique: async () => row, create: async ({data}: {data: Record<string, unknown>}) => row = { ...data, id: "shortage", orderItem: item, status: "PROPOSED", creditState: "NONE", version: 1, createdAt: new Date(), decidedAt: null }, update: async ({data}: {data: Record<string, unknown>}) => { row = { ...row, ...data, version: Number(row!.version) + 1 }; return row; } }, auditLog: { create: async () => {} }, storeCreditTransaction: { create: async (args: unknown) => { writes.push(args); } }, storeCreditAccount: { update: async (args: unknown) => { writes.push(args); } }, cashbackTransaction: { create: async (args: unknown) => { writes.push(args); } }, cashbackAccount: { update: async (args: unknown) => { writes.push(args); } }, wimicoinTransaction: { create: async (args: unknown) => { writes.push(args); } }, wimicoinAccount: { update: async (args: unknown) => { writes.push(args); } } };
  type Service = { proposeItemShortage: (tx: unknown, input: unknown) => Promise<Record<string, unknown>>; decideItemShortage: (tx: unknown, input: unknown) => Promise<Record<string, unknown>> };
  const loaded = { exports: {} as Service };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), console, f: { calls } });
  const propose = () => loaded.exports.proposeItemShortage(tx, { orderId: "order", orderItemId: "item", quantity: 1, expectedUpdatedAt: order.updatedAt.toISOString(), actorId: "admin" });
  const decide = (override = {}) => loaded.exports.decideItemShortage(tx, { orderId: "order", shortageId: "shortage", version: 1, decision: "ACCEPT_CREDIT", consent: true, customerId: "customer", ...override });
  return { calls, writes, item, order, tx, propose, decide };
}

test("aceite usa locks ordenados, snapshots imutáveis e replay sem nova movimentação", async () => {
  const f = await fixture(); const before = JSON.stringify(f.item);
  const proposed = await f.propose(); assert.equal(proposed.cashPaidCents, 70);
  await f.decide(); assert.deepEqual(f.calls, ["order", "customer", "order", "customer", "cashback", "credit", "coins", "offer"]);
  const issued = f.writes.filter((entry) => (entry as { data?: { kind?: string } }).data?.kind === "ISSUE") as { data: { amountCents: number } }[];
  assert.equal(issued.length, 1); assert.equal(issued[0].data.amountCents, 70);
  assert.equal(JSON.stringify(f.item), before);
  const count = f.writes.length; const replay = await f.decide(); assert.equal(replay.status, "CREDIT_ACCEPTED"); assert.equal(f.writes.length, count);
  await assert.rejects(f.decide({ decision: "REQUEST_REFUND" }), /mudou/);
});
test("reembolso apenas solicita e não movimenta carteiras; consentimento, titular e versão são obrigatórios", async () => {
  const f = await fixture(); await f.propose();
  await assert.rejects(f.decide({ consent: false }), /Confirme/);
  await assert.rejects(f.decide({ customerId: "other" }), /não encontrado/);
  await assert.rejects(f.decide({ version: 99 }), /mudou/);
  const row = await f.decide({ decision: "REQUEST_REFUND", consent: false }); assert.equal(row.status, "REFUND_REQUESTED"); assert.equal(row.creditState, "NONE");
  assert.deepEqual(f.calls, ["order", "customer", "order", "customer", "order", "order", "customer", "order", "customer"]);
});
test("ADMIN exclusivo, cliente ativo e etapa anterior à entrega são revalidados", async () => {
  const f = await fixture(); f.tx.user.findUnique = async () => ({ isActive: true, role: "MANAGER" }); await assert.rejects(f.propose(), /autorizado/);
  f.tx.user.findUnique = async () => ({ isActive: true, role: "ADMIN" }); f.order.status = "READY"; await assert.rejects(f.propose(), /permite/);
  f.order.status = "PREPARING"; Object.assign(f.tx.customer, { findUnique: async () => null }); await assert.rejects(f.propose(), /Conta indisponível/);
});

test("pagamento online sem confirmação vinculada ou com disputa não permite concessão", async () => {
  const f = await fixture(); Object.assign(f.order, { paymentMethod: "ONLINE" }); await assert.rejects(f.propose(), /permite/);
  Object.assign(f.order, { onlinePayment: { status: "PAID", environment: "production", statusDetail: "partially_refunded", financialReviewReason: null } }); await assert.rejects(f.propose(), /permite/);
  Object.assign(f.order, { onlinePayment: { status: "PAID", environment: "production", statusDetail: null, financialReviewReason: "DISPUTED" } }); await assert.rejects(f.propose(), /permite/);
});

test("falta total não propõe nem concede crédito de entrega parcial", async () => {
  const f = await fixture(); f.item.quantity = 1;
  await assert.rejects(f.propose(), /Sem itens para entrega/);
  f.item.quantity = 3; await f.propose();
  Object.assign(f.tx.orderItemShortage, { findMany: async () => [{ quantity: 3, orderItemId: "item", startUnit: 0 }] });
  const before = f.writes.length;
  await assert.rejects(f.decide(), /Sem itens para entrega/);
  assert.equal(f.writes.length, before);
});
