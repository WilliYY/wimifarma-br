import assert from "node:assert/strict";
import test from "node:test";
import { SupplierCatalogOfferSchema } from "./schema";

const offer = { supplier: "DM", productId: "synthetic", externalCode: "synthetic-dm", eanNormalized: "7896004708539",
  unitCostCents: 200, available: true, observedAt: "2026-10-18T10:00:00Z", validUntil: "2026-10-19T10:00:00Z" };

test("catalog schema accepts DM and retains GTIN, cost and 24-hour validity constraints", () => {
  assert.equal(SupplierCatalogOfferSchema.parse(offer).eanNormalized, "07896004708539");
  for (const patch of [{ eanNormalized: "7896004708530" }, { unitCostCents: 0 }, { validUntil: offer.observedAt },
    { validUntil: "2026-10-19T10:00:01Z" }, { supplier: "GAM" }, { supplier: "SANTA_CRUZ" }, { supplier: "dm" }]) {
    assert.equal(SupplierCatalogOfferSchema.safeParse({ ...offer, ...patch }).success, false);
  }
});
