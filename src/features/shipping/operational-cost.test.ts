import assert from "node:assert/strict";
import test from "node:test";
import { defaultShippingSettings } from "./schema";
import { estimateShippingOperationalCost, shippingOperationalRouteKey } from "./operational-cost";
import { shippingOperationalCostSchema } from "./operational-cost-schema";

const settings = { ...defaultShippingSettings, postingLocations: [{ serviceId: 3, city: "Umuarama", state: "PR" as const, pointName: "Ponto sintético" }] };
const quote = { serviceId: 3, priceCents: 1800 };
const complete = { serviceId: 3, routeKey: shippingOperationalRouteKey(settings, 3), tripCostCents: 6000, parcelsPerTrip: 10, collectionFeeCents: 0, extraInsuranceCents: 0, returnReserveCents: 100, otherFeesCents: 50 };

test("full cost allocates a round trip and adds only explicitly known external costs", () => {
  const result = estimateShippingOperationalCost(quote, { ...settings, operationalCosts: [complete] });
  assert.equal(result.travelAllocatedCents, 600);
  assert.equal(result.labelPriceCents, 1800);
  assert.equal(result.totalCostCents, 2550);
  assert.equal(result.knownSubtotalCents, 2550);
  assert.equal(result.complete, true);
  assert.deepEqual(result.missing, []);
});

test("unknown costs and missing posting routes never become zero or a complete total", () => {
  const unknown = estimateShippingOperationalCost(quote, settings);
  assert.equal(unknown.totalCostCents, null);
  assert.equal(unknown.knownSubtotalCents, 1800);
  assert.equal(unknown.complete, false);
  const partial = estimateShippingOperationalCost(quote, { ...settings, operationalCosts: [{ ...complete, collectionFeeCents: null }] });
  assert.equal(partial.totalCostCents, null);
  assert.ok(partial.missing.includes("Coleta adicional"));
  assert.equal(estimateShippingOperationalCost(quote, { ...settings, postingLocations: [], operationalCosts: [complete] }).totalCostCents, null);
  const blank = { ...settings, postingLocations: [{ ...settings.postingLocations[0], city: "" }] };
  assert.equal(shippingOperationalRouteKey(blank, 3), "");
  assert.equal(estimateShippingOperationalCost(quote, { ...blank, operationalCosts: [{ ...complete, routeKey: "" }] }).totalCostCents, null);
});

test("explicit zero is valid and insured merchandise is not added to label price", () => {
  const zero = { ...complete, tripCostCents: 0, collectionFeeCents: 0, extraInsuranceCents: 0, returnReserveCents: 0, otherFeesCents: 0 };
  const result = estimateShippingOperationalCost(quote, { ...settings, operationalCosts: [zero] });
  assert.equal(result.totalCostCents, 1800);
  assert.equal(result.complete, true);
});

test("costs from another origin, posting city or point cannot be reused silently", () => {
  for (const changed of [{ ...settings, originPostalCode: "87501070" }, { ...settings, postingLocations: [{ ...settings.postingLocations[0], city: "Maringá" }] }, { ...settings, postingLocations: [{ ...settings.postingLocations[0], pointName: "Outro ponto" }] }]) {
    const result = estimateShippingOperationalCost(quote, { ...changed, operationalCosts: [complete] });
    assert.equal(result.totalCostCents, null);
    assert.equal(result.travelAllocatedCents, null);
    assert.equal(result.knownSubtotalCents, 1800);
    assert.ok(result.missing.some(value => /rota/i.test(value)));
  }
});

test("trip division rounds conservatively in cents and invalid cost values are rejected", () => {
  const result = estimateShippingOperationalCost(quote, { ...settings, operationalCosts: [{ ...complete, tripCostCents: 6100, parcelsPerTrip: 3 }] });
  assert.equal(result.travelAllocatedCents, 2034);
  for (const patch of [{ tripCostCents: -1 }, { parcelsPerTrip: 0 }, { parcelsPerTrip: 1.5 }, { otherFeesCents: 0.5 }, { routeKey: "x".repeat(401) }]) assert.equal(shippingOperationalCostSchema.safeParse({ ...complete, ...patch }).success, false);
});
