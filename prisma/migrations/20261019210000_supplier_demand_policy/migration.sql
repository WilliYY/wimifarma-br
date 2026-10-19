-- Existing orders keep their original allocation policy. New orders snapshot the owner's decision.
ALTER TABLE "OrderItem" ADD COLUMN "supplierDemandAllowed" BOOLEAN NOT NULL DEFAULT false;
