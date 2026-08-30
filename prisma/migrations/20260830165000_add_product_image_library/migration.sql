-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "backgroundRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "imageAssetId" TEXT;

-- Backfill existing product images into the reusable library
INSERT INTO "ProductImage" (
    "id",
    "url",
    "originalName",
    "width",
    "height",
    "sizeBytes",
    "createdAt",
    "updatedAt"
)
SELECT
    md5('legacy-product-image:' || "imageUrl"),
    "imageUrl",
    regexp_replace("imageUrl", '^.*/', ''),
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "imageUrl"
    FROM "Product"
    WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> ''
) AS "ExistingProductImages";

UPDATE "Product"
SET "imageAssetId" = md5('legacy-product-image:' || "imageUrl")
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_url_key" ON "ProductImage"("url");

-- CreateIndex
CREATE INDEX "ProductImage_createdAt_idx" ON "ProductImage"("createdAt");

-- CreateIndex
CREATE INDEX "ProductImage_createdById_idx" ON "ProductImage"("createdById");

-- CreateIndex
CREATE INDEX "Product_imageAssetId_idx" ON "Product"("imageAssetId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ProductImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
