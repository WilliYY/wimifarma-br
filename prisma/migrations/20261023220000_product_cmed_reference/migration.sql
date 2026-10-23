-- CMED reference is independent of store prices, inventory and supplier offers.
ALTER TABLE "Product" ADD COLUMN "cmedReference" JSONB;
