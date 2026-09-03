ALTER TABLE "Product"
ADD COLUMN "featuredPosition" INTEGER;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_featuredPosition_range"
CHECK ("featuredPosition" IS NULL OR "featuredPosition" BETWEEN 1 AND 15);

CREATE UNIQUE INDEX "Product_featuredPosition_key"
ON "Product"("featuredPosition");

CREATE INDEX "Product_status_featuredPosition_idx"
ON "Product"("status", "featuredPosition");
