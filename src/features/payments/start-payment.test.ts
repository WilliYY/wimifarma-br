import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import type { PaymentInput } from "./schema";

const bundle = build({ entryPoints: ["src/features/payments/service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-payment-start", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/headers$|lib\/secret-vault$|features\/cashback\/(service|redemption)$|features\/miauby\/commerce-service$|^\.\/(integration|provider)$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
    args.path.endsWith("auth") ? "export const auth=async()=>null;" :
    args.path.endsWith("headers") ? "export const cookies=async()=>({get:()=>undefined});" :
    args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" :
    args.path.endsWith("secret-vault") ? "export const encryptValue=value=>({ciphertext:value,iv:'synthetic',tag:'synthetic'}); export const decryptValue=value=>value.ciphertext;" :
    args.path.endsWith("integration") ? "export const readPaymentIntegration=async()=>globalThis.fixture.connection;" :
    args.path.endsWith("provider") ? "export const mercadoPagoRequest=(...args)=>globalThis.fixture.provider(...args);" :
    args.path.endsWith("redemption") ? "export const settleOrderBenefits=async()=>{};" :
    args.path.endsWith("commerce-service") ? "export const queueCommerceOrder=async()=>{};" : "export const settleOrderCashback=async()=>{};",
  }));
} }] });

async function harness(overrides: Record<string, unknown> = {}, options: { environment?: string; reservationCount?: number; ageMinutes?: number; providerFailure?: boolean; requiresPrescriptionReview?: boolean } = {}) {
  const environment = options.environment ?? "production";
  const product = { id: "synthetic-product", name: "Produto sintético", status: "ACTIVE", requiresPrescription: true,
    prescriptionType: "ORDINARY", isPopularPharmacy: false, stock: 5, price: "7.98", promotionalPrice: null, updatedAt: new Date(), ...overrides };
  const payment = { id: "synthetic-payment", orderId: "synthetic-order", status: "NEW", environment, accountId: "synthetic-account", amountCents: 798,
    idempotencyKey: "synthetic-key", stockReserved: false, providerOrderId: null, providerUpdatedAt: null, createdAt: new Date(), lastCheckedAt: null,
    pixCode: null, pixExpiresAt: null, requestCiphertext: null, requestIv: null, requestTag: null };
  const order = { id: payment.orderId, number: "SYNTHETIC", customerEmail: "synthetic@testuser.com", status: "PENDING", paymentStatus: "PENDING",
    requiresPrescriptionReview: options.requiresPrescriptionReview ?? true, prescriptionReviewedAt: null, createdAt: new Date(Date.now() - (options.ageMinutes ?? 0) * 60_000), onlinePayment: payment,
    items: [{ productId: product.id, quantity: 1, unitPriceCents: 798 }] };
  const calls = { reserved: 0, submitted: [] as { body: Record<string, unknown>; key: string }[], audit: [] as string[], locks: 0 };
  const connection = { environment, accountId: payment.accountId, enabled: true, publicKey: "synthetic-public-key", secrets: { accessToken: "synthetic-token" } };
  const tx = {
    $queryRaw: async () => { calls.locks++; },
    order: { findUniqueOrThrow: async () => order, update: async ({ data }: { data: object }) => Object.assign(order, data) },
    paymentIntegration: { findUnique: async () => connection },
    product: { findUnique: async () => product, updateMany: async ({ where, data }: { where: { stock: { gte: number }; updatedAt: Date }; data: { stock: { decrement: number } } }) => {
      assert.equal(where.updatedAt, product.updatedAt);
      assert.equal(where.stock.gte, 1);
      calls.reserved++;
      if (options.reservationCount === 0) return { count: 0 };
      product.stock -= data.stock.decrement;
      return { count: 1 };
    } },
    onlinePayment: { findUnique: async () => payment, findUniqueOrThrow: async () => ({ ...payment, order }),
      update: async ({ data }: { data: object }) => Object.assign(payment, data),
      updateMany: async ({ data }: { data: object }) => { Object.assign(payment, data); return { count: 1 }; } },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { calls.audit.push(data.action); } },
  };
  const prisma = { ...tx, $transaction: async (run: (value: unknown) => Promise<unknown>) => {
    const stock = product.stock; const saved = { ...payment };
    try { return await run(tx); } catch (error) { product.stock = stock; Object.assign(payment, saved); throw error; }
  } };
  const fixture = { prisma, connection, provider: async (_path: string, _token: string, body: Record<string, unknown>, key: string) => {
    calls.submitted.push({ body, key });
    if (options.providerFailure) throw new Error("synthetic uncertain provider response");
    return { id: "ORDSYNTHETIC", type: "online", external_reference: payment.id, total_amount: "7.98", country_code: "BRA", user_id: payment.accountId,
      status: "action_required", status_detail: "waiting_payment", last_updated_date: new Date().toISOString(),
      transactions: { payments: [{ amount: "7.98", status: "action_required", payment_method: { id: "pix", type: "bank_transfer", qr_code: "synthetic-pix-code" } }] } };
  } };
  const loaded = { exports: {} as { startPayment: (orderId: string, input: PaymentInput) => Promise<{ status: string; pixCode: string | null }> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture });
  return { calls, product, payment, order, run: (method: "pix" | "card" = "pix") => loaded.exports.startPayment(order.id, method === "pix"
    ? { method, email: order.customerEmail }
    : { method, email: order.customerEmail, token: "synthetic-card-token", paymentMethodId: "visa", paymentType: "credit_card", installments: 3 }) };
}

test("receita comum inicia Pix e cartão sem dispensar nem reservar estoque duas vezes", async () => {
  for (const method of ["pix", "card"] as const) {
    const fixture = await harness();
    const result = await fixture.run(method);
    assert.equal(result.status, "PENDING");
    assert.equal(fixture.product.stock, 4);
    assert.equal(fixture.payment.stockReserved, true);
    assert.equal(fixture.order.requiresPrescriptionReview, true);
    assert.equal(fixture.order.prescriptionReviewedAt, null);
    assert.equal(fixture.order.paymentStatus, "PENDING");
    assert.equal(fixture.calls.submitted.length, 1);
    assert.equal(fixture.calls.submitted[0].key, "synthetic-key");
    assert.equal(fixture.calls.submitted[0].body.total_amount, "7.98");
    assert.ok(fixture.calls.locks >= 2);
    const body = fixture.calls.submitted[0].body as { transactions: { payments: { payment_method: { id: string; installments?: number } }[] } };
    assert.equal(body.transactions.payments[0].payment_method.id, method === "pix" ? "pix" : "visa");
    if (method === "card") assert.equal(body.transactions.payments[0].payment_method.installments, 3);
    await fixture.run(method);
    assert.equal(fixture.calls.reserved, 1);
    assert.equal(fixture.calls.submitted.length, 1);
  }
});

test("pagamento mantém bloqueios de controlados, classificação ausente, Popular, preço e estoque", async () => {
  for (const overrides of [{ prescriptionType: "CONTROLLED" }, { prescriptionType: "CONTROLLED", requiresPrescription: false },
    { prescriptionType: "UNREVIEWED" }, { prescriptionType: undefined }, { isPopularPharmacy: true },
    { status: "ARCHIVED" }, { stock: 0 }, { price: "8.99" }, { promotionalPrice: "7.00" }]) {
    const fixture = await harness(overrides);
    await assert.rejects(fixture.run(), /Preço, disponibilidade ou estoque mudou\. Cancele este pedido e atualize o carrinho\./);
    assert.equal(fixture.calls.reserved, 0);
    assert.equal(fixture.calls.submitted.length, 0);
    assert.equal(fixture.payment.status, "NEW");
    assert.equal(fixture.payment.stockReserved, false);
  }
});

test("pagamento não ignora expiração nem corrida de reserva", async () => {
  const expired = await harness({}, { ageMinutes: 31 });
  await assert.rejects(expired.run(), /A reserva de preço expirou/);
  assert.equal(expired.calls.submitted.length, 0);
  const concurrent = await harness({}, { reservationCount: 0 });
  await assert.rejects(concurrent.run(), /Estoque alterado\. Atualize o carrinho\./);
  assert.equal(concurrent.calls.submitted.length, 0);
  assert.equal(concurrent.payment.status, "NEW");
  assert.equal(concurrent.product.stock, 5);
});

test("mudança de isento para receita comum após o pedido exige refazer o checkout", async () => {
  for (const method of ["pix", "card"] as const) {
    const fixture = await harness({ requiresPrescription: false, prescriptionType: "UNREVIEWED" }, { requiresPrescriptionReview: false });
    Object.assign(fixture.product, { requiresPrescription: true, prescriptionType: "ORDINARY" });
    await assert.rejects(fixture.run(method), /A exigência de receita mudou\. Cancele este pedido e refaça o checkout\./);
    assert.equal(fixture.calls.reserved, 0);
    assert.equal(fixture.calls.submitted.length, 0);
    assert.equal(fixture.payment.status, "NEW");
    assert.equal(fixture.payment.stockReserved, false);
    assert.equal(fixture.product.stock, 5);
    assert.equal(fixture.order.requiresPrescriptionReview, false);
  }
});

test("resposta incerta preserva reserva, corpo e chave de idempotência", async () => {
  const fixture = await harness({}, { providerFailure: true });
  await assert.rejects(fixture.run(), /synthetic uncertain provider response/);
  assert.equal(fixture.payment.status, "UNKNOWN");
  assert.equal(fixture.payment.stockReserved, true);
  assert.equal(fixture.product.stock, 4);
  assert.equal(fixture.payment.idempotencyKey, "synthetic-key");
  assert.ok(fixture.payment.requestCiphertext);
});

test("homologação de receita comum não consome estoque e produto isento segue elegível", async () => {
  const isolated = await harness({}, { environment: "test" });
  await isolated.run();
  assert.equal(isolated.product.stock, 5);
  assert.equal(isolated.payment.stockReserved, false);
  const ordinary = await harness({ requiresPrescription: false, prescriptionType: "UNREVIEWED" }, { requiresPrescriptionReview: false });
  await ordinary.run();
  assert.equal(ordinary.calls.submitted.length, 1);
});
