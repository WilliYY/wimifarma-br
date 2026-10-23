import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

const bundle = build({ entryPoints: ["src/app/api/pedidos/[id]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-order-status", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/permissions$|features\/cashback\/(service|redemption)$|lib\/(prisma|api)$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireApiRole=globalThis.fixture.guard;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : args.path.endsWith("api") ? "export const readJsonBody=r=>r.json();" : "export const settleOrderCashback=globalThis.fixture.settle; export const settleOrderBenefits=globalThis.fixture.settle;" }));
} }] });

type ShortageFixture = { rows?: { status: string; creditState: string }[]; items?: { quantity: number; shortageQuantity: number }[] };

test("orientação financeira funciona para Asaas e Mercado Pago sem encaminhar ao gateway errado", async () => {
  for (const provider of ["asaas", "mercado-pago"]) {
    const cancellation = await harness({ paymentMethod: "ONLINE", requiresPrescriptionReview: false,
      onlinePayment: { provider, environment: "production", status: "PAID", statusDetail: null } });
    const canceled = await cancellation.patch({ status: "CANCELED" });
    assert.equal(canceled.status, 409);
    const cancelBody = await canceled.json();
    assert.match(cancelBody.error, /provedor do pagamento/);
    assert.doesNotMatch(cancelBody.error, /Mercado Pago/);
    assert.equal(cancellation.updates.length, 0);

    const pending = await harness({ status: "CONFIRMED", paymentMethod: "ONLINE", requiresPrescriptionReview: false,
      onlinePayment: { provider, environment: "production", status: "PENDING", statusDetail: null } });
    const preparing = await pending.patch({ status: "PREPARING" });
    assert.equal(preparing.status, 409);
    const preparingBody = await preparing.json();
    assert.match(preparingBody.error, /provedor do pagamento/);
    assert.doesNotMatch(preparingBody.error, /Mercado Pago/);
    assert.equal(pending.updates.length, 0);
  }
});

test("retirada nunca aceita etapa de saída para entrega", async () => {
  const f = await harness({ status: "READY", fulfillmentMethod: "PICKUP", requiresPrescriptionReview: false });
  assert.equal((await f.patch({ status: "OUT_FOR_DELIVERY" })).status, 409);
  assert.equal(f.updates.length, 0);
});

test("pagamento com revisão financeira pendente não libera etapas", async () => {
  const f = await harness({ status: "PENDING", paymentMethod: "ONLINE", requiresPrescriptionReview: false,
    onlinePayment: { environment: "production", status: "PAID", statusDetail: null, financialReviewReason: "amount_mismatch" } });
  assert.equal((await f.patch({ status: "CONFIRMED" })).status, 409);
  assert.equal(f.updates.length, 0);
});

async function harness(overrides: Record<string, unknown> = {}, userId: string | null = "operator-test", denied = false, shortages: ShortageFixture = {}) {
  const current = { id: "order-test", number: "WIM-SYNTHETIC", customerPhone: "11999990000", fulfillmentMethod: "DELIVERY", status: "PREPARING", paymentStatus: "PAID", paymentMethod: "CASH", requiresPrescriptionReview: true,
    prescriptionReviewedAt: null, prescriptionReviewedById: null, onlinePayment: null, ...overrides };
  const calls: string[] = [];
  const updates: Record<string, unknown>[] = [];
  const audits: Record<string, unknown>[] = [];
  const messages: Record<string, unknown>[] = [];
  const tx = {
    miaubyConfig: { findUnique: async () => ({ enabled: true, customerStatusAlerts: true }) },
    miaubyEvent: { upsert: async ({ create }: { create: Record<string, unknown> }) => {
      const existing = messages.find(message => message.key === create.key);
      if (existing) return existing;
      const event = { status: "PENDING", ...create }; messages.push(event); return event;
    } },
    $queryRaw: async () => { calls.push("lock"); return [{ id: "order-test" }]; },
    order: {
      findUnique: async () => { calls.push("read"); return current; },
      update: async ({ data }: { data: Record<string, unknown> }) => { calls.push("update"); updates.push(data); Object.assign(current, data); },
      findUniqueOrThrow: async () => ({ ...current, id: "order-test", updatedAt: new Date(), cashbackRedeemedCents: 0, cashbackRedemptionState: "NONE" }),
    },
    orderItemShortage: { count: async ({ where }: { where: { orderId: string; OR: { status?: { in: string[] }; creditState?: string }[] } }) => {
      calls.push("shortage-count");
      assert.equal(where.orderId, "order-test");
      return (shortages.rows ?? []).filter(row => where.OR.some(condition => condition.status?.in.includes(row.status) || condition.creditState === row.creditState)).length;
    } },
    orderItem: { findMany: async ({ where }: { where: { orderId: string } }) => {
      calls.push("shortage-items");
      assert.equal(where.orderId, "order-test");
      return shortages.items ?? [{ quantity: 3, shortageQuantity: 1 }];
    } },
    onlinePayment: { findUnique: async () => current.onlinePayment },
    auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { audits.push(data); } },
  };
  const loaded = { exports: {} as { PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, console, fixture: {
    guard: async () => denied ? { response: new Response(null, { status: 403 }) } : { session: { user: { id: userId } } },
    prisma: { $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) },
    settle: async () => { calls.push("settle"); },
  } });
  return { current, calls, updates, audits, messages, patch: (body: unknown) => loaded.exports.PATCH(new Request("https://example.com/api/pedidos/order-test", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: "order-test" }) }) };
}

test("etapa válida congela um aviso e repeti-la não duplica nem expõe o telefone", async () => {
  const f = await harness({ status: "PENDING", requiresPrescriptionReview: false });
  const response = await f.patch({ status: "CONFIRMED" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.notificationStatus, "QUEUED");
  assert.equal(Object.hasOwn(body.data, "customerPhone"), false);
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].recipient, "5511999990000");
  assert.equal((await f.patch({ status: "CONFIRMED" })).status, 200);
  assert.equal(f.messages.length, 1);
});

test("guarda de receita bloqueia também a criação do aviso", async () => {
  const f = await harness();
  assert.equal((await f.patch({ status: "READY" })).status, 409);
  assert.equal(f.messages.length, 0);
});

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

test("falta proposta, reembolso solicitado e crédito em revisão bloqueiam liberação sob lock", async () => {
  const blockers = [
    { status: "PROPOSED", creditState: "NONE" },
    { status: "REFUND_REQUESTED", creditState: "NONE" },
    { status: "CREDIT_ACCEPTED", creditState: "REVIEW" },
  ];
  for (const row of blockers) {
    for (const [status, next] of [["PREPARING", "READY"], ["PREPARING", "OUT_FOR_DELIVERY"], ["READY", "READY"], ["READY", "COMPLETED"], ["OUT_FOR_DELIVERY", "COMPLETED"]]) {
      const fixture = await harness({ status, hasItemShortages: true, requiresPrescriptionReview: false }, "operator-test", false, { rows: [row] });
      const response = await fixture.patch({ status: next });
      assert.equal(response.status, 409, `${row.status}/${row.creditState}: ${status} para ${next}`);
      assert.match((await response.json()).error, /Resolva os itens faltantes/);
      assert.deepEqual(fixture.calls, ["lock", "read", "shortage-count", "shortage-items"]);
      assert.equal(fixture.updates.length, 0);
      assert.equal(fixture.audits.length, 0);
    }
  }
});

test("crédito aceito e sem pendências permite liberar somente havendo unidades entregáveis", async () => {
  for (const [status, next] of [["PREPARING", "READY"], ["PREPARING", "OUT_FOR_DELIVERY"], ["READY", "COMPLETED"]]) {
    const fixture = await harness({ status, hasItemShortages: true, requiresPrescriptionReview: false }, "operator-test", false, {
      rows: [{ status: "CREDIT_ACCEPTED", creditState: "ISSUED" }, { status: "VOIDED", creditState: "NONE" }],
      items: [{ quantity: 2, shortageQuantity: 2 }, { quantity: 3, shortageQuantity: 2 }],
    });
    const response = await fixture.patch({ status: next });
    assert.equal(response.status, 200);
    assert.equal(fixture.current.status, next);
    assert.deepEqual(fixture.calls, ["lock", "read", "shortage-count", "shortage-items", "update", "settle", "settle"]);
    assert.equal(fixture.audits[0].action, "ORDER_STATUS_UPDATED");
  }
});

test("falta integral ou ausência de itens impede conclusão mesmo após crédito aceito", async () => {
  for (const items of [[{ quantity: 2, shortageQuantity: 2 }, { quantity: 3, shortageQuantity: 3 }], []]) {
    const fixture = await harness({ status: "READY", hasItemShortages: true, requiresPrescriptionReview: false }, "operator-test", false, {
      rows: [{ status: "CREDIT_ACCEPTED", creditState: "ISSUED" }], items,
    });
    assert.equal((await fixture.patch({ status: "COMPLETED" })).status, 409);
    assert.deepEqual(fixture.calls, ["lock", "read", "shortage-count", "shortage-items"]);
    assert.equal(fixture.updates.length, 0);
    assert.equal(fixture.audits.length, 0);
  }
});
