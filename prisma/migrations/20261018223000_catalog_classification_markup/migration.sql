ALTER TABLE "Product"
  ADD COLUMN "catalogClassification" JSONB,
  ADD COLUMN "supplierMarkupBps" INTEGER NOT NULL DEFAULT 6000;
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierMarkupBps_check" CHECK ("supplierMarkupBps" BETWEEN 0 AND 10000);
