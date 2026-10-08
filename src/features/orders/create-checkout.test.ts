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
