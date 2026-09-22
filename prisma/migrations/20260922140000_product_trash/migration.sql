ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "purgeAt" TIMESTAMP(3);
CREATE INDEX "Product_purgeAt_idx" ON "Product"("purgeAt");
ALTER TABLE "Product" ADD CONSTRAINT "Product_trash_state_check" CHECK (
  ("deletedAt" IS NULL AND "purgeAt" IS NULL) OR
  ("deletedAt" IS NOT NULL AND "purgeAt" IS NOT NULL AND "purgeAt" > "deletedAt"
    AND "status" = 'ARCHIVED' AND "featuredPosition" IS NULL)
);
