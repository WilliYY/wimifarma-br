import assert from "node:assert/strict";
import test from "node:test";
import { SupplierOfferSchema, SupplierComparisonInputSchema, OrderSimulationInputSchema, type SupplierOffer, type OrderSimulationInput } from "./schema";
import { compareSupplierOffers, priceWithMarkup, simulateOrder } from "./planning";

const now = Date.parse("2026-10-17T12:00:00Z");
const offer: SupplierOffer = { supplier: "ANB", ean: "7891234567895", unitCostCents: 1000, inboundUnitCostCents: 0,
  availability: "AVAILABLE", stockQuantity: 10, checkedAt: "2026-10-17T11:00:00Z", validUntil: "2026-10-17T13:00:00Z" };
const input: OrderSimulationInput = { unitCostCents: 1000, unitSaleCents: 1600, quantity: 2, inboundFreightCents: 0,
  packagingCents: 100, carrierFreightCents: 500, taxBps: 600, paymentFeeBps: 200, paymentFixedCents: 50,
  otherVariableCents: 30, cashbackBps: 200, wimicoinsBps: 200, requiresPrescription: false, isPopularPharmacy: false,
  walletDiscountCents: 0, pixDiscountBps: 300, freeShippingThresholdCents: 9900, freeShippingBeforePix: false,
  pmcRequired: false, pmcCeilingCents: null };

test("validates GTIN lengths and check digits without dropping leading zeros", () => {
  for (const ean of ["96385074", "012345678905", "7891234567895", "10012345678902"]) {
    assert.equal(SupplierOfferSchema.parse({ ...offer, ean }).ean, ean);
  }
  for (const ean of ["7891234567890", "123", "123456789012345", "ABCDEFGHIJKLM"]) {
    assert.equal(SupplierOfferSchema.safeParse({ ...offer, ean }).success, false);
  }
});

test("requires offset timestamps and a positive offer validity of at most 24 hours", () => {
  for (const changes of [{ validUntil: offer.checkedAt }, { validUntil: "2026-10-18T11:00:01Z" },
    { checkedAt: "2026-10-17T11:00:00" }]) assert.equal(SupplierOfferSchema.safeParse({ ...offer, ...changes }).success, false);
  assert.equal(SupplierOfferSchema.safeParse({ ...offer, validUntil: "2026-10-18T11:00:00Z" }).success, true);
});

test("sorts complete comparison options by total cost, recommending only eligible stock", () => {
  const result = compareSupplierOffers({ ean: offer.ean, quantity: 2, offers: [offer,
    { ...offer, supplier: "PROFARMA", unitCostCents: 900, inboundUnitCostCents: 200 },
    { ...offer, supplier: "SANTA_CRUZ", unitCostCents: 800, availability: "UNKNOWN" }] }, now);
  assert.equal(result.best?.supplier, "ANB");
  assert.deepEqual(result.options.map(option => option.totalCostCents), [1600, 2000, 2200]);
  assert.ok(result.options[0].reasons.length > 0);
});

test("never recommends divergent EAN, unknown or insufficient stock, unavailable, future or expired offers", () => {
  for (const changes of [{ ean: "96385074" }, { stockQuantity: null }, { stockQuantity: 1 }, { availability: "UNAVAILABLE" as const },
    { availability: "UNKNOWN" as const }, { checkedAt: "2026-10-17T12:00:01Z" }, { validUntil: "2026-10-17T12:00:00Z" }]) {
    const result = compareSupplierOffers({ ean: offer.ean, quantity: 2, offers: [{ ...offer, ...changes }] }, now);
    assert.equal(result.best, null);
    assert.ok(result.options[0].reasons.length > 0);
  }
  assert.equal(compareSupplierOffers({ ean: offer.ean, quantity: 1, offers: [offer] }, Date.parse(offer.checkedAt)).best?.supplier, "ANB");
});

test("rejects invalid quantities, offer counts and unsafe monetary input", () => {
  for (const quantity of [0, 10001, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(SupplierComparisonInputSchema.safeParse({ ean: offer.ean, quantity, offers: [] }).success, false);
  }
  assert.equal(SupplierComparisonInputSchema.safeParse({ ean: offer.ean, quantity: 1, offers: Array(101).fill(offer) }).success, false);
  assert.equal(SupplierOfferSchema.safeParse({ ...offer, unitCostCents: Number.MAX_SAFE_INTEGER + 1 }).success, false);
  assert.throws(() => compareSupplierOffers({ ean: offer.ean, quantity: 1, offers: [offer] }, NaN));
});

test("markup means addition to acquisition cost and rounds half up", () => {
  assert.equal(priceWithMarkup(1000, 6000), 1600);
  assert.equal(priceWithMarkup(1, 5000), 2);
  assert.throws(() => priceWithMarkup(Number.MAX_SAFE_INTEGER, 6000));
  assert.throws(() => priceWithMarkup(1000, -1));
});

test("simulates all known per-order costs, fee on collected freight and conservative taxes", () => {
  const result = simulateOrder(input);
  assert.equal(result.grossProductsCents, 3200);
  assert.equal(result.pixDiscountCents, 96);
  assert.equal(result.netProductsCents, 3104);
  assert.equal(result.customerFreightCents, 500);
  assert.equal(result.collectedCents, 3604);
  assert.equal(result.acquisitionCents, 2000);
  assert.equal(result.taxCents, 187);
  assert.equal(result.paymentFeeCents, 123);
  assert.equal(result.cashbackCents, 62);
  assert.equal(result.wimicoinsCents, 62);
  assert.equal(result.contributionCents, 540);
  assert.equal(result.contributionBps, 1498);
  assert.deepEqual(result.missing, []);
});

test("free shipping threshold explicitly switches before and after Pix, preserving carrier cost", () => {
  const scenario = { ...input, unitSaleCents: 5000, freeShippingThresholdCents: 9900 };
  const before = simulateOrder({ ...scenario, freeShippingBeforePix: true });
  const after = simulateOrder({ ...scenario, freeShippingBeforePix: false });
  assert.equal(before.customerFreightCents, 0);
  assert.equal(after.customerFreightCents, 500);
  assert.equal(before.carrierFreightCents, 500);
  assert.equal(before.contributionCents! - after.contributionCents!, -490);
});

test("discounts wallet first and preserves exact benefit allocation with a remainder", () => {
  const result = simulateOrder({ ...input, unitSaleCents: 100, quantity: 3, walletDiscountCents: 1,
    pixDiscountBps: 0, cashbackBps: 5000, wimicoinsBps: 5000 });
  assert.equal(result.netProductsCents, 299);
  assert.equal(result.cashbackCents, 150);
  assert.equal(result.wimicoinsCents, 150);
  const pix = simulateOrder({ ...input, unitSaleCents: 100, quantity: 3, walletDiscountCents: 50, pixDiscountBps: 300 });
  assert.equal(pix.pixDiscountCents, 8);
  assert.equal(pix.netProductsCents, 242);
});

test("excludes restricted prescription and Popular products from both benefits", () => {
  for (const flags of [{ requiresPrescription: true }, { isPopularPharmacy: true }]) {
    const result = simulateOrder({ ...input, ...flags });
    assert.equal(result.cashbackCents, 0);
    assert.equal(result.wimicoinsCents, 0);
  }
});

test("retains each unknown cost as null and lists the corresponding missing field", () => {
  for (const key of ["packagingCents", "carrierFreightCents", "taxBps", "paymentFeeBps", "paymentFixedCents", "otherVariableCents"] as const) {
    const result = simulateOrder({ ...input, [key]: null });
    assert.equal(result.contributionCents, null);
    assert.equal(result.contributionBps, null);
    assert.ok(result.missing.includes(key));
    if (key === "carrierFreightCents") assert.equal(result.customerFreightCents, null);
    if (key === "taxBps") assert.equal(result.taxCents, null);
    if (key === "paymentFeeBps" || key === "paymentFixedCents") assert.equal(result.paymentFeeCents, null);
  }
});

test("free freight can be known while real carrier cost remains pending", () => {
  const result = simulateOrder({ ...input, unitSaleCents: 10000, carrierFreightCents: null });
  assert.equal(result.customerFreightCents, 0);
  assert.equal(result.collectedCents, result.netProductsCents);
  assert.equal(result.contributionCents, null);
});

test("keeps explicitly confirmed zero costs and charges inbound freight once per order", () => {
  const result = simulateOrder({ ...input, inboundFreightCents: 80, packagingCents: 0, carrierFreightCents: 0,
    taxBps: 0, paymentFeeBps: 0, paymentFixedCents: 0, otherVariableCents: 0, cashbackBps: 0, wimicoinsBps: 0 });
  assert.equal(result.contributionCents, 1024);
  assert.deepEqual(result.missing, []);
});

test("flags PMC exceeded and leaves required missing PMC pending", () => {
  const missing = simulateOrder({ ...input, pmcRequired: true });
  assert.ok(missing.missing.includes("pmcCeilingCents"));
  assert.equal(missing.contributionCents, null);
  const exceeded = simulateOrder({ ...input, pmcRequired: true, pmcCeilingCents: 1500 });
  assert.equal(exceeded.pmcExceeded, true);
  assert.ok(exceeded.warnings.some(message => message.includes("PMC")));
});

test("rejects absent costs, negative values, bad rates and discounts leaving no product cent", () => {
  const absent: Partial<OrderSimulationInput> = { ...input };
  delete absent.packagingCents;
  assert.equal(OrderSimulationInputSchema.safeParse(absent).success, false);
  for (const patch of [{ unitCostCents: -1 }, { unitSaleCents: 1.1 }, { quantity: 10001 }, { pixDiscountBps: 10001 },
    { cashbackBps: -1 }, { walletDiscountCents: 3200 }, { pixDiscountBps: 10000 }]) {
    assert.equal(OrderSimulationInputSchema.safeParse({ ...input, ...patch }).success, false);
  }
});

test("calculates large valid totals exactly without unsafe percentage intermediates", () => {
  const result = simulateOrder({ ...input, unitCostCents: 100000000, unitSaleCents: 100000000, quantity: 10000,
    taxBps: 10000, paymentFeeBps: 10000, cashbackBps: 10000, wimicoinsBps: 10000, pixDiscountBps: 0 });
  assert.equal(result.netProductsCents, 1000000000000);
  assert.equal(result.taxCents, 1000000000000);
  assert.equal(result.paymentFeeCents, 1000000000050);
  assert.equal(result.cashbackCents, 1000000000000);
  assert.ok(Number.isSafeInteger(result.contributionCents));
});
