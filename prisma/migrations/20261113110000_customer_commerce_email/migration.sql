BEGIN;

ALTER TABLE "Customer" ADD COLUMN "googleVerifiedEmail" TEXT;

CREATE FUNCTION "invalidateCustomerCommerceGoogleEmail"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD."email" IS DISTINCT FROM NEW."email" OR OLD."googleSubject" IS DISTINCT FROM NEW."googleSubject")
     AND NEW."googleVerifiedEmail" IS NOT DISTINCT FROM OLD."googleVerifiedEmail" THEN
    NEW."googleVerifiedEmail" := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Customer_invalidateCommerceGoogleEmail"
BEFORE UPDATE OF "email", "googleSubject" ON "Customer"
FOR EACH ROW EXECUTE FUNCTION "invalidateCustomerCommerceGoogleEmail"();

CREATE TABLE "CustomerCartEmailReminder" (
  "customerId" TEXT PRIMARY KEY REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "cartKey" TEXT NOT NULL UNIQUE,
  "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "availableAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "optedInAt" TIMESTAMP(3) NOT NULL,
  "canceledAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3)
);

CREATE TABLE "CustomerEmailEvent" (
  "eventKey" TEXT PRIMARY KEY,
  "orderId" TEXT,
  "cartCustomerId" TEXT,
  "kind" TEXT NOT NULL,
  "status" "OrderStatus",
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "discloseProductIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "CustomerEmailEvent_kind_shape" CHECK (
    ("kind" = 'ORDER_RECEIVED' AND "orderId" IS NOT NULL AND "cartCustomerId" IS NULL AND "status" IS NULL) OR
    ("kind" = 'ORDER_STATUS' AND "orderId" IS NOT NULL AND "cartCustomerId" IS NULL AND "status" IS NOT NULL) OR
    ("kind" = 'ABANDONED_CART' AND "orderId" IS NULL AND "cartCustomerId" IS NOT NULL AND "status" IS NULL)
  ),
  CONSTRAINT "CustomerEmailEvent_state_valid" CHECK ("state" IN ('PENDING','SENDING','ACCEPTED','REJECTED','UNCERTAIN','SKIPPED'))
);

CREATE INDEX "CustomerEmailEvent_state_availableAt_createdAt_idx" ON "CustomerEmailEvent"("state", "availableAt", "createdAt");
CREATE INDEX "CustomerEmailEvent_orderId_createdAt_idx" ON "CustomerEmailEvent"("orderId", "createdAt");
CREATE INDEX "CustomerEmailEvent_finishedAt_idx" ON "CustomerEmailEvent"("finishedAt");

COMMIT;
