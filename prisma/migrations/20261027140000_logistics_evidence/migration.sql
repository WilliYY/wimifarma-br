-- Physical commercial-unit evidence remains separate from protected shipping profiles.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "Product" ADD COLUMN "logisticsEvidence" JSONB;

CREATE TABLE "PackagingRecipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PackagingRecipe_pkey" PRIMARY KEY ("id")
);
COMMIT;
