import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const binding = "d81c395d-e33e-430c-bc7a-2f750cf2df16";
const secret = "ab".repeat(32);
const wallet = "synthetic-wallet";
const bundle = build({ entryPoints: ["src/features/payments/asaas-webhook.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "webhook-fixture", setup(builder) {
    builder.onResolve({ filter: /(?:lib\/prisma|asaas-sandbox-integration|asaas-service)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>globalThis.fixture.prisma;"
      : args.path.endsWith("asaas-service") ? "export const refreshAsaasSandboxPayment=id=>globalThis.fixture.refresh(id);"
        : "export const ASAAS_SANDBOX_INTEGRATION_ID='asaas-sandbox'; export const readAsaasSandboxIntegration=async()=>globalThis.fixture.integration;" }));
  } }] });
// Synthetic Prisma fixture evaluates dynamic query predicates without accessing a real database.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
function matches(row: Data, where: Data): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some((part: Data) => matches(row, part));
    if (value === null) return row[key] === null;
    if (value instanceof Date) return row[key]?.getTime() === value.getTime();
    if (typeof value === "object") return value.lt ? row[key] !== null && row[key] < value.lt : false;
    return row[key] === value;
  });
}
async function harness() {
  const rows: Data[] = [];
  const payments: Data[] = [];
  const calls = { fetch: [] as string[], refresh: [] as string[], audit: [] as Data[] };
  const fixture = { integration: { environment: "test", accountId: wallet,
    connection: { environment: "test", accessToken: "$aact_hmlg_synthetic-key" },
    secrets: { webhookSecret: secret, webhookUrl: `https://example.invalid/webhook?binding=${binding}` } },
  failPersist: false, failFetch: false, canonical: { id: "pay_synthetic", billingType: "PIX", status: "RECEIVED", value: 10, netValue: 9,
    pixQrCodeId: "synthetic-qr" } as Data,
  refreshStatus: "PAID",
  refresh: async (id: string) => { calls.refresh.push(id); return { status: fixture.refreshStatus }; },
  prisma: { $transaction: async (callback: (tx: Data) => Promise<Data>): Promise<Data> => callback(fixture.prisma),
  auditLog: { create: async ({ data }: Data) => { calls.audit.push(data); return data; } },
  paymentWebhookEvent: {
    create: async ({ data }: Data) => {
      if (fixture.failPersist) throw new Error("sensitive secret provider failure");
      if (rows.some(row => row.eventId === data.eventId && row.accountId === data.accountId)) throw { code: "P2002" };
      const row = { ...data, id: `inbox-${rows.length}`, status: "PENDING", attempts: 0, lastAttemptAt: null, createdAt: new Date() };
      rows.push(row); return row;
    },
    findUnique: async ({ where }: Data) => rows.find(row => matches(row, where.provider_environment_accountId_eventId)) ?? null,
    findMany: async ({ where, take, orderBy }: Data) => rows.filter(row => matches(row, where)).sort((left, right) => {
      for (const clause of Array.isArray(orderBy) ? orderBy : [orderBy]) {
        const [field, direction] = Object.entries(clause)[0] as [string, string | { sort: string; nulls: string }];
        const a = left[field], b = right[field];
        if (a === null || b === null) {
          if (a === b) continue;
          const nullsFirst = typeof direction === "object" && direction.nulls === "first";
          return (a === null ? -1 : 1) * (nullsFirst ? 1 : -1);
        }
        const difference = a.getTime() - b.getTime();
        if (difference) return difference;
      }
      return 0;
    }).slice(0, take).map(row => ({ ...row })),
    updateMany: async ({ where, data }: Data) => {
      const selected = rows.filter(row => matches(row, where));
      for (const row of selected) { const next = { ...data }; if (next.attempts) next.attempts = row.attempts + next.attempts.increment; Object.assign(row, next); }
      return { count: selected.length };
    },
  }, onlinePayment: {
    findMany: async ({ where, take }: Data) => payments.filter(row => matches(row, where)).slice(0, take),
    findFirst: async ({ where }: Data) => payments.find(row => matches(row, where)) ?? null,
  } } };
  const loaded = { exports: {} as { receiveAsaasSandboxWebhook(request: Request): Promise<Response>; processAsaasWebhookInbox(n?: number): Promise<Data> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(`${process.cwd()}/package.json`), fixture, Buffer, Response, Request, URL, AbortSignal, Date,
    fetch: async (url: string, options: Data) => { calls.fetch.push(url); assert.equal(options.method, "GET");
      if (fixture.failFetch) throw new Error("sensitive network token");
      assert.match(url, /^https:\/\/api-sandbox\.asaas\.com\/v3\/payments\/pay_/); return Response.json(fixture.canonical); },
  });
  const receive = (body: unknown = { id: "evt_synthetic", event: "PAYMENT_RECEIVED", payment: { id: "pay_synthetic" } },
    overrides: { token?: string; binding?: string; contentType?: string; raw?: string; length?: string } = {}) => {
    const headers: Record<string, string> = { "asaas-access-token": overrides.token ?? secret, "content-type": overrides.contentType ?? "application/json" };
    if (overrides.length) headers["content-length"] = overrides.length;
    return loaded.exports.receiveAsaasSandboxWebhook(new Request(`https://example.invalid/webhook?binding=${overrides.binding ?? binding}`, {
      method: "POST", headers, body: overrides.raw ?? JSON.stringify(body) }));
  };
  const local = (extra: Data = {}) => payments.push({ id: "synthetic-attempt", orderId: "synthetic-order", provider: "asaas", integrationId: "asaas-sandbox",
    environment: "test", accountId: wallet, amountCents: 1000, method: "pix", pixQrCodeId: "synthetic-qr", providerOrderId: null, ...extra });
  const age = () => { for (const row of rows) row.lastAttemptAt = new Date(0); };
  return { api: loaded.exports, fixture, calls, rows, payments, receive, local, age };
}

test("auth and binding fail before persistence, canonical GET and financial refresh", async () => {
  const h = await harness();
  for (const options of [{ token: "cd".repeat(32) }, { token: "ab" }, { binding: "wrong" }, { binding: `${binding}&binding=${binding}` }]) {
    assert.equal((await h.receive(undefined, options)).status, 401);
  }
  h.fixture.integration.environment = "production";
  assert.equal((await h.receive()).status, 401);
  assert.equal(h.rows.length, 0); assert.equal(h.calls.fetch.length, 0); assert.equal(h.calls.refresh.length, 0);
});
test("streaming byte limit, JSON format and event whitelist reject hostile input", async () => {
  const h = await harness();
  assert.equal((await h.receive(undefined, { raw: " ".repeat(65537) })).status, 413);
  assert.equal((await h.receive(undefined, { length: "65537" })).status, 413);
  assert.equal((await h.receive(undefined, { contentType: "text/plain" })).status, 415);
  assert.equal((await h.receive(undefined, { raw: "{" })).status, 400);
  assert.equal((await h.receive({ id: "evt_bad", event: "PAYMENT_OVERDUE", payment: { id: "pay_synthetic" } })).status, 400);
  assert.equal(h.rows.length, 0);
});

test("provider event ID numeric suffix is retained exactly for deduplication; hostile IDs stay rejected", async () => {
  const h = await harness();
  const body = { id: "evt_synthetic0123456789&21402383", event: "PAYMENT_CREATED", payment: { id: "pay_synthetic" } };
  assert.equal((await h.receive(body)).status, 200);
  assert.equal((await h.receive(body)).status, 200);
  assert.equal(h.rows.length, 1); assert.equal(h.rows[0].eventId, body.id);
  for (const id of ["evt_bad&abc", "evt_bad&1&2", "evt_bad\n", "evt_bad/path", "evt_bad?token=x", "x".repeat(101)]) {
    assert.equal((await h.receive({ ...body, id })).status, 400, JSON.stringify(id));
  }
  assert.equal(h.rows.length, 1); assert.equal(h.calls.fetch.length, 0); assert.equal(h.calls.refresh.length, 0);
});
test("200 requires durable sanitized receipt; duplicate retains pending attempts and rejects divergence", async () => {
  const h = await harness();
  h.fixture.failPersist = true;
  const failed = await h.receive(); assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /sensitive|secret/);
  h.fixture.failPersist = false;
  const payload = { id: "evt_synthetic", event: "PAYMENT_RECEIVED", account: { id: "unrelated-account-id" },
    payment: { id: "pay_synthetic", value: 999999, customer: { name: "Private Name" } } };
  assert.equal((await h.receive(payload)).status, 200);
  h.rows[0].attempts = 4;
  assert.equal((await h.receive(payload)).status, 200);
  assert.equal(h.rows.length, 1); assert.equal(h.rows[0].attempts, 4); assert.equal(h.rows[0].status, "PENDING");
  assert.equal(h.rows[0].accountId, wallet); assert.doesNotMatch(JSON.stringify(h.rows), /Private Name|999999|unrelated-account/);
  assert.equal((await h.receive({ ...payload, payment: { id: "pay_other" } })).status, 409);
  assert.equal(h.calls.fetch.length, 0); assert.equal(h.calls.refresh.length, 0);
});
test("early unknown payment remains pending and later links through canonical QR; concurrent claims refresh once", async () => {
  const h = await harness(); await h.receive();
  await h.api.processAsaasWebhookInbox(); assert.equal(h.rows[0].status, "PENDING");
  assert.equal(h.calls.refresh.length, 0);
  h.local(); h.age();
  await Promise.all([h.api.processAsaasWebhookInbox(), h.api.processAsaasWebhookInbox()]);
  assert.equal(h.rows[0].status, "PROCESSED"); assert.deepEqual(h.calls.refresh, ["synthetic-order"]);
});
test("different environment/account/provider and canonical amount/resource mismatch never refresh", async () => {
  for (const fault of ["account", "environment", "provider", "amount", "remote", "qr", "method", "localMethod", "missingResource"]) {
    const h = await harness(); await h.receive(); h.local();
    if (fault === "account") h.payments[0].accountId = "another-wallet";
    if (fault === "environment") h.payments[0].environment = "production";
    if (fault === "provider") h.payments[0].provider = "mercado-pago";
    if (fault === "amount") h.fixture.canonical.value = 11;
    if (fault === "remote") h.payments[0].providerOrderId = "pay_other";
    if (fault === "qr") { h.payments[0].pixQrCodeId = "other-qr"; h.payments[0].providerOrderId = "pay_synthetic"; }
    if (fault === "method") h.fixture.canonical.billingType = "CREDIT_CARD";
    if (fault === "localMethod") h.payments[0].method = "cash";
    if (fault === "missingResource") { h.payments[0].pixQrCodeId = null; h.payments[0].providerOrderId = "pay_synthetic"; }
    const mismatch = !["account", "environment", "provider"].includes(fault);
    await h.api.processAsaasWebhookInbox(); assert.equal(h.calls.refresh.length, 0, fault);
    assert.equal(h.rows[0].status, mismatch ? "REVIEW" : "PENDING", fault);
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls.audit)), mismatch ? [{ action: "ASAAS_SANDBOX_WEBHOOK_REVIEW", entity: "PaymentWebhookEvent",
      entityId: h.rows[0].id, metadata: { reason: "BINDING_MISMATCH", eventType: "PAYMENT_RECEIVED" } }] : [], fault);
  }
});
test("network failure remains pending without raw-error audit and retries after lease", async () => {
  const h = await harness(); await h.receive(); h.local(); h.fixture.failFetch = true;
  await h.api.processAsaasWebhookInbox();
  assert.equal(h.rows[0].status, "PENDING"); assert.equal(h.calls.audit.length, 0); assert.equal(h.calls.refresh.length, 0);
  h.fixture.failFetch = false; h.age(); await h.api.processAsaasWebhookInbox();
  assert.equal(h.rows[0].status, "PROCESSED"); assert.equal(h.calls.refresh.length, 1);
});
test("late PAYMENT_DELETED only signals canonical refresh; checkout cancellation/expiration require review", async () => {
  const h = await harness(); h.local({ status: "PAID" });
  await h.receive({ id: "evt_late", event: "PAYMENT_DELETED", payment: { id: "pay_synthetic", status: "PENDING" } });
  await h.api.processAsaasWebhookInbox(); assert.equal(h.payments[0].status, "PAID"); assert.equal(h.calls.refresh.length, 1);
  for (const event of ["CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"]) {
    await h.receive({ id: `evt_${event}`, event, checkout: { id: binding } });
  }
  await h.api.processAsaasWebhookInbox(); assert.equal(h.rows.filter(row => row.status === "REVIEW").length, 2);
  assert.equal(h.calls.refresh.length, 1);
});
test("CHECKOUT_PAID uses stored session and delegates canonical state without approving envelope", async () => {
  const h = await harness(); await h.receive({ id: "evt_checkout", event: "CHECKOUT_PAID", checkout: { id: binding, status: "PAID" } });
  await h.api.processAsaasWebhookInbox(); assert.equal(h.rows[0].status, "PENDING");
  h.local({ method: "card", pixQrCodeId: null, checkoutSessionId: binding, status: "PENDING" }); h.age();
  h.fixture.refreshStatus = "PENDING";
  await h.api.processAsaasWebhookInbox(); assert.deepEqual(h.calls.refresh, ["synthetic-order"]);
  assert.equal(h.rows[0].status, "PENDING");
  assert.equal(h.payments[0].status, "PENDING"); assert.equal(h.calls.fetch.length, 0);
});
test("card canonical session must match; an optional attempt reference must also match when present", async () => {
  for (const reference of ["synthetic-attempt", null, undefined, "another-attempt"]) {
    const h = await harness(); await h.receive();
    h.local({ method: "card", pixQrCodeId: null, checkoutSessionId: binding });
    Object.assign(h.fixture.canonical, { billingType: "CREDIT_CARD", pixQrCodeId: null, checkoutSession: binding, externalReference: reference });
    await h.api.processAsaasWebhookInbox();
    assert.equal(h.calls.refresh.length, reference === "another-attempt" ? 0 : 1);
  }
});
test("lease avoids immediate retries and batch size stays at ten", async () => {
  const h = await harness();
  for (let n = 0; n < 12; n++) await h.receive({ id: `evt_${n}`, event: "PAYMENT_RECEIVED", payment: { id: "pay_synthetic" } });
  await h.api.processAsaasWebhookInbox(100);
  assert.equal(h.calls.fetch.length, 10);
  await h.api.processAsaasWebhookInbox(); assert.equal(h.calls.fetch.length, 12);
  await h.api.processAsaasWebhookInbox(); assert.equal(h.calls.fetch.length, 12);
  h.age(); await h.api.processAsaasWebhookInbox(1); assert.equal(h.calls.fetch.length, 13);
});
test("ten unresolved old events cannot starve a later refund or chargeback after lease expiry", async () => {
  for (const event of ["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]) {
    const h = await harness();
    for (let n = 0; n < 10; n++) {
      await h.receive({ id: `evt_old_${n}`, event: "PAYMENT_RECEIVED", payment: { id: "pay_unknown" } });
      h.rows[n].createdAt = new Date(n);
    }
    await h.receive({ id: "evt_later", event, payment: { id: "pay_synthetic" } });
    h.rows[10].createdAt = new Date(100);
    h.fixture.canonical.id = "pay_unknown";
    h.fixture.canonical.pixQrCodeId = "unbound-qr";
    await h.api.processAsaasWebhookInbox();
    assert.equal(h.rows[10].attempts, 0);
    assert.ok(h.rows.slice(0, 10).every(row => row.status === "PENDING"));
    // Expire the first batch's leases while the later event remains never attempted.
    for (const row of h.rows.slice(0, 10)) row.lastAttemptAt = new Date(0);
    h.local({ status: "PAID" });
    h.fixture.canonical.id = "pay_synthetic";
    h.fixture.canonical.pixQrCodeId = "synthetic-qr";
    h.fixture.canonical.status = event === "PAYMENT_REFUNDED" ? "REFUNDED" : "CHARGEBACK_REQUESTED";
    h.fixture.refreshStatus = event === "PAYMENT_REFUNDED" ? "REFUNDED" : "DISPUTED";
    await h.api.processAsaasWebhookInbox();
    assert.equal(h.rows[10].attempts, 1, event);
    assert.equal(h.rows[10].status, "PROCESSED", event);
    assert.deepEqual(h.calls.refresh, ["synthetic-order"]);
  }
});
