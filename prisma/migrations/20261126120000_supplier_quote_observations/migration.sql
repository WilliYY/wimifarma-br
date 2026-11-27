ALTER TABLE "Product" ADD COLUMN "supplierPricingBasis" JSONB;

CREATE TABLE "SupplierQuoteObservation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplier" "SupplierCode" NOT NULL,
    "eanNormalized" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "unitCostCents" INTEGER,
    "stockQuantity" INTEGER,
    "promotion" BOOLEAN NOT NULL DEFAULT false,
    "evidenceDigest" TEXT,
    "status" TEXT NOT NULL,
    "basisBeforeCents" INTEGER,
    "basisAfterCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierQuoteObservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupplierQuoteObservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "supplier_quote_observation_identity_key" ON "SupplierQuoteObservation"("productId", "supplier", "eanNormalized", "observedAt");
CREATE INDEX "supplier_quote_observation_ean_date_idx" ON "SupplierQuoteObservation"("productId", "eanNormalized", "observedAt");
