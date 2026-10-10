import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

// Synthetic query evaluation only; no provider request, database or background timer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
const bundle = build({ entryPoints: ["src/features/payments/maintenance.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "maintenance-fixture", setup(builder) {
    builder.onResolve({ filter: /(?:lib\/prisma|\/service|\/fee-settings|\/asaas-service|\/asaas-webhook)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>fixture.prisma;"
      : args.path.endsWith("/service") ? "export const refreshPayment=id=>fixture.refresh(id); export const cancelUnsubmittedPayment=id=>fixture.cancel(id);"
      : args.path.endsWith("asaas-service") ? "export const refreshAsaasSandboxPayment=id=>fixture.sandbox(id);"
      : args.path.endsWith("asaas-webhook") ? "export const processAsaasWebhookInbox=async()=>({});"
      : "export const synchronizeFeeSettings=async()=>{};" }));
  } }] });

function matches(row: Data, where: Data): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every((part: Data) => matches(row, part));
    if (key === "OR") return value.some((part: Data) => matches(row, part));
    if (value === null) return row[key] === null;
    if (typeof value === "object") return value.in ? value.in.includes(row[key]) : value.lt ? row[key] !== null && row[key] < value.lt : false;
    return row[key] === value;
  });
}

async function harness() {
  const rows: Data[] = [];
  const calls = { refresh: [] as string[], cancel: [] as string[], sandbox: [] as string[], checked: [] as string[] };
  const fixture = {
    refresh: async (id: string) => { calls.refresh.push(id); },
    cancel: async (id: string) => { calls.cancel.push(id); },
    sandbox: async (id: string) => { calls.sandbox.push(id); },
    prisma: { onlinePayment: {
      findMany: async ({ where, take }: Data) => rows.filter(row => matches(row, where)).slice(0, take),
      updateMany: async ({ where }: Data) => { calls.checked.push(where.id); return { count: 1 }; },
    } },
  };
  const loaded = { exports: {} as { reconcilePendingPayments(): Promise<void> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(`${process.cwd()}/package.json`), fixture, Date, console });
  const add = (id: string, extra: Data = {}) => rows.push({ id, orderId: id, provider: "asaas", integrationId: "asaas",
    environment: "production", status: "REVIEW", financialReviewReason: "CHECKOUT_EXPIRED",
    createdAt: new Date(Date.now() - 60 * 60_000), updatedAt: new Date(Date.now() - 10 * 60_000), lastCheckedAt: null, ...extra });
  return { ...loaded.exports, calls, add };
}

test("maintenance recovers only technical production Asaas reviews and preserves both retry intervals", async () => {
  const f = await harness();
  for (const reason of ["CHECKOUT_CANCELED", "CHECKOUT_EXPIRED", "CHECKOUT_TIMEOUT"]) f.add(reason, { financialReviewReason: reason });
  f.add("old-check", { lastCheckedAt: new Date(Date.now() - 6 * 60_000) });
  f.add("general-review", { financialReviewReason: "Confira o estado financeiro canônico antes de alterar o pedido." });
  f.add("missing-reason", { financialReviewReason: null });
  f.add("other-provider", { provider: "mercado-pago" });
  f.add("sandbox", { environment: "test", integrationId: "asaas-sandbox" });
  f.add("wrong-integration", { integrationId: "asaas-sandbox" });
  f.add("recent-update", { updatedAt: new Date() });
  f.add("recent-check", { lastCheckedAt: new Date() });
  f.add("pending-recent-check", { status: "PENDING", lastCheckedAt: new Date() });
  await f.reconcilePendingPayments();
  assert.deepEqual(f.calls.refresh, ["CHECKOUT_CANCELED", "CHECKOUT_EXPIRED", "CHECKOUT_TIMEOUT", "old-check"]);
  assert.deepEqual(f.calls.checked, f.calls.refresh); assert.equal(f.calls.sandbox.length, 0); assert.equal(f.calls.cancel.length, 0);
});

test("maintenance retains pending gateway recovery and cancellation only for unsubmitted old orders", async () => {
  const f = await harness();
  f.add("pending-mp", { provider: "mercado-pago", integrationId: "mercado-pago", status: "PENDING" });
  f.add("pending-sandbox", { environment: "test", integrationId: "asaas-sandbox", status: "UNKNOWN" });
  f.add("old-new", { status: "NEW" });
  f.add("young-new", { status: "NEW", createdAt: new Date() });
  await f.reconcilePendingPayments();
  assert.deepEqual(f.calls.refresh, ["pending-mp"]); assert.deepEqual(f.calls.sandbox, ["pending-sandbox"]);
  assert.deepEqual(f.calls.cancel, ["old-new"]);
});
