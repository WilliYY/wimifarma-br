import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash, webcrypto } from "node:crypto";
import { prescriptionCartFingerprint } from "./prescription-upload";

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
    $queryRaw: async () => [],
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
    args.path.endsWith("wallet") ? "export class CashbackRuleError extends Error{}; export class ClubRuleError extends Error{}; export const lockCashbackAccount=async()=>({id:'wallet-test',balance:{lessThan:()=>false}}); export const lockWimicoinAccount=async()=>({id:'coins-wallet-test'}); export const reserveWimicoins=async(_,input)=>{if(globalThis.pixFixture) globalThis.pixFixture.reservedCoins=input.points};" :
    args.path.endsWith("shipping/service") ? "export const validateOrderShipping=async()=>globalThis.pixFixture?.shippingQuote ?? null;" :
    args.path.endsWith("schema") ? "export class PaymentError extends Error{};" :
    args.path.endsWith("routing") ? "export const checkoutPaymentConnections=async()=>({rows:[]}); export const resolveCheckoutPayment=async(_,input)=>{globalThis.pixFixture.routed=input;return {integration:{id:'mercadopago',environment:'production',revision:1,accountId:'synthetic'},route:{}}};" : "export const queueCommerceOrder=async()=>{};",
  }));
} }] });

async function rewardSnapshot(cashback: number, coins: number, options: { quantity?: number; requiresPrescription?: boolean; isPopularPharmacy?: boolean; customer?: boolean; member?: boolean } = {}) {
  const quantity = options.quantity ?? 20;
  let saved: Record<string, unknown> = {};
  const product = { id: "reward-product", name: "Produto sintético", slug: "produto-sintetico", imageUrl: null, price: "10.25", promotionalPrice: null,
    status: "ACTIVE", stock: 100, requiresPrescription: false, prescriptionType: "ORDINARY", isPopularPharmacy: false,
    cashbackEnabled: true, cashbackRateBps: 200, wimicoinsEnabled: true, wimicoinsRateBps: 200, ...options };
  const tx = {
    $queryRaw: async () => [],
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

async function prescriptionCheckout(options: { type?: string; attachment?: Record<string, unknown>; uploadId?: boolean; signedOut?: boolean; mutateToAntimicrobial?: boolean } = {}) {
  let order: Record<string, unknown> | null = null; let reads = 0; let links = 0;
  const product = { id: "synthetic-antimicrobial", ean: "7890000000015", name: "Produto sintético", slug: "synthetic", imageUrl: null, price: "10.00", promotionalPrice: null, stock: 10, status: "ACTIVE", requiresPrescription: true, prescriptionType: options.type ?? "ANTIMICROBIAL", isPopularPharmacy: false, cashbackEnabled: false, cashbackRateBps: 0, wimicoinsEnabled: false, wimicoinsRateBps: 0 };
  const items = [{ productId: product.id, quantity: 1, expectedUnitPriceCents: 1000 }];
  const attachment = { customerId: "customer-test", orderId: null as string | null, expiresAt: new Date(Date.now() + 60_000), cartFingerprint: prescriptionCartFingerprint([product], items), submissionId: "synthetic-request", ...options.attachment };
  const tx = {
    $queryRaw: async () => [], $executeRaw: async () => 0,
    customer: { findFirst: async () => ({ id: "customer-test" }) },
    clubMembership: { findUnique: async () => null },
    product: { findMany: async () => { reads++; return [{ ...product, prescriptionType: options.mutateToAntimicrobial && reads > 1 ? "ANTIMICROBIAL" : product.prescriptionType }]; } },
    prescriptionUpload: { findUnique: async () => attachment, updateMany: async () => { links++; attachment.orderId = "synthetic-order"; return { count: 1 }; } },
    order: { findUnique: async () => order, create: async ({ data }: { data: Record<string, unknown> }) => (order = { ...data, id: "synthetic-order" }), findUniqueOrThrow: async () => order },
  };
  const loaded = { exports: {} as { createCheckout: (tx: unknown, input: unknown, customer?: string) => Promise<unknown> } };
  vm.runInNewContext((await rewardsBundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), crypto: webcrypto, console });
  const input = { checkoutRequestId: "synthetic-request", prescriptionUploadId: options.uploadId === false ? undefined : "synthetic-upload", customer: { name: "Cliente sintético", email: "synthetic@example.com", phone: "44999999999" }, fulfillmentMethod: "PICKUP", paymentMethod: "CASH", cashbackRedeemCents: 0, privacyConsent: true, items };
  return { attachment, order: () => order, links: () => links, run: () => loaded.exports.createCheckout(tx, input, options.signedOut ? undefined : "customer-test") };
}

test("antimicrobial checkout associates private attachment once and retry survives its TTL", async () => {
  const f = await prescriptionCheckout(); await f.run();
  assert.equal(f.order()?.requiresPrescriptionReview, true); assert.equal(f.links(), 1);
  assert.equal(f.order()?.prescriptionReviewedAt, undefined);
  assert.equal(JSON.stringify(f.order()).includes("ciphertext"), false);
  f.attachment.expiresAt = new Date(0);
  await f.run(); assert.equal(f.links(), 1);
});

test("checkout rejects missing/foreign/expired/reused/cart-mismatched/submission-mismatched attachments", async () => {
  for (const options of [{ uploadId: false }, { signedOut: true }, { attachment: { customerId: "other" } }, { attachment: { orderId: "other-order" } }, { attachment: { expiresAt: new Date(0) } }, { attachment: { cartFingerprint: "changed" } }, { attachment: { submissionId: "changed" } }, { type: "ORDINARY" }]) {
    const f = await prescriptionCheckout(options); await assert.rejects(f.run); assert.equal(f.order(), null); assert.equal(f.links(), 0);
  }
});

test("classification becoming antimicrobial while checkout waits cannot bypass upload", async () => {
  const f = await prescriptionCheckout({ type: "ORDINARY", uploadId: false, mutateToAntimicrobial: true });
  await assert.rejects(f.run, /envie a receita/); assert.equal(f.order(), null);
});

async function pixCheckout(options: { paymentMethod?: string; onlineMethod?: string; cashback?: number; coins?: number; subtotal?: number; shipping?: number; previousTotal?: number; secondProduct?: boolean; quantity?: number } = {}) {
  let saved: Record<string, unknown> = {};
  let productReads = 0;
  let reservedCashback: unknown;
  const audits: { action: string; metadata: Record<string, number> }[] = [];
  const subtotal = options.subtotal ?? 10000;
  const input = { checkoutRequestId: "synthetic-pix-request", customer: { name: "Cliente sintético", email: "synthetic@example.com", phone: "44999999999" },
    fulfillmentMethod: options.shipping ? "DELIVERY" : "PICKUP", paymentMethod: options.paymentMethod ?? "PIX", onlineMethod: options.onlineMethod,
    cashbackRedeemCents: options.cashback ?? 0, wimicoinsRedeemPoints: options.coins ?? 0, privacyConsent: true,
    items: [{ productId: "synthetic-pix-product", quantity: options.quantity ?? 1, expectedUnitPriceCents: subtotal }, ...(options.secondProduct ? [{ productId: "synthetic-second", quantity: 1, expectedUnitPriceCents: 1025 }] : [])] };
  const product = { id: "synthetic-pix-product", name: "Produto sintético", slug: "synthetic", imageUrl: null, price: (subtotal / 100).toFixed(2), promotionalPrice: null,
    stock: 100, status: "ACTIVE", requiresPrescription: false, prescriptionType: "ORDINARY", isPopularPharmacy: false,
    cashbackEnabled: true, cashbackRateBps: 200, wimicoinsEnabled: true, wimicoinsRateBps: 200 };
  const previous = options.previousTotal === undefined ? null : { id: "synthetic-old-order", customerId: "synthetic-customer", totalCents: options.previousTotal,
    checkoutRequestHash: createHash("sha256").update(JSON.stringify({ ...input, checkoutRequestId: undefined })).digest("hex") };
  const state = { shippingQuote: options.shipping ? { priceCents: options.shipping } : null, routed: undefined as { amountCents: number } | undefined, reservedCoins: 0 };
  const tx = {
    $queryRaw: async () => [], $executeRaw: async () => 0,
    customer: { findFirst: async () => ({ id: "synthetic-customer" }) }, clubMembership: { findUnique: async () => ({ active: true }) },
    product: { findMany: async () => { productReads++; return [product, ...(options.secondProduct ? [{ ...product, id: "synthetic-second", slug: "synthetic-second", price: "10.25" }] : [])]; } },
    order: { findUnique: async () => previous, create: async ({ data }: { data: Record<string, unknown> }) => (saved = { ...data, id: "synthetic-order", number: "TEST-PIX" }), findUniqueOrThrow: async () => previous ?? saved },
    cashbackAccount: { update: async (value: unknown) => { reservedCashback = value; } }, cashbackTransaction: { create: async () => ({}) },
    auditLog: { create: async ({ data }: { data: typeof audits[number] }) => { audits.push(data); } },
  };
  const loaded = { exports: {} as { createCheckout: (tx: unknown, input: unknown, customer?: string) => Promise<unknown> } };
  vm.runInNewContext((await rewardsBundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), crypto: webcrypto, console, pixFixture: state });
  const result = await loaded.exports.createCheckout(tx, input, "synthetic-customer");
  return { saved, result, audits, state, productReads, reservedCashback };
}

test("Pix manual aplica 3% após cashback e WimiCoins sem alterar resgates ou preços", async () => {
  const { saved, audits, reservedCashback, state } = await pixCheckout({ cashback: 1000, coins: 500 });
  assert.equal(saved.totalCents, 8245);
  assert.equal(saved.subtotalCents, 10000);
  assert.equal(saved.cashbackRedeemedCents, 1000);
  assert.equal(saved.wimicoinsRedeemedPoints, 500);
  assert.equal(state.reservedCoins, 500);
  assert.deepEqual(JSON.parse(JSON.stringify(reservedCashback)), { where: { id: "wallet-test" }, data: { balance: { decrement: "10.00" } } });
  const item = (saved.items as { create: Record<string, number>[] }).create[0];
  assert.equal(item.unitPriceCents, 10000);
  assert.equal(item.totalCents, 10000);
  assert.equal(item.cashbackDiscountCents, 1000);
  assert.equal(item.wimicoinsDiscountPoints, 500);
  assert.equal(saved.cashbackEarnedCents, 165);
  assert.equal(saved.wimicoinsEarnedPoints, 165);
  const audit = audits.find(a => a.action === "PIX_DISCOUNT_APPLIED");
  assert.equal(audit?.metadata.baseCents, 8500);
  assert.equal(audit?.metadata.percent, 3);
  assert.equal(audit?.metadata.discountCents, 255);
});

test("Pix online explícito ou padrão congela o mesmo total reduzido no pedido e gateway", async () => {
  for (const onlineMethod of [undefined, "pix"]) {
    const { saved, state } = await pixCheckout({ paymentMethod: "ONLINE", onlineMethod, subtotal: 1025 });
    assert.equal(saved.totalCents, 994);
    assert.equal(state.routed?.amountCents, 994);
    assert.equal((saved.onlinePayment as { create: { amountCents: number } }).create.amountCents, 994);
  }
});

test("cartão e dinheiro não recebem desconto Pix mesmo com onlineMethod pix", async () => {
  for (const options of [{ paymentMethod: "CASH", onlineMethod: "pix" }, { paymentMethod: "CARD_ON_DELIVERY", onlineMethod: "pix" }, { paymentMethod: "ONLINE", onlineMethod: "card" }]) {
    const { saved, audits } = await pixCheckout(options);
    assert.equal(saved.totalCents, 10000);
    assert.equal(saved.cashbackEarnedCents, 200);
    assert.equal(audits.some(a => a.action === "PIX_DISCOUNT_APPLIED"), false);
  }
});

test("Pix preserva valor do frete e limiar de gratuidade anterior ao desconto Pix", async () => {
  const paid = await pixCheckout({ subtotal: 10000, cashback: 1000, coins: 500, shipping: 1200 });
  assert.equal(paid.saved.deliveryFeeCents, 1200);
  assert.equal(paid.saved.totalCents, 9445);
  const free = await pixCheckout({ subtotal: 10000, shipping: 1200 });
  assert.equal(free.saved.deliveryFeeCents, 0);
  assert.equal(free.saved.totalCents, 9700);
});

test("Pix rateia centavos líquidos entre produtos antes das recompensas", async () => {
  const { saved } = await pixCheckout({ subtotal: 1025, secondProduct: true, cashback: 1, coins: 1 });
  assert.equal(saved.totalCents, 1987);
  assert.equal(saved.cashbackEarnedCents, 40);
  assert.equal(saved.wimicoinsEarnedPoints, 40);
  const items = (saved.items as { create: Record<string, number>[] }).create;
  assert.deepEqual(Array.from(items, item => item.cashbackEarnedCents), [20, 20]);
});

test("Pix mantém arredondamento por unidade com centavos residuais após os resgates", async () => {
  const { saved } = await pixCheckout({ subtotal: 1025, quantity: 20, cashback: 1, coins: 1 });
  assert.equal(saved.totalCents, 19883);
  assert.equal(saved.cashbackEarnedCents, 400);
  assert.equal(saved.wimicoinsEarnedPoints, 400);
});

test("saldo cobre produtos sem desconto Pix ou auditoria e repetição preserva pedido antigo", async () => {
  const covered = await pixCheckout({ cashback: 10000 });
  assert.equal(covered.saved.totalCents, 0);
  assert.equal(covered.audits.some(a => a.action === "PIX_DISCOUNT_APPLIED"), false);
  const old = await pixCheckout({ paymentMethod: "ONLINE", previousTotal: 10000 });
  assert.equal((old.result as { totalCents: number }).totalCents, 10000);
  assert.equal(old.productReads, 0);
  assert.equal(old.state.routed, undefined);
  assert.equal(old.audits.length, 0);
});
