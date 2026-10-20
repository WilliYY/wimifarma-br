import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

const bundle = build({ entryPoints: ["src/features/cashback/review-service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "review-wallet-fixture", setup(builder) {
  builder.onResolve({ filter: /^\.\/wallet$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export class CashbackRuleError extends Error{}; export const lockCashbackAccount=async()=>({id:'synthetic-wallet'});" }));
} }] });

type Item = { productId: string; productSlug: string; unitPriceCents: number; quantity: number; totalCents: number; cashbackDiscountCents: number; wimicoinsDiscountPoints: number };
const item = (productSlug = "a", price = 10000): Item => ({ productId: productSlug, productSlug, unitPriceCents: price, quantity: 1, totalCents: price, cashbackDiscountCents: 0, wimicoinsDiscountPoints: 0 });

async function fixture(options: { items?: Item[]; totalCents?: number; existing?: boolean; credited?: boolean } = {}) {
  const items = options.items ?? [item()];
  const order = { id: "synthetic-order", number: "TEST-REVIEW", status: "COMPLETED", paymentStatus: "PAID", subtotalCents: items.reduce((sum, i) => sum + i.totalCents, 0),
    cashbackRedeemedCents: items.reduce((sum, i) => sum + i.cashbackDiscountCents, 0), wimicoinsRedeemedPoints: items.reduce((sum, i) => sum + i.wimicoinsDiscountPoints, 0),
    deliveryFeeCents: 1200, totalCents: options.totalCents ?? 10900, items };
  const credits: { amount: string; eventKey: string }[] = [];
  let accountUpdates = 0;
  let review = options.existing ? { id: "synthetic-review" } : null;
  const tx = {
    $queryRaw: async () => [], customer: { findFirst: async () => ({ id: "synthetic-customer" }) },
    product: { findFirst: async () => ({ requiresPrescription: false, isPopularPharmacy: false }) },
    order: { findFirst: async () => ({ id: order.id }), findUniqueOrThrow: async ({ include }: { include: { items: { where?: { productId: string } } | boolean } }) => {
      const selectedProduct = typeof include.items === "object" ? include.items.where?.productId : undefined;
      return { ...order, items: selectedProduct ? items.filter(i => i.productId === selectedProduct) : items };
    } },
    productReview: { findUnique: async () => review, update: async () => review,
      create: async ({ data }: { data: Record<string, unknown> }) => (review = { id: "synthetic-review", ...data }) },
    cashbackTransaction: { findUnique: async () => options.credited ? { id: "synthetic-credit" } : null,
      create: async ({ data }: { data: typeof credits[number] }) => { credits.push(data); } },
    cashbackAccount: { update: async () => { accountUpdates++; } }, auditLog: { create: async () => ({}) },
  };
  const loaded = { exports: {} as { saveRewardedReview: (tx: unknown, customer: string, product: string, input: unknown) => Promise<{ awardedCents: number }> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), console });
  return { credits, accountUpdates: () => accountUpdates, run: (productId = "a") => loaded.exports.saveRewardedReview(tx, "synthetic-customer", productId, { comment: "Avaliação sintética", rating: 5 }) };
}

test("bônus de avaliação abate Pix congelado e preserva pedido anterior sem desconto", async () => {
  for (const [totalCents, expected] of [[10900, 97], [11200, 100], [10700, 95]]) {
    const f = await fixture({ totalCents });
    assert.equal((await f.run()).awardedCents, expected);
    assert.equal(f.credits[0].amount, (expected / 100).toFixed(2));
  }
});

test("bônus usa todos os itens e desempata centavo pelo slug com ordem permutada", async () => {
  for (const items of [[item("b", 154), item("a", 154)], [item("a", 154), item("b", 154)]]) {
    assert.equal((await (await fixture({ items, totalCents: 1499 })).run("a")).awardedCents, 1);
    assert.equal((await (await fixture({ items, totalCents: 1499 })).run("b")).awardedCents, 2);
  }
});

test("bônus preserva resgates e quantidade sem multiplicar recompensa", async () => {
  const redeemed = { ...item(), cashbackDiscountCents: 1000, wimicoinsDiscountPoints: 500 };
  assert.equal((await (await fixture({ items: [redeemed], totalCents: 9445 })).run()).awardedCents, 82);
  assert.equal((await (await fixture({ items: [redeemed], totalCents: 9700 })).run()).awardedCents, 85);
  assert.equal((await (await fixture({ items: [{ ...item(), quantity: 3, totalCents: 30000 }], totalCents: 30300 })).run()).awardedCents, 97);
});

test("edição, repetição e crédito já existente não duplicam bônus após Pix", async () => {
  const f = await fixture();
  assert.equal((await f.run()).awardedCents, 97);
  assert.equal((await f.run()).awardedCents, 0);
  assert.equal(f.credits.length, 1);
  assert.equal(f.accountUpdates(), 1);
  for (const options of [{ existing: true }, { credited: true }]) {
    const previous = await fixture(options);
    assert.equal((await previous.run()).awardedCents, 0);
    assert.equal(previous.credits.length, 0);
  }
});
