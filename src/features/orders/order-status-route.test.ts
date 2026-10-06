import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

const bundle = build({ entryPoints: ["src/app/api/pedidos/[id]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-order-status", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/permissions$|features\/cashback\/(service|redemption)$|lib\/(prisma|api)$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireApiRole=globalThis.fixture.guard;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : args.path.endsWith("api") ? "export const readJsonBody=r=>r.json();" : "export const settleOrderCashback=globalThis.fixture.settle; export const settleOrderBenefits=globalThis.fixture.settle;" }));
} }] });

async function harness(overrides: Record<string, unknown> = {}, userId: string | null = "operator-test", denied = false) {
  const current = { status: "PREPARING", paymentStatus: "PAID", paymentMethod: "CASH", requiresPrescriptionReview: true,
    prescriptionReviewedAt: null, prescriptionReviewedById: null, onlinePayment: null, ...overrides };
  const calls: string[] = [];
  const updates: Record<string, unknown>[] = [];
  const audits: Record<string, unknown>[] = [];
  const tx = {
    $queryRaw: async () => { calls.push("lock"); return [{ id: "order-test" }]; },
    order: {
      findUnique: async () => { calls.push("read"); return current; },
      update: async ({ data }: { data: Record<string, unknown> }) => { calls.push("update"); updates.push(data); Object.assign(current, data); },
      findUniqueOrThrow: async () => ({ ...current, id: "order-test", updatedAt: new Date(), cashbackRedeemedCents: 0, cashbackRedemptionState: "NONE" }),
    },
    onlinePayment: { findUnique: async () => current.onlinePayment },
    auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { audits.push(data); } },
  };
  const loaded = { exports: {} as { PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, console, fixture: {
    guard: async () => denied ? { response: new Response(null, { status: 403 }) } : { session: { user: { id: userId } } },
    prisma: { $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) },
    settle: async () => { calls.push("settle"); },
  } });
  return { current, calls, updates, audits, patch: (body: unknown) => loaded.exports.PATCH(new Request("https://example.com/api/pedidos/order-test", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: "order-test" }) }) };
}

test("receita pendente bloqueia saída direta, pronto, conclusão e repetição do status sob lock", async () => {
  for (const [status, next] of [["PREPARING", "READY"], ["PREPARING", "OUT_FOR_DELIVERY"], ["READY", "READY"], ["READY", "COMPLETED"], ["OUT_FOR_DELIVERY", "COMPLETED"]]) {
    const fixture = await harness({ status });
    assert.equal((await fixture.patch({ status: next })).status, 409);
    assert.deepEqual(fixture.calls, ["lock", "read"]);
    assert.equal(fixture.updates.length, 0);
  }
});

test("atestado explícito registra horário do servidor e operador, sem persistir campos clínicos", async () => {
  const fixture = await harness();
  const before = Date.now();
  const response = await fixture.patch({ prescriptionReviewed: true, prescriptionReviewedAt: "1999-01-01", prescriptionReviewedById: "forged", prescription: "private clinical text" });
  assert.equal(response.status, 200);
  const data = fixture.updates[0];
  assert.ok(new Date(data.prescriptionReviewedAt as string).getTime() >= before);
  assert.equal(data.prescriptionReviewedById, "operator-test");
  assert.equal(data.prescriptionReviewed, undefined);
  assert.equal(data.prescription, undefined);
  assert.equal(fixture.current.status, "PREPARING");
  assert.equal(fixture.current.paymentStatus, "PAID");
  assert.equal(fixture.audits.length, 1);
  assert.equal(fixture.audits[0].action, "ORDER_PRESCRIPTION_REVIEW_RECORDED");
  assert.equal(JSON.stringify(fixture.audits).includes("private clinical text"), false);
  assert.equal((await fixture.patch({ status: "OUT_FOR_DELIVERY" })).status, 200);
});

test("pagamento não confere receita; conferência não aprova pagamento nem supera gateway", async () => {
  const fixture = await harness({ paymentStatus: "PENDING" });
  assert.equal((await fixture.patch({ paymentStatus: "PAID" })).status, 200);
  assert.equal(fixture.current.prescriptionReviewedAt, null);
  assert.equal((await fixture.patch({ status: "READY" })).status, 409);
  const online = await harness({ paymentMethod: "ONLINE", paymentStatus: "PENDING", onlinePayment: { status: "PENDING", environment: "production", statusDetail: null } });
  assert.equal((await online.patch({ prescriptionReviewed: true })).status, 200);
  assert.equal(online.current.paymentStatus, "PENDING");
  assert.equal((await online.patch({ status: "READY" })).status, 409);
  assert.equal((await online.patch({ paymentStatus: "PAID" })).status, 409);
});

test("conferência prévia permite dispensação e repetição não altera autor ou horário", async () => {
  const reviewedAt = new Date("2026-10-01T12:00:00Z");
  const fixture = await harness({ prescriptionReviewedAt: reviewedAt, prescriptionReviewedById: "first-operator" });
  assert.equal((await fixture.patch({ prescriptionReviewed: true, status: "READY" })).status, 200);
  assert.equal(fixture.updates[0].prescriptionReviewedAt, undefined);
  assert.equal(fixture.current.prescriptionReviewedById, "first-operator");
  assert.equal(fixture.audits.filter(audit => audit.action === "ORDER_PRESCRIPTION_REVIEW_RECORDED").length, 0);
});

test("produto comum dispensa gate; atestado exige sessão real e pedido elegível", async () => {
  const normal = await harness({ requiresPrescriptionReview: false });
  assert.equal((await normal.patch({ status: "READY" })).status, 200);
  for (const overrides of [{ requiresPrescriptionReview: false }, { status: "CANCELED" }, { status: "COMPLETED" }]) {
    const fixture = await harness(overrides);
    assert.equal((await fixture.patch({ prescriptionReviewed: true })).status, 409);
    assert.equal(fixture.updates.length, 0);
  }
  for (const userId of [null, "demo-admin"]) {
    const fixture = await harness({}, userId);
    assert.equal((await fixture.patch({ prescriptionReviewed: true })).status, 401);
  }
  const denied = await harness({}, null, true);
  assert.equal((await denied.patch({ prescriptionReviewed: true })).status, 403);
  assert.deepEqual(denied.calls, []);
});

test("bloqueios de homologação, reembolso parcial e saltos de status permanecem", async () => {
  for (const onlinePayment of [{ status: "PAID", environment: "test", statusDetail: null }, { status: "PAID", environment: "production", statusDetail: "partially_refunded" }]) {
    const fixture = await harness({ paymentMethod: "ONLINE", onlinePayment });
    assert.equal((await fixture.patch({ prescriptionReviewed: true, status: "READY" })).status, 409);
    assert.equal(fixture.updates.length, 0);
  }
  const fixture = await harness({ status: "PENDING", prescriptionReviewedAt: new Date() });
  assert.equal((await fixture.patch({ status: "COMPLETED" })).status, 409);
});
