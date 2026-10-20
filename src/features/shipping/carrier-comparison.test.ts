import assert from "node:assert/strict";
import test from "node:test";
import { buildShippingComparisons } from "./carrier-comparison";
import { defaultShippingSettings, shippingSettingsSchema, type ShippingOption } from "./schema";
import { shippingOperationalRouteKey } from "./operational-cost";

const settings = { ...defaultShippingSettings, contactEmail: "synthetic@example.invalid", postingLocations: [1, 2, 3].map(serviceId => ({ serviceId, city: serviceId === 3 ? "Umuarama" : "Ivaté", state: "PR" as const })) };
const costs = [1, 2, 3].map(serviceId => ({ serviceId, routeKey: shippingOperationalRouteKey(settings, serviceId), tripCostCents: serviceId === 3 ? 6000 : 0, parcelsPerTrip: 1, collectionFeeCents: 0, extraInsuranceCents: 0, returnReserveCents: 0, otherFeesCents: 0 }));
const quotes: ShippingOption[] = [1, 2, 3, 12].map(serviceId => ({ provider: "melhor-envio", serviceId, carrier: `Transportadora ${serviceId}`, service: `Serviço ${serviceId}`, priceCents: serviceId === 3 ? 1000 : 2000, deliveryDays: 5 }));

test("a cheaper label loses to a viable complete route after round-trip travel", () => {
  const comparisons = buildShippingComparisons(quotes, { ...settings, operationalCosts: costs }, ["general"]);
  assert.equal(comparisons[0].quote.serviceId, 1);
  assert.equal(comparisons.find(entry => entry.quote.serviceId === 3)?.cost.totalCostCents, 7000);
  assert.equal(comparisons.find(entry => entry.quote.serviceId === 3)?.bestKnownCost, false);
  assert.equal(comparisons.find(entry => entry.quote.serviceId === 12)?.canRecommend, false, "missing route and costs cannot be recommended");
  assert.equal(quotes[2].priceCents, 1000, "comparison never rewrites a label price");
});

test("review cannot override a prohibition and conditional routes need confirmation", () => {
  const configured = { ...settings, operationalCosts: costs };
  assert.equal(buildShippingComparisons(quotes, configured, ["medication"]).some(entry => entry.bestKnownCost), false);
  const confirmed = buildShippingComparisons(quotes, configured, ["medication"], true);
  assert.equal(confirmed.find(entry => entry.quote.serviceId === 1)?.bestKnownCost, true);
  assert.equal(confirmed.find(entry => entry.quote.serviceId === 3)?.cargo.status, "blocked");
  assert.equal(confirmed.find(entry => entry.quote.serviceId === 3)?.canRecommend, false);
  assert.equal(buildShippingComparisons(quotes, configured, ["unspecified"], true).some(entry => entry.canRecommend), false);
});

test("cost records persist without enabling a service and duplicate service costs are invalid", () => {
  const persisted = shippingSettingsSchema.parse({ ...settings, serviceIds: [1], operationalCosts: costs });
  assert.deepEqual(persisted.serviceIds, [1]);
  assert.deepEqual(persisted.operationalCosts, costs);
  assert.equal(shippingSettingsSchema.safeParse({ ...persisted, operationalCosts: [costs[0], costs[0]] }).success, false);
});
