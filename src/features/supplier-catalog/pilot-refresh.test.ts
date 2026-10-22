import assert from "node:assert/strict";
import test from "node:test";
import { planPilotRefresh } from "./pilot-refresh";
import { SupplierCatalogOfferSchema } from "./schema";
import { toSaleProduct } from "./commerce";

const now = Date.parse("2026-10-18T12:00:00Z");
const ean = "07896004708539";
const input = (extra = {}) => SupplierCatalogOfferSchema.parse({ supplier: "ANB", productId: "synthetic", externalCode: "sku",
  eanNormalized: ean, unitCostCents: 300, retailCeilingCents: 5000, available: true,
  observedAt: "2026-10-18T11:00:00Z", validUntil: "2026-10-19T11:00:00Z", ...extra });
const previous = (extra = {}) => ({ ...input(), id: "stored", reservedQuantity: 1, committedQuantity: 1,
  allocationQuantity: 2, ...extra });

test("DM refresh chooses the lowest valid cost and repeats without restoring consumed allocation", () => {
  const dm = input({ supplier: "DM", unitCostCents: 200, sourceUrl: "https://portal.dmparana.com.br/" });
  const stored = previous({ supplier: "DM", id: "dm-stored", allocationQuantity: 4 });
  const other = previous({ supplier: "PROFARMA", id: "profarma-stored", allocationQuantity: 5 });
  const before = structuredClone([stored, other]);
  const first = planPilotRefresh(ean, [dm], [stored, other], now, 4000);
  const refreshed = { ...stored, ...first.updates[0] };
  const repeated = planPilotRefresh(ean, [dm], [refreshed, other], now, 4000);
  assert.deepEqual(repeated, first);
  assert.equal(first.best?.id, "dm-stored");
  assert.equal(first.best?.unitPriceCents, 280);
  assert.equal(first.best?.purchaseLimit, 2);
  assert.equal(first.best?.reservedQuantity, 1);
  assert.equal(first.best?.committedQuantity, 1);
  assert.equal(first.updates[0].allocationQuantity, 4);
  assert.deepEqual([stored, other], before);
  assert.throws(() => planPilotRefresh(ean, [input({ supplier: "DM", eanNormalized: "7896181915638" })], [], now), /identity/);
  assert.throws(() => planPilotRefresh(ean, [dm], [], now + 86_400_000), /current/);
  assert.throws(() => planPilotRefresh(ean, [input({ supplier: "DM", retailCeilingCents: null })], [], now), /ceiling/);
  assert.equal(planPilotRefresh(ean, [input({ supplier: "DM", retailCeilingCents: 279, unitCostCents: 200 })], [], now, 4000).best, null);
});

test("routine refresh cannot restore consumed quota or disregard reservations", () => {
  const plan = planPilotRefresh(ean, [input()], [previous()], now);
  assert.equal(plan.updates[0].allocationQuantity, 2);
  assert.equal(plan.best, null);
  assert.throws(() => planPilotRefresh(ean, [input({ replenishAllocation: true })], [], now), /cannot replenish/);
});
test("best offer includes other current suppliers and preserves their financial identity", () => {
  const stored = previous({ supplier: "PROFARMA", substitutionTaxCents: 95, id: "cheaper", unitCostCents: 250, reservedQuantity: 0, committedQuantity: 0 });
  const plan = planPilotRefresh(ean, [input()], [stored], now);
  assert.equal(plan.best?.id, "cheaper");
  assert.equal(plan.best?.unitPriceCents, 400);
});

test("nova observação sem ST limpa aprovação anterior; ST reconferido volta a competir", () => {
  const stored = previous({ supplier: "PROFARMA", substitutionTaxCents: 95, allocationQuantity: 5 });
  const missing = input({ supplier: "PROFARMA", unitCostCents: 200 });
  const first = planPilotRefresh(ean, [missing], [stored], now);
  assert.equal(first.updates[0].substitutionTaxCents, null);
  assert.equal(first.best, null);
  const restored = planPilotRefresh(ean, [input({ supplier: "PROFARMA", unitCostCents: 200, substitutionTaxCents: 80 })], [{ ...stored, ...first.updates[0] }], now);
  assert.equal(restored.best?.unitPriceCents, 320);
  assert.equal(restored.best?.reservedQuantity, 1);
  assert.equal(restored.best?.committedQuantity, 1);
});
test("out-of-stock update disables an existing supplier without inventing a replacement", () => {
  const plan = planPilotRefresh(ean, [input({ available: false, stockQuantity: 0 })], [previous()], now);
  assert.equal(plan.best, null);
  assert.equal(plan.updates[0].available, false);
});

test("falha sem nova observação preserva a oferta expirada; indisponibilidade nova da mesma fonte a substitui", () => {
  const stored = previous({ observedAt: "2026-10-16T11:00:00Z", validUntil: "2026-10-17T11:00:00Z", allocationQuantity: 5 });
  const before = structuredClone(stored);
  const unchanged = planPilotRefresh(ean, [], [stored], now);
  assert.deepEqual(unchanged.updates, []);
  const product = { inventorySource: "DISTRIBUTOR" as const, eanNormalized: ean, price: "99.00", stock: 0, supplierOffers: [stored] };
  assert.equal(toSaleProduct(product, now).price, "4.80");
  assert.equal(toSaleProduct(product, now).availableForPurchase, true);
  const unavailable = planPilotRefresh(ean, [input({ available: false, stockQuantity: 0 })], [stored], now);
  assert.equal(unavailable.best, null);
  assert.equal(unavailable.updates[0].available, false);
  assert.equal(toSaleProduct({ ...product, supplierOffers: [{ ...stored, ...unavailable.updates[0] }] }, now).availableForPurchase, false);
  assert.deepEqual(stored, before);
});

test("rotina preserva percentual escolhido pelo ADMIN", () => {
  assert.equal(planPilotRefresh(ean, [input()], [], now, 4000).best?.unitPriceCents, 420);
});
test("expired, future, older or changed-identity observations fail closed", () => {
  assert.throws(() => planPilotRefresh(ean, [input()], [], now + 86_400_000), /current/);
  assert.throws(() => planPilotRefresh(ean, [input()], [], now - 7_200_000), /performed/);
  assert.throws(() => planPilotRefresh(ean, [input()], [previous({ observedAt: "2026-10-18T11:30:00Z" })], now), /newer/);
  assert.throws(() => planPilotRefresh(ean, [input({ externalCode: "other" })], [previous()], now), /identity/);
});

test("OTC explicitly accepts missing ceiling and chosen markup; Rx remains the default", () => {
  const otc = input({ retailCeilingCents: null });
  assert.equal(planPilotRefresh(ean, [otc], [], now, 2500, false).best?.unitPriceCents, 375);
  assert.throws(() => planPilotRefresh(ean, [otc], [], now), /ceiling/);
  const stored = previous({ reservedQuantity: 1, committedQuantity: 1, allocationQuantity: 4 });
  const plan = planPilotRefresh(ean, [otc], [stored], now, 4000, false);
  assert.equal(plan.updates[0].allocationQuantity, 4);
  assert.equal(plan.best?.purchaseLimit, 2);
  assert.equal(plan.best?.unitPriceCents, 420);
});

test("refresh rejects mismatched EAN, duplicate supplier and validity exceeding 24 hours", () => {
  assert.throws(() => planPilotRefresh(ean, [input({ eanNormalized: "7896181915638" })], [], now), /identity/);
  assert.throws(() => planPilotRefresh(ean, [input(), input()], [], now), /Duplicate/);
  const invalid = { ...input(), observedAt: "2026-10-17T10:00:00Z", validUntil: "2026-10-19T11:00:00Z" };
  assert.throws(() => planPilotRefresh(ean, [invalid], [], now), /24 hours/);
});

test("importação MIP exige ST, mas perfumaria não exige; classificação persistida decide", () => {
  const pf = input({ supplier: "PROFARMA", retailCeilingCents: null });
  const medicine = { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true };
  assert.equal(planPilotRefresh(ean, [pf], [], now, 2000, false, medicine).best, null);
  assert.equal(planPilotRefresh(ean, [pf], [], now, 2000, false, { ...medicine, kind: "PERFUMERY", medicineClass: "UNCLASSIFIED", otc: false }).best?.unitPriceCents, 360);
});
