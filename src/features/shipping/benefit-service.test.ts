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

test("resgates e recompensas reduzem subsídio; cada volume reserva sua embalagem", () => {
  const f = fixture();
  assert.equal(cartShippingBenefit({ ...f, discountCents: 15000 }).subsidyCents, 0);
  assert.equal(cartShippingBenefit({ ...f, products: [{ ...f.products[0], cashbackEnabled: true, cashbackRateBps: 10000 }] }).subsidyCents, 0);
  f.settings.freeShippingPolicy!.packagingCostCents = 2000;
  const one = cartShippingBenefit(f);
  const four = cartShippingBenefit({ ...f, quote: { ...f.quote, packaging: { packages: [{}, {}, {}, {}] } } });
  assert.ok(one.subsidyCents > four.subsidyCents);
});
