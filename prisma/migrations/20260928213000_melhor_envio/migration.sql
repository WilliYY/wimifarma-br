ALTER TABLE "Product" ADD COLUMN "shippingProfile" JSONB;
ALTER TABLE "Order" ADD COLUMN "shippingQuote" JSONB;
CREATE TABLE "ShippingIntegration" (
  "id" TEXT NOT NULL,
  "settings" JSONB NOT NULL,
  "ciphertext" TEXT,
  "iv" TEXT,
  "tag" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingIntegration_pkey" PRIMARY KEY ("id")
);
