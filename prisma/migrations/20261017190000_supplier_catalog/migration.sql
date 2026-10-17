CREATE TYPE "InventorySource" AS ENUM ('PHARMACY', 'DISTRIBUTOR');
CREATE TYPE "SupplierCode" AS ENUM ('ANB', 'SANTA_CRUZ', 'PROFARMA');
CREATE TYPE "SupplierReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');
ALTER TABLE "Product" ADD COLUMN "inventorySource" "InventorySource" NOT NULL DEFAULT 'PHARMACY', ADD COLUMN "eanNormalized" TEXT;
CREATE UNIQUE INDEX "Product_eanNormalized_key" ON "Product"("eanNormalized");
ALTER TABLE "Order" ADD COLUMN "preparationReadyAt" TIMESTAMP(3), ADD COLUMN "preparationDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN "inventorySource" "InventorySource" NOT NULL DEFAULT 'PHARMACY', ADD COLUMN "supplierOfferId" TEXT, ADD COLUMN "supplierCode" TEXT;
CREATE TABLE "SupplierCatalogOffer" (
 "id" TEXT PRIMARY KEY, "supplier" "SupplierCode" NOT NULL, "productId" TEXT NOT NULL,
 "externalCode" TEXT NOT NULL, "eanNormalized" TEXT NOT NULL, "unitCostCents" INTEGER NOT NULL, "retailCeilingCents" INTEGER,
 "available" BOOLEAN NOT NULL DEFAULT false, "stockQuantity" INTEGER,
 "allocationQuantity" INTEGER NOT NULL DEFAULT 5, "reservedQuantity" INTEGER NOT NULL DEFAULT 0, "committedQuantity" INTEGER NOT NULL DEFAULT 0,
 "observedAt" TIMESTAMP(3) NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL, "commercialCondition" TEXT, "sourceUrl" TEXT,
 "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SupplierCatalogOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SupplierCatalogOffer_quantities_check" CHECK ("unitCostCents">0 AND "allocationQuantity">=0 AND "reservedQuantity">=0 AND "committedQuantity">=0 AND ("stockQuantity" IS NULL OR "stockQuantity">=0))
);
CREATE UNIQUE INDEX "SupplierCatalogOffer_productId_supplier_key" ON "SupplierCatalogOffer"("productId", "supplier");
CREATE INDEX "SupplierCatalogOffer_eanNormalized_available_validUntil_idx" ON "SupplierCatalogOffer"("eanNormalized", "available", "validUntil");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "SupplierCatalogOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "SupplierInventoryReservation" (
 "id" TEXT PRIMARY KEY, "orderItemId" TEXT NOT NULL, "offerId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitCostCents" INTEGER NOT NULL,
 "status" "SupplierReservationStatus" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SupplierInventoryReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SupplierInventoryReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SupplierCatalogOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SupplierInventoryReservation_quantity_check" CHECK ("quantity">0 AND "unitCostCents">0)
);
CREATE UNIQUE INDEX "SupplierInventoryReservation_orderItemId_key" ON "SupplierInventoryReservation"("orderItemId");
CREATE INDEX "SupplierInventoryReservation_offerId_status_idx" ON "SupplierInventoryReservation"("offerId", "status");
