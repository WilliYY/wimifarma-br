import assert from "node:assert/strict";
import test from "node:test";
import { SupplierCatalogOfferSchema } from "./schema";

const offer = { supplier: "DM", productId: "synthetic", externalCode: "synthetic-dm", eanNormalized: "7896004708539",
  unitCostCents: 200, available: true, observedAt: "2026-10-18T10:00:00Z", validUntil: "2026-10-19T10:00:00Z" };

test("catalog schema accepts DM and retains GTIN, cost and 24-hour validity constraints", () => {
  assert.equal(SupplierCatalogOfferSchema.parse(offer).eanNormalized, "07896004708539");
  assert.equal(SupplierCatalogOfferSchema.parse({ ...offer, supplier: "GAM" }).supplier, "GAM");
  for (const patch of [{ eanNormalized: "7896004708530" }, { unitCostCents: 0 }, { validUntil: offer.observedAt },
    { validUntil: "2026-10-19T10:00:01Z" }, { supplier: "eGAM" }, { supplier: "SANTA_CRUZ" }, { supplier: "dm" }]) {
    assert.equal(SupplierCatalogOfferSchema.safeParse({ ...offer, ...patch }).success, false);
  }
});

test("ST desconhecido permanece nulo; zero calculado é explícito e inválidos são rejeitados", () => {
  assert.equal(SupplierCatalogOfferSchema.parse(offer).substitutionTaxCents, null);
  for (const substitutionTaxCents of [null, 0, 95]) {
    assert.equal(SupplierCatalogOfferSchema.parse({ ...offer, substitutionTaxCents }).substitutionTaxCents, substitutionTaxCents);
  }
  for (const substitutionTaxCents of ["-", "", -1, 0.5, NaN, 100_000_001]) {
    assert.equal(SupplierCatalogOfferSchema.safeParse({ ...offer, substitutionTaxCents }).success, false);
  }
});
