-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_productId_customerId_key" ON "ProductReview"("productId", "customerId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_isPublished_createdAt_idx" ON "ProductReview"("productId", "isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_customerId_idx" ON "ProductReview"("customerId");

-- CreateIndex
CREATE INDEX "ProductReview_orderId_idx" ON "ProductReview"("orderId");

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
