import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";

const bundle = build({ entryPoints: ["src/features/orders/create-checkout.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-create-order", setup(builder) {
  builder.onResolve({ filter: /features\/cashback\/(rules|review-rewards|wallet)$|features\/shipping\/service$|features\/payments\/(schema|routing)$|features\/miauby\/commerce-service$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
    args.path.endsWith("rules") ? "export const productCashbackCents=()=>0;" :
    args.path.endsWith("review-rewards") ? "export const allocateCashbackDiscount=items=>items.map(()=>0);" :
    args.path.endsWith("wallet") ? "export class CashbackRuleError extends Error{}; export const lockCashbackAccount=()=>{throw new Error('unexpected wallet access')};" :
    args.path.endsWith("shipping/service") ? "export const validateOrderShipping=async()=>null;" :
    args.path.endsWith("schema") ? "export class PaymentError extends Error{};" :
    args.path.endsWith("routing") ? "export const checkoutPaymentConnections=async()=>{throw new Error('unexpected payment access')}; export const resolveCheckoutPayment=async()=>{throw new Error('unexpected payment access')};" : "export const queueCommerceOrder=async()=>{};",
  }));
} }] });

async function createFixture(prescriptionType: "ORDINARY" | "CONTROLLED" | "UNREVIEWED", requiresPrescription = true) {
  let selected: Record<string, unknown> | undefined;
  let saved: Record<string, unknown> | undefined;
  const product = { id: "product-test", name: "Produto sintético", slug: "produto-sintetico", imageUrl: null, price: "10.00", promotionalPrice: null,
    status: "ACTIVE", stock: 5, requiresPrescription, prescriptionType, isPopularPharmacy: false, cashbackEnabled: false, cashbackRateBps: 0 };
  const tx = {
    product: { findMany: async ({ select }: { select: Record<string, unknown> }) => { selected = select; return [product]; } },
    order: { create: async ({ data }: { data: Record<string, unknown> }) => { saved = { ...data, id: "order-test" }; return saved; }, findUniqueOrThrow: async () => saved },
  };
  const loaded = { exports: {} as { createCheckout: (tx: unknown, input: unknown) => Promise<unknown> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), crypto: webcrypto, console });
  return { selected: () => selected, saved: () => saved, run: () => loaded.exports.createCheckout(tx, {
    customer: { name: "Cliente sintético", email: "synthetic@example.com", phone: "44999999999" }, fulfillmentMethod: "PICKUP", paymentMethod: "CASH",
    cashbackRedeemCents: 0, privacyConsent: true, items: [{ productId: "product-test", quantity: 1, expectedUnitPriceCents: 1000 }],
    requiresPrescriptionReview: false, prescriptionReviewedAt: new Date(), prescriptionReviewedById: "forged",
  }) };
}

test("criação persiste snapshot calculado no servidor e não aceita conferência do cliente", async () => {
  const fixture = await createFixture("ORDINARY");
  await fixture.run();
  assert.equal(fixture.selected()?.prescriptionType, true);
  assert.equal(fixture.saved()?.requiresPrescriptionReview, true);
  assert.equal(fixture.saved()?.prescriptionReviewedAt, undefined);
  assert.equal(fixture.saved()?.prescriptionReviewedById, undefined);
  const normal = await createFixture("UNREVIEWED", false);
  await normal.run();
  assert.equal(normal.saved()?.requiresPrescriptionReview, false);
});

test("criação impede receita controlada ou classificação pendente antes de gravar pedido", async () => {
  for (const type of ["CONTROLLED", "UNREVIEWED"] as const) {
    const fixture = await createFixture(type);
    await assert.rejects(fixture.run, /precisa de atendimento/);
    assert.equal(fixture.saved(), undefined);
  }
});

const rewardsBundle = build({ entryPoints: ["src/features/orders/create-checkout.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-checkout-rewards", setup(builder) {
  builder.onResolve({ filter: /features\/(cashback|club)\/wallet$|features\/shipping\/service$|features\/payments\/(schema|routing)$|features\/miauby\/commerce-service$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
    args.path.endsWith("wallet") ? "export class CashbackRuleError extends Error{}; export class ClubRuleError extends Error{}; export const lockCashbackAccount=async()=>({id:'wallet-test',balance:{lessThan:()=>false}}); export const reserveWimicoins=async()=>{};" :
    args.path.endsWith("shipping/service") ? "export const validateOrderShipping=async()=>null;" :
    args.path.endsWith("schema") ? "export class PaymentError extends Error{};" :
    args.path.endsWith("routing") ? "export const checkoutPaymentConnections=async()=>{throw new Error('unexpected payment access')}; export const resolveCheckoutPayment=async()=>{throw new Error('unexpected payment access')};" : "export const queueCommerceOrder=async()=>{};",
  }));
} }] });

async function rewardSnapshot(cashback: number, coins: number, options: { quantity?: number; requiresPrescription?: boolean; isPopularPharmacy?: boolean; customer?: boolean; member?: boolean } = {}) {
  const quantity = options.quantity ?? 20;
  let saved: Record<string, unknown> = {};
  const product = { id: "reward-product", name: "Produto sintético", slug: "produto-sintetico", imageUrl: null, price: "10.25", promotionalPrice: null,
    status: "ACTIVE", stock: 100, requiresPrescription: false, prescriptionType: "ORDINARY", isPopularPharmacy: false,
    cashbackEnabled: true, cashbackRateBps: 200, wimicoinsEnabled: true, wimicoinsRateBps: 200, ...options };
  const tx = {
    $executeRaw: async () => 0,
    customer: { findFirst: async () => ({ id: "customer-test" }) },
    clubMembership: { findUnique: async () => ({ active: options.member !== false }) },
    product: { findMany: async () => [product] },
    order: { findUnique: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => (saved = { ...data, id: "order-test", number: "TEST-001" }), findUniqueOrThrow: async () => saved },
    cashbackAccount: { update: async () => ({}) }, cashbackTransaction: { create: async () => ({}) }, auditLog: { create: async () => ({}) },
  };
  const loaded = { exports: {} as { createCheckout: (tx: unknown, input: unknown, customer?: string) => Promise<unknown> } };
  vm.runInNewContext((await rewardsBundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), crypto: webcrypto, console });
  await loaded.exports.createCheckout(tx, { checkoutRequestId: "synthetic-request", customer: { name: "Cliente sintético", email: "synthetic@example.com", phone: "44999999999" },
    fulfillmentMethod: "PICKUP", paymentMethod: "CASH", cashbackRedeemCents: cashback, wimicoinsRedeemPoints: coins,
    privacyConsent: true, items: [{ productId: product.id, quantity, expectedUnitPriceCents: 1025 }] }, options.customer === false ? undefined : "customer-test");
  return saved;
}

test("recompensas preservam centavos líquidos e arredondamento por unidade nos dois descontos", async () => {
  for (const [cashback, coins, expected] of [[1, 0, 419], [0, 1, 419], [1, 1, 418], [10, 10, 400], [0, 0, 420], [10250, 10250, 0]]) {
    const saved = await rewardSnapshot(cashback, coins);
    assert.equal(saved.cashbackEarnedCents, expected);
    assert.equal(saved.wimicoinsEarnedPoints, expected);
    assert.equal(saved.totalCents, 20 * 1025 - cashback - coins);
    const items = saved.items as { create: { cashbackEarnedCents: number; wimicoinsEarnedPoints: number }[] };
    assert.equal(items.create[0].cashbackEarnedCents, expected);
    assert.equal(items.create[0].wimicoinsEarnedPoints, expected);
  }
});

test("recompensas mantêm exclusões, adesão e compra sem desconto", async () => {
  for (const options of [{ requiresPrescription: true }, { customer: false }]) {
    const saved = await rewardSnapshot(0, 0, options);
    assert.equal(saved.cashbackEarnedCents, 0);
    assert.equal(saved.wimicoinsEarnedPoints, 0);
  }
  await assert.rejects(rewardSnapshot(0, 0, { isPopularPharmacy: true }), /precisa de atendimento/);
  const noMember = await rewardSnapshot(0, 0, { member: false, quantity: 1 });
  assert.equal(noMember.cashbackEarnedCents, 21);
  assert.equal(noMember.wimicoinsEarnedPoints, 0);
});
