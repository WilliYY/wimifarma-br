-- Unknown ST remains NULL. A numeric zero is an explicit supplier calculation.
-- No legacy backfill: an old observation cannot prove its tax calculation.
ALTER TABLE "SupplierCatalogOffer" ADD COLUMN "substitutionTaxCents" INTEGER;
ALTER TABLE "SupplierCatalogOffer" ADD CONSTRAINT "SupplierCatalogOffer_substitutionTaxCents_check"
  CHECK ("substitutionTaxCents" IS NULL OR "substitutionTaxCents" BETWEEN 0 AND 100000000);
