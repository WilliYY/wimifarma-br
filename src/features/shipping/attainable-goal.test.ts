import assert from "node:assert/strict";
import test from "node:test";
import { resolveAttainableShippingGoals } from "./attainable-goal";
import { cartShippingBenefit } from "./benefit-service";
import { defaultShippingSettings, type ShippingOption } from "./schema";
import type { PackingProduct } from "./packing";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { verifyShippingQuote } from "./rules";
import { checkoutRequestSchema } from "@/features/orders/checkout";
import { toSaleProduct } from "@/features/supplier-catalog/commerce";

const now = Date.now();
function fixture(priceCents = 2000, shippingCents = 1200) {
  const settings = { ...defaultShippingSettings, enabled: true, contactEmail: "synthetic@example.invalid", serviceIds: [1, 2], freeShippingPolicy: {
    enabled: true, fundingMode: "HISTORICAL_MARGIN_SHARE" as const, marginShareBps: 5000 as const, historicalCostMaxAgeHours: 720,
    maximumSubsidyCents: null, minimumContributionBps: null, variableCostReserveBps: null, packagingCostCents: null as number | null, costMaxAgeHours: 24,
  } };
  const product = { id: "synthetic", name: "Produto sintético", slug: "synthetic", imageUrl: null, category: "Higiene", price: priceCents / 100, promotionalPrice: null,
    status: "ACTIVE" as const, updatedAt: new Date(0), stock: 30, requiresPrescription: false, isPopularPharmacy: false, inventorySource: "DISTRIBUTOR" as const,
    ean: "7891234567895", supplierMarkupBps: 10000, cashbackEnabled: false, cashbackRateBps: 100, wimicoinsEnabled: false, wimicoinsRateBps: 100,
    shippingProfile: { enabled: true, transportReviewed: true, weightGrams: 880, widthCm: 15, heightCm: 10, lengthCm: 20, cargoKinds: ["general"] },
    supplierOffers: [{ id: "synthetic-offer", supplier: "ANB", eanNormalized: "07891234567895", unitCostCents: Math.round(priceCents / 2), available: true,
      stockQuantity: 30, allocationQuantity: 30, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 60000), validUntil: new Date(now + 3600000) }] };
  const products = [product], items = [{ productId: product.id, quantity: 1, unitPriceCents: priceCents }];
  const base = { settings, products, items, subtotalCents: priceCents, discountCents: 0, now };
  const option: ShippingOption = { provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: shippingCents, deliveryDays: 3,
    packaging: { measurementBasis: "estimated", packages: [] } } as unknown as ShippingOption;
  // The policy needs only the actual count; target responses below exercise full packing validation.
  option.packaging!.packages = [{}] as NonNullable<ShippingOption["packaging"]>["packages"];
  const options = [option, { ...option, serviceId: 2, service: "SEDEX", priceCents: shippingCents + 2000 }].map(quote => ({ ...quote,
    benefit: cartShippingBenefit({ ...base, quote, economicPriceCents: shippingCents }) }));
  return { ...base, options };
}
function response(products: PackingProduct[], prices = [1200, 3200], split = false) {
  const packages = products.flatMap(p => (split ? Array.from({ length: p.quantity }, () => ({ ...p, quantity: 1 })) : [p]).map(p => ({
    dimensions: { width: p.width, height: p.height * p.quantity, length: p.length }, weight: p.weight * p.quantity,
    insurance_value: p.insurance_value * p.quantity, products: [{ id: p.id, quantity: p.quantity }],
  })));
  return prices.map((price, index) => ({ id: index + 1, name: index ? "SEDEX" : "PAC", price: (price / 100).toFixed(2), delivery_time: 3, company: { name: "Correios" }, packages }));
}

test("Palmolive R$15,95 com meta R$890 excede 20 unidades sem consultar alvo", async () => {
  const f = fixture(1595, 15000); f.options[0].benefit.minimumOrderCents = 89000;
  f.products[0].supplierOffers[0].unitCostCents = 1000; f.products[0].supplierMarkupBps = 5950;
  assert.equal(Number(toSaleProduct(f.products[0], now).price) * 100, 1595, "the bounded cart uses an actual purchasable price");
  let calls = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async () => { calls++; return []; } });
  assert.equal(calls, 0); assert.equal(goals.get(1)?.minimumOrderCents, null);
});

test("meta exata corresponde a quantidades compráveis e serviço realmente grátis; SEDEX pago permanece sem meta", async () => {
  const f = fixture(1998); let quantity = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => { quantity = products[0].quantity; return response(products); } });
  assert.equal(quantity, 3); assert.deepEqual(goals.get(1), { minimumOrderCents: 5994, remainingCents: 3996 });
  assert.deepEqual(goals.get(2), { minimumOrderCents: null, remainingCents: null });
  assert.equal(f.options[1].benefit.customerPriceCents, 2731);
  for (const hidden of ["unitCost", "supplier", "token", "Reserve"]) assert.equal(JSON.stringify([...goals]).includes(hidden), false);
});

test("estoque ou custo elegível insuficiente por quantidade não promete meta", async () => {
  for (const patch of [{ stock: 1, inventorySource: "PHARMACY" as const }, { supplierOffers: [{ ...fixture().products[0].supplierOffers[0], available: false }] }]) {
    const f = fixture(); Object.assign(f.products[0], patch); let calls = 0;
    const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => { calls++; return response(products); } });
    assert.equal(goals.get(1)?.minimumOrderCents, null); assert.equal(calls, 0);
  }
});

test("frete alvo maior exige novo candidato; orçamento limita duas chamadas incluindo retry de embalagem", async () => {
  const f = fixture(); let calls = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => { calls++; return response(products, [3000, 5000]); } });
  assert.equal(calls, 2); assert.deepEqual(goals.get(1), { minimumOrderCents: 14000, remainingCents: 12000 });
  calls = 0;
  const unproved = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => {
    calls++; const quotes = response(products, [3000, 5000]); if (calls === 1) quotes.forEach(q => { q.packages[0].weight = 0; }); return quotes;
  } });
  assert.equal(calls, 2); assert.equal(unproved.get(1)?.minimumOrderCents, null);
});

test("econômico é recalculado para o alvo e não transfere gratuidade para PAC mais caro", async () => {
  const f = fixture();
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => response(products, [3200, 1200]) });
  assert.equal(goals.get(1)?.minimumOrderCents, null); assert.equal(goals.get(2)?.minimumOrderCents, 6000);
});

test("falha técnica encerra advisor; benefício real e entradas continuam intactos", async () => {
  const f = fixture(), before = structuredClone(f); let calls = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async () => { calls++; throw new Error("synthetic 429"); } });
  assert.equal(calls, 1); assert.equal(goals.get(1)?.minimumOrderCents, null); assert.deepEqual(f, before);
});

test("já grátis não requer alvo e conserva null/null", async () => {
  const f = fixture(20000, 1200); let calls = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async () => { calls++; return []; } });
  assert.equal(calls, 0); assert.deepEqual(goals.get(1), { minimumOrderCents: null, remainingCents: null });
});

test("embalagem por volume, recompensas e Pix participam da prova futura", async () => {
  const packaging = fixture(); packaging.settings.freeShippingPolicy.packagingCostCents = 1000;
  const boxed = await resolveAttainableShippingGoals({ ...packaging, quoteTarget: async products => response(products, [1200, 3200], true) });
  assert.equal(boxed.get(1)?.minimumOrderCents, null, "separate packages consume margin for every unit");
  const rewards = fixture(); rewards.products[0].cashbackEnabled = true; rewards.products[0].cashbackRateBps = 1000;
  const rewarded = await resolveAttainableShippingGoals({ ...rewards, quoteTarget: async products => response(products) });
  assert.deepEqual(rewarded.get(1), { minimumOrderCents: 8000, remainingCents: 6000 });
  const pix = fixture(); let calls = 0;
  const reserved = await resolveAttainableShippingGoals({ ...pix, quoteTarget: async products => response(products, [++calls === 1 ? 1440 : 2200, 4200]) });
  assert.equal(reserved.get(1)?.minimumOrderCents, null, "naive half-margin would cover R$14.40 at three units; Pix reserve prevents it");
});

test("oferta de aquisição é resolvida para quantidade futura sem reutilizar custo barato de uma unidade", async () => {
  const f = fixture();
  Object.assign(f.products[0], { supplierDemandAllowed: false });
  f.products[0].supplierOffers[0].allocationQuantity = 1;
  f.products[0].supplierOffers.push({ ...f.products[0].supplierOffers[0], id: "synthetic-large-offer", unitCostCents: 1800, allocationQuantity: 20 });
  let calls = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => { calls++; return response(products); } });
  assert.equal(calls, 1); assert.deepEqual(goals.get(1), { minimumOrderCents: 36000, remainingCents: 34000 });
});

test("aquisição por quantidade pode atingir gratuidade antes da semente legada arredondada", async () => {
  const f = fixture(1998); Object.assign(f.products[0], { supplierDemandAllowed: false });
  f.products[0].supplierOffers[0].allocationQuantity = 1;
  f.products[0].supplierOffers.push({ ...f.products[0].supplierOffers[0], id: "synthetic-quantity-offer", unitCostCents: 1100, allocationQuantity: 20 });
  assert.equal(f.options[0].benefit.minimumOrderCents, 6000);
  let quantity = 0;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => { quantity = products[0].quantity; return response(products); } });
  assert.equal(quantity, 3); assert.deepEqual(goals.get(1), { minimumOrderCents: 5994, remainingCents: 3996 });
});

test("reserva proporcional de desconto é conservadora e restante usa subtotal bruto uma única vez", async () => {
  const f = fixture(1998); f.discountCents = 300;
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async products => response(products) });
  assert.deepEqual(goals.get(1), { minimumOrderCents: 7992, remainingCents: 5994 });
});

test("deadline é compartilhado; alvo tardio não recebe meta nem dispara candidato adicional", async context => {
  const f = fixture(); let elapsed = 0, calls = 0;
  context.mock.method(Date, "now", () => now + elapsed);
  const timeouts: number[] = [];
  const goals = await resolveAttainableShippingGoals({ ...f, quoteTarget: async (products, _ids, timeoutMs) => {
    calls++; timeouts.push(timeoutMs); elapsed += calls === 1 ? 1490 : 11; return response(products, [3000, 5000]);
  } });
  assert.equal(calls, 2); assert.deepEqual(timeouts, [1500, 10]); assert.equal(goals.get(1)?.minimumOrderCents, null);
});

test("cotação do carrinho e produto expõem somente meta verificada; falha futura preserva preço e token reais", async () => {
  const f = fixture(), key = "synthetic-attainable-shipping-key";
  const bundle = await build({ stdin: { contents: 'export { quoteCart, validateOrderShipping } from "./src/features/shipping/service"; export { estimateProductShipping } from "./src/features/shipping/public-estimate";', resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "attainable-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^\.\/integration$|^\.\/provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.tx;" : args.path.endsWith("integration") ? "export const readShippingIntegration=async()=>globalThis.fixture.integration;export const shippingAccessToken=async()=> 'private-provider-token';export const SHIPPING_INTEGRATION_ID='fixture';" : "export const melhorEnvioRequest=async(...args)=>globalThis.fixture.provider(...args);" }));
  } }] });
  let calls = 0, failFuture = false;
  const timeouts: number[] = [];
  const integration = { settings: f.settings, revision: 1 };
  const tx = { product: { findMany: async () => f.products, findUnique: async () => f.products[0] }, shippingIntegration: { findUnique: async () => integration } };
  const runtimeFixture = { integration, tx, provider: async (...args: unknown[]) => {
    calls++; const request = args[3] as { products: PackingProduct[] };
    if (request.products[0].quantity > 1) {
      timeouts.push((args[4] as { timeoutMs: number }).timeoutMs);
      if (failFuture) throw new Error("synthetic 429");
    }
    return response(request.products);
  } };
  const loaded = { exports: {} as { quoteCart: typeof import("./service").quoteCart; validateOrderShipping: typeof import("./service").validateOrderShipping; estimateProductShipping: typeof import("./public-estimate").estimateProductShipping } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), process: { env: { ...process.env, AUTH_SECRET: key } }, Buffer, Date, fixture: runtimeFixture, console });
  const items = [{ productId: f.products[0].id, quantity: 1, expectedUnitPriceCents: 2000 }];
  const quoted = await loaded.exports.quoteCart("01001000", items);
  assert.equal(quoted[0].benefit?.minimumOrderCents, 6000);
  assert.equal(quoted[0].benefit?.remainingCents, 4000);
  assert.equal(calls, 2);
  const payload = verifyShippingQuote(quoted[0].token, key);
  assert.equal(payload.benefit?.minimumOrderCents, 6000);
  const input = checkoutRequestSchema.parse({ customer: { name: "Cliente sintético", phone: "44999990000" }, fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", privacyConsent: true,
    address: { postalCode: "01001000", street: "Rua teste", number: "1", neighborhood: "Teste", city: "São Paulo", state: "SP" }, items, shippingToken: quoted[0].token });
  const savedQuote = await loaded.exports.validateOrderShipping(tx as never, input);
  assert.equal(savedQuote?.benefit.minimumOrderCents, 6000);
  assert.equal(savedQuote?.benefit.remainingCents, 4000);
  assert.equal(calls, 2, "finalization never quotes an advisory cart");
  const estimate = await loaded.exports.estimateProductShipping({ productId: f.products[0].id, quantity: 1, postalCode: "01001000" });
  assert.equal(estimate.options[0].benefit?.minimumOrderCents, 6000);
  assert.equal(timeouts.length, 2); assert.ok(timeouts.every(timeout => timeout > 0 && timeout <= 1500));
  for (const hidden of ["unitCost", "supplier", "token", "packaging", "Reserve"]) assert.equal(JSON.stringify(estimate).includes(hidden), false);
  failFuture = true; calls = 0;
  const degraded = await loaded.exports.quoteCart("01001000", items);
  assert.equal(calls, 2); assert.equal(degraded[0].benefit?.minimumOrderCents, null);
  assert.equal(degraded[0].benefit?.customerPriceCents, quoted[0].benefit?.customerPriceCents);
  assert.equal(verifyShippingQuote(degraded[0].token, key).priceCents, 1200);
  const savedDegradedQuote = await loaded.exports.validateOrderShipping(tx as never, { ...input, shippingToken: degraded[0].token });
  assert.equal(savedDegradedQuote?.benefit.minimumOrderCents, null);
  assert.equal(savedDegradedQuote?.benefit.remainingCents, null);
  assert.equal(calls, 2);
});
