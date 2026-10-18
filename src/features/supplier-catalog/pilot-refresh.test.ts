import assert from "node:assert/strict";
import test from "node:test";
import { planPilotRefresh } from "./pilot-refresh";
import { SupplierCatalogOfferSchema } from "./schema";

const now = Date.parse("2026-10-18T12:00:00Z");
const ean = "07896004708539";
const input = (extra = {}) => SupplierCatalogOfferSchema.parse({ supplier: "ANB", productId: "synthetic", externalCode: "sku",
  eanNormalized: ean, unitCostCents: 300, retailCeilingCents: 5000, available: true,
  observedAt: "2026-10-18T11:00:00Z", validUntil: "2026-10-19T11:00:00Z", ...extra });
const previous = (extra = {}) => ({ ...input(), id: "stored", reservedQuantity: 1, committedQuantity: 1,
  allocationQuantity: 2, ...extra });

test("routine refresh cannot restore consumed quota or disregard reservations", () => {
  const plan = planPilotRefresh(ean, [input()], [previous()], now);
  assert.equal(plan.updates[0].allocationQuantity, 2);
  assert.equal(plan.best, null);
  assert.throws(() => planPilotRefresh(ean, [input({ replenishAllocation: true })], [], now), /cannot replenish/);
});
test("best offer includes other current suppliers and preserves their financial identity", () => {
  const stored = previous({ supplier: "PROFARMA", id: "cheaper", unitCostCents: 250, reservedQuantity: 0, committedQuantity: 0 });
  const plan = planPilotRefresh(ean, [input()], [stored], now);
  assert.equal(plan.best?.id, "cheaper");
  assert.equal(plan.best?.unitPriceCents, 400);
});
test("out-of-stock update disables an existing supplier without inventing a replacement", () => {
  const plan = planPilotRefresh(ean, [input({ available: false, stockQuantity: 0 })], [previous()], now);
  assert.equal(plan.best, null);
  assert.equal(plan.updates[0].available, false);
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
