import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import type { BridgeResult, CommerceState, CommerceType } from "./commerce-rules";

type Api = Pick<typeof import("./commerce-service"), "queueCommerceOrder" | "processCommerceEvents">;
type Settings = { enabled: boolean; cartAlerts: boolean; orderAlerts: boolean; paymentAlerts: boolean; customerStatusAlerts?: boolean };
type Event = { id: string; key: string; type: CommerceType; text: string; recipient?: string | null; orderId?: string | null; orderStatus?: string | null; status: CommerceState; attempts: number; createdAt: Date; availableAt: Date; leaseExpiresAt: Date | null; lastError?: string | null; messageId?: string | null; sentAt?: Date | null };
type Where = { id?: string; key?: string; type?: string | { in: string[] }; status?: string | { in: string[] }; createdAt?: { lt: Date }; availableAt?: { lte: Date }; leaseExpiresAt?: { lt: Date } };
type Data = Partial<Omit<Event, "attempts">> & { attempts?: { increment: number } };
const enabled: Settings = { enabled: true, cartAlerts: true, orderAlerts: true, paymentAlerts: true };
const order = { id: "synthetic-order", number: "TEST-001", totalCents: 1000, fulfillmentMethod: "PICKUP", items: [{ name: "Produto sintético", quantity: 1 }] };
const bundlePromise = build({ entryPoints: ["src/features/miauby/commerce-service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "commerce-fixture", setup(builder) {
  builder.onResolve({ filter: /lib\/prisma$|commerce-provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('Database not injected');};" : "export const commerceConnection=()=>null; export const commerceTransportStatus=async()=>null; export const sendCommerceEvent=async()=>{throw new Error('Transport not injected');};" }));
} }] });

async function fixture(settings: Settings | null = enabled, initial: Partial<Event>[] = [], loseClaim = false, beforeClaim?: (event: Event) => void) {
  const bundle = await bundlePromise;
  const events: Event[] = initial.map((event, index) => ({ id: `event-${index}`, key: `key-${index}`, type: "order", text: "synthetic", status: "PENDING", attempts: 0, createdAt: new Date(), availableAt: new Date(0), leaseExpiresAt: null, ...event }));
  const orderState = { status: "READY", paymentStatus: "PAID", paymentMethod: "CASH", fulfillmentMethod: "PICKUP", requiresPrescriptionReview: false, prescriptionReviewedAt: null as Date | null,
    onlinePayment: null as null | { status: string; environment: string; financialReviewReason?: string | null; statusDetail?: string | null } };
  const matches = (event: Event, where: Where) => (!where.id || event.id === where.id) && (!where.key || event.key === where.key)
    && (!where.type || (typeof where.type === "string" ? event.type === where.type : where.type.in.includes(event.type)))
    && (!where.status || (typeof where.status === "string" ? event.status === where.status : where.status.in.includes(event.status)))
    && (!where.createdAt || event.createdAt < where.createdAt.lt) && (!where.availableAt || event.availableAt <= where.availableAt.lte)
    && (!where.leaseExpiresAt || Boolean(event.leaseExpiresAt && event.leaseExpiresAt < where.leaseExpiresAt.lt));
  const apply = (event: Event, data: Data) => { const { attempts, ...rest } = data; Object.assign(event, rest); if (attempts) event.attempts += attempts.increment; };
  const db = {
    order: { findUnique: async () => orderState },
    miaubyConfig: { findUnique: async () => settings },
    miaubyEvent: {
      upsert: async ({ where, create }: { where: { key: string }; create: { key: string; type: CommerceType; text: string } }) => {
        let event = events.find(item => item.key === where.key);
        if (!event) { event = { id: `queued-${events.length}`, status: "PENDING", attempts: 0, createdAt: new Date(), availableAt: new Date(0), leaseExpiresAt: null, ...create }; events.push(event); }
        return event;
      },
      findMany: async ({ where }: { where: Where }) => events.filter(event => matches(event, where)).map(event => ({ ...event })),
      findUnique: async ({ where }: { where: Where }) => events.find(event => matches(event, where)) ?? null,
      updateMany: async ({ where, data }: { where: Where; data: Data }) => {
        if (loseClaim && where.id && data.status === "PROCESSING") return { count: 0 };
        const found = events.filter(event => matches(event, where));
        if (where.id && data.status === "PROCESSING") found.forEach(event => beforeClaim?.(event));
        found.forEach(event => apply(event, data)); return { count: found.length };
      },
      update: async ({ where, data }: { where: Where; data: Data }) => { const event = events.find(item => matches(item, where))!; apply(event, data); return event; },
      deleteMany: async ({ where }: { where: Where }) => { const found = events.filter(event => matches(event, where)); found.forEach(event => events.splice(events.indexOf(event), 1)); return { count: found.length }; },
    },
  };
  const loaded = { exports: {} as Api };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Date, process, console });
  const api = loaded.exports;
  const queue = (type: "order" | "payment", isTest = false, snapshot: Parameters<Api["queueCommerceOrder"]>[2] = order) => api.queueCommerceOrder(db as unknown as Parameters<Api["queueCommerceOrder"]>[0], type, snapshot, isTest);
  const processEvents = (send: Parameters<Api["processCommerceEvents"]>[1]) => api.processCommerceEvents(db as unknown as Parameters<Api["processCommerceEvents"]>[0], send);
  return { events, queue, processEvents, orderState };
}
const accepted = (id: string): BridgeResult => ({ ok: true, eventId: id, status: "accepted", messageId: "synthetic-message", accepted: true, delivered: null, uncertain: false, duplicate: false, retryable: false });
const blocked = (id: string): BridgeResult => ({ ...accepted(id), ok: false, status: "blocked", messageId: null, accepted: false, retryable: true });

test("etapa de cliente congela destinatário e envio incerto não é repetido", async () => {
  const f = await fixture({ ...enabled, customerStatusAlerts: true });
  f.events.push({ id: "customer-stage", key: "customer-status:v1:synthetic:READY", type: "order_status", orderId: "synthetic", orderStatus: "READY", text: "Etapa sintética", recipient: "5511999990000", status: "PENDING", attempts: 0, createdAt: new Date(), availableAt: new Date(0), leaseExpiresAt: null });
  let sends = 0;
  await f.processEvents(async event => { sends++; assert.equal(event.recipient, "5511999990000"); throw new Error("ambiguous timeout"); });
  assert.equal(f.events[0].status, "UNCERTAIN");
  await f.processEvents(async event => { sends++; return accepted(event.id); });
  assert.equal(sends, 1);
});

test("desativação após o claim cancela aviso de cliente antes de invocar transporte", async () => {
  const settings = { ...enabled, customerStatusAlerts: true };
  const f = await fixture(settings, [], false, () => { settings.customerStatusAlerts = false; });
  f.events.push({ id: "customer-stage", key: "customer-status:v1:synthetic:READY", type: "order_status", text: "Etapa sintética", recipient: "5511999990000", status: "PENDING", attempts: 0, createdAt: new Date(), availableAt: new Date(0), leaseExpiresAt: null });
  let sends = 0;
  await f.processEvents(async event => { sends++; return accepted(event.id); });
  assert.equal(sends, 0);
  assert.equal(f.events[0].status, "FAILED");
});

test("etapa superada, cancelamento, revisão, sandbox e receita pendente suspendem aviso antes do transporte", async () => {
  for (const change of [
    { status: "CANCELED" }, { status: "COMPLETED" }, { paymentStatus: "REFUNDED" },
    { paymentMethod: "ONLINE", onlinePayment: { status: "PAID", environment: "production", financialReviewReason: "amount_mismatch" } },
    { paymentMethod: "ONLINE", onlinePayment: { status: "PAID", environment: "test" } },
    { paymentMethod: "ONLINE", onlinePayment: { status: "REFUNDED", environment: "production" } },
    { requiresPrescriptionReview: true, prescriptionReviewedAt: null },
  ]) {
    const f = await fixture({ ...enabled, customerStatusAlerts: true }, [{ type: "order_status", orderId: "synthetic", orderStatus: "READY", recipient: "5511999990000" }]);
    Object.assign(f.orderState, change);
    let sends = 0;
    await f.processEvents(async event => { sends++; return accepted(event.id); });
    assert.equal(sends, 0, JSON.stringify(change));
    assert.equal(f.events[0].status, "FAILED");
  }
});

test("etapa de cliente ainda válida envia uma vez com vínculo explícito", async () => {
  const f = await fixture({ ...enabled, customerStatusAlerts: true }, [{ type: "order_status", orderId: "synthetic", orderStatus: "READY", recipient: "5511999990000" }]);
  let sends = 0;
  await f.processEvents(async event => { sends++; return accepted(event.id); });
  assert.equal(f.events[0].status, "SENT");
  await f.processEvents(async event => { sends++; return accepted(event.id); });
  assert.equal(sends, 1);
});

test("queue respects absent, disabled and per-type settings", async () => {
  for (const settings of [null, { ...enabled, enabled: false }, { ...enabled, orderAlerts: false, paymentAlerts: false }]) {
    const f = await fixture(settings); await f.queue("order"); await f.queue("payment"); assert.equal(f.events.length, 0);
  }
});
test("order and payment keys deduplicate repeated transactional queues", async () => {
  const f = await fixture(); await f.queue("order"); await f.queue("order"); await f.queue("payment", true); await f.queue("payment", true);
  assert.deepEqual(f.events.map(event => event.key), ["order:synthetic-order", "payment:synthetic-order"]);
  assert.match(f.events[0].text, /não confirma pagamento/); assert.match(f.events[1].text, /TESTE — sem compra real/);
});
test("order outbox freezes procurement details from creation when repeated queues provide different data", async () => {
  const f = await fixture();
  const snapshot = { ...order, items: [{ name: "Produto sintético", quantity: 3, ean: "7890000000001", inventorySource: "DISTRIBUTOR", supplierCode: "PROFARMA" }] };
  await f.queue("order", false, snapshot);
  const original = f.events[0].text;
  await f.queue("order", false, { ...snapshot, items: [{ ...snapshot.items[0], ean: "7890000000002", supplierCode: "ANB" }] });
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0].text, original);
  assert.match(original, /3 × Produto sintético · EAN: 7890000000001 · Fornecedor: PROFARMA/);
  assert.doesNotMatch(original, /7890000000002|Fornecedor: ANB/);
});
test("disabled dispatcher sends only explicit test events", async () => {
  const f = await fixture({ ...enabled, enabled: false }, [{ type: "cart" }, { type: "order" }, { type: "payment" }, { type: "test" }]);
  const sent: string[] = []; await f.processEvents(async event => { sent.push(event.type); return accepted(event.id); });
  assert.deepEqual(sent, ["test"]); assert.deepEqual(f.events.map(event => event.status), ["PENDING", "PENDING", "PENDING", "SENT"]);
});
test("dispatcher honors individual flags", async () => {
  const f = await fixture({ ...enabled, cartAlerts: false, paymentAlerts: false }, [{ type: "cart" }, { type: "order" }, { type: "payment" }]);
  const sent: string[] = []; await f.processEvents(async event => { sent.push(event.type); return accepted(event.id); }); assert.deepEqual(sent, ["order"]);
});
test("provider acceptance stores message identity without requiring delivery proof or resending", async () => {
  const f = await fixture(enabled, [{}]); let calls = 0;
  const send = async (event: { id: string }) => { calls++; return accepted(event.id); };
  await f.processEvents(send); await f.processEvents(send);
  assert.equal(calls, 1); assert.equal(f.events[0].status, "SENT"); assert.equal(f.events[0].messageId, "synthetic-message"); assert.ok(f.events[0].sentAt); assert.equal(f.events[0].leaseExpiresAt, null);
});
test("blocked retryable transport backs off and stops after fifth attempt", async () => {
  const f = await fixture(enabled, [{}]); let calls = 0;
  const send = async (event: { id: string }) => { calls++; return blocked(event.id); };
  for (let attempt = 1; attempt <= 5; attempt++) {
    await f.processEvents(send); assert.equal(f.events[0].attempts, attempt); assert.equal(f.events[0].status, attempt === 5 ? "FAILED" : "PENDING");
    assert.ok(f.events[0].availableAt.getTime() > Date.now()); await f.processEvents(send); assert.equal(calls, attempt); f.events[0].availableAt = new Date(0);
  }
  await f.processEvents(send); assert.equal(calls, 5);
});
test("non-retryable block fails immediately", async () => {
  const f = await fixture(enabled, [{}]); await f.processEvents(async event => ({ ...blocked(event.id), retryable: false })); assert.equal(f.events[0].status, "FAILED"); assert.equal(f.events[0].attempts, 1);
});
test("timeout and uncertain response are quarantined without resend", async () => {
  for (const timeout of [true, false]) {
    const f = await fixture(enabled, [{}]); let calls = 0;
    const send = async (event: { id: string }) => { calls++; if (timeout) throw new Error("synthetic timeout"); return { ...accepted(event.id), status: "uncertain" as const, uncertain: true }; };
    await f.processEvents(send); await f.processEvents(send); assert.equal(calls, 1); assert.equal(f.events[0].status, "UNCERTAIN"); assert.equal(f.events[0].leaseExpiresAt, null);
  }
});
test("claim lost to another worker never invokes transport", async () => {
  const f = await fixture(enabled, [{}], true); let calls = 0; await f.processEvents(async event => { calls++; return accepted(event.id); }); assert.equal(calls, 0); assert.equal(f.events[0].attempts, 0);
});
test("cart changed after selection sends the latest claimed snapshot", async () => {
  const f = await fixture(enabled, [{ type: "cart", text: "1 × Produto sintético" }], false, event => { event.text = "2 × Produto sintético"; });
  const sent: string[] = [];
  await f.processEvents(async event => { sent.push(event.text); return accepted(event.id); });
  assert.deepEqual(sent, ["2 × Produto sintético"]); assert.equal(f.events[0].status, "SENT");
});
test("expired processing lease is uncertain and expired cart fails without send", async () => {
  const f = await fixture(enabled, [{ status: "PROCESSING", leaseExpiresAt: new Date(0) }, { type: "cart", createdAt: new Date(Date.now() - 601_000) }]);
  let calls = 0; await f.processEvents(async event => { calls++; return accepted(event.id); }); assert.equal(calls, 0); assert.deepEqual(f.events.map(event => event.status), ["UNCERTAIN", "FAILED"]);
});
