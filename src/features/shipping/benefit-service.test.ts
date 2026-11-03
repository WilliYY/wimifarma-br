import assert from "node:assert/strict";
import test from "node:test";
import { cartShippingBenefit } from "./benefit-service";
import { shippingOperationalRouteKey } from "./operational-cost";
import type { ShippingSettings } from "./schema";

const now = Date.parse("2026-10-25T12:00:00Z");
function fixture() {
  const settings: ShippingSettings = { enabled: true, environment: "production", originPostalCode: "87525000", originCity: "Ivaté", originState: "PR", preparationDays: 1, serviceIds: [1], contactEmail: "synthetic@example.invalid", postingLocations: [{ serviceId: 1, city: "Ivaté", state: "PR" }],
    freeShippingPolicy: { enabled: true, maximumSubsidyCents: 2500, minimumContributionBps: 1000, variableCostReserveBps: 700, packagingCostCents: 100, costMaxAgeHours: 24 } };
  settings.operationalCosts = [{ serviceId: 1, routeKey: shippingOperationalRouteKey(settings, 1), tripCostCents: 0, parcelsPerTrip: 1, collectionFeeCents: 0, extraInsuranceCents: 0, returnReserveCents: 0, otherFeesCents: 0 }];
  const product = { id: "synthetic", inventorySource: "DISTRIBUTOR" as const, eanNormalized: "07891234567895", requiresPrescription: false, supplierMarkupBps: 10000, cashbackEnabled: false, wimicoinsEnabled: false,
    supplierOffers: [{ id: "synthetic-offer", supplier: "ANB", eanNormalized: "07891234567895", unitCostCents: 10000, available: true, stockQuantity: 10, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 60_000), validUntil: new Date(now + 60_000) }] };
  return { settings, products: [product], items: [{ productId: product.id, quantity: 1, unitPriceCents: 20000 }], subtotalCents: 20000, discountCents: 0, quote: { serviceId: 1, priceCents: 2000, packaging: { packages: [{}] } }, economicPriceCents: 2000, now };
}

test("cotação e pagamento usam custos finais atuais sem somar ST novamente", () => {
  const f = fixture();
  assert.equal(cartShippingBenefit(f).customerPriceCents, 0);
  const result = JSON.stringify(cartShippingBenefit(f));
  for (const privateField of ["unitCostCents", "acquisitionCost", "supplier", "Contribution", "ReserveBps"]) assert.equal(result.includes(privateField), false);
  f.products[0].supplierOffers[0].validUntil = new Date(now - 1);
  assert.equal(cartShippingBenefit(f).subsidyCents, 0, "historical demand offers do not fund a new benefit");
});

test("custos locais desconhecidos, rota incompleta e volumes desconhecidos mantêm frete normal", () => {
  const local = fixture();
  assert.equal(cartShippingBenefit({ ...local, products: [{ ...local.products[0], inventorySource: "PHARMACY" }] }).customerPriceCents, 2000);
  const route = fixture();
  route.settings.operationalCosts = [];
  assert.equal(cartShippingBenefit(route).customerPriceCents, 2000);
  const packing = fixture();
  assert.equal(cartShippingBenefit({ ...packing, quote: { serviceId: 1, priceCents: 2000 } }).subsidyCents, 0);
});

function historicalFixture() {
  const f = fixture();
  f.settings.freeShippingPolicy = { enabled: true, fundingMode: "HISTORICAL_MARGIN_SHARE", marginShareBps: 5000, historicalCostMaxAgeHours: 720,
    maximumSubsidyCents: null, minimumContributionBps: null, variableCostReserveBps: null, packagingCostCents: null, costMaxAgeHours: 24 };
  return { ...f, products: f.products.map(product => ({ ...product, supplierDemandAllowed: true })) };
}

test("histórico usa aquisição elegível de até30dias sem renovar datas; respeita demanda real", () => {
  const f = historicalFixture(), offer = f.products[0].supplierOffers[0];
  offer.observedAt = new Date(now - 720 * 3600000); offer.validUntil = new Date(offer.observedAt.getTime() + 3600000);
  const before = structuredClone(f);
  assert.equal(cartShippingBenefit(f).customerPriceCents, 0); assert.deepEqual(f, before);
  assert.equal(cartShippingBenefit({ ...f, products: [{ ...f.products[0], supplierDemandAllowed: false }] }).subsidyCents, 0);
  const { supplierDemandAllowed: _demand, ...withoutDemand } = f.products[0]; void _demand;
  assert.equal(cartShippingBenefit({ ...f, products: [withoutDemand] }).customerPriceCents, 0, "produto bruto usa a política computada canônica");
  offer.observedAt = new Date(now - 720 * 3600000 - 1);
  assert.equal(cartShippingBenefit(f).subsidyCents, 0);
});

test("histórico filtra antes de escolher; custo antigo barato não esconde custo elegível", () => {
  const f = historicalFixture(), current = f.products[0].supplierOffers[0];
  current.observedAt = new Date(now - 48 * 3600000); current.validUntil = new Date(now - 47 * 3600000);
  f.products[0].supplierOffers.unshift({ ...current, id: "synthetic-old", unitCostCents: 100, observedAt: new Date(now - 721 * 3600000), validUntil: new Date(now - 720 * 3600000) });
  f.quote.priceCents = 10000; f.economicPriceCents = 10000;
  assert.equal(cartShippingBenefit(f).subsidyCents, 4700);
});

test("histórico recusa custo futuro, EAN diferente, indisponível, quantidade insuficiente e PHARMACY", () => {
  for (const patch of [{ observedAt: new Date(now + 1) }, { eanNormalized: "07890000000000" }, { available: false }]) {
    const f = historicalFixture(); Object.assign(f.products[0].supplierOffers[0], patch);
    assert.equal(cartShippingBenefit(f).subsidyCents, 0);
  }
  const quantity = historicalFixture(); quantity.products[0].supplierDemandAllowed = false; quantity.products[0].supplierOffers[0].allocationQuantity = 0;
  assert.equal(cartShippingBenefit(quantity).subsidyCents, 0);
  const local = historicalFixture();
  assert.equal(cartShippingBenefit({ ...local, products: [{ ...local.products[0], inventorySource: "PHARMACY" }] }).subsidyCents, 0);
});

test("histórico reserva Pix, carteiras e todos ganhos elegíveis antes de subsidiar; frete caro permanece pago", () => {
  const f = historicalFixture(); f.quote.priceCents = 6000; f.economicPriceCents = 6000;
  const products = [{ ...f.products[0], cashbackEnabled: true, cashbackRateBps: 100, wimicoinsEnabled: true, wimicoinsRateBps: 200 }];
  assert.equal(cartShippingBenefit({ ...f, products }).subsidyCents, 4400);
  assert.equal(cartShippingBenefit({ ...f, products, discountCents: 1000 }).subsidyCents, 3915);
  assert.equal(cartShippingBenefit({ ...f, products, discountCents: 10000 }).subsidyCents, 0);
  const result = cartShippingBenefit(f);
  assert.equal(result.status, "discounted"); assert.equal(result.customerPriceCents, 1300);
});

test("histórico usa extras parciais conhecidos e embalagem por volume, mantendo custos null e contador real", () => {
  const f = historicalFixture(); f.quote.priceCents = 10000; f.economicPriceCents = 10000;
  f.settings.operationalCosts![0] = { ...f.settings.operationalCosts![0], tripCostCents: null, collectionFeeCents: 200 };
  f.settings.freeShippingPolicy!.packagingCostCents = 100;
  f.quote.packaging.packages = [{}, {}];
  const before = structuredClone(f);
  assert.equal(cartShippingBenefit(f).subsidyCents, 4500); assert.deepEqual(f, before);
  assert.equal(cartShippingBenefit({ ...f, quote: { serviceId: 1, priceCents: 10000 } }).subsidyCents, 0);
  assert.equal(cartShippingBenefit({ ...f, quote: { ...f.quote, packaging: { packages: [] } } }).subsidyCents, 0);
  f.settings.operationalCosts = []; f.settings.freeShippingPolicy!.packagingCostCents = null;
  assert.equal(cartShippingBenefit(f).subsidyCents, 4700);
  assert.equal(f.settings.freeShippingPolicy!.packagingCostCents, null);
});

test("resgates e recompensas reduzem subsídio; cada volume reserva sua embalagem", () => {
  const f = fixture();
  assert.equal(cartShippingBenefit({ ...f, discountCents: 15000 }).subsidyCents, 0);
  assert.equal(cartShippingBenefit({ ...f, products: [{ ...f.products[0], cashbackEnabled: true, cashbackRateBps: 10000 }] }).subsidyCents, 0);
  f.settings.freeShippingPolicy!.packagingCostCents = 2000;
  const one = cartShippingBenefit(f);
  const four = cartShippingBenefit({ ...f, quote: { ...f.quote, packaging: { packages: [{}, {}, {}, {}] } } });
  assert.ok(one.subsidyCents > four.subsidyCents);
});
