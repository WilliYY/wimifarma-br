CREATE TYPE "CashbackRedemptionState" AS ENUM ('NONE', 'RESERVED', 'REDEEMED', 'RETURNED');

ALTER TABLE "Order"
  ADD COLUMN "cashbackRedeemedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cashbackRedemptionState" "CashbackRedemptionState" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "checkoutRequestId" TEXT,
  ADD COLUMN "checkoutRequestHash" TEXT,
  ADD CONSTRAINT "Order_cashback_redemption_check" CHECK ("cashbackRedeemedCents" >= 0 AND "cashbackRedeemedCents" <= "subtotalCents");
CREATE UNIQUE INDEX "Order_checkoutRequestId_key" ON "Order"("checkoutRequestId");

ALTER TABLE "OrderItem"
  ADD COLUMN "cashbackDiscountCents" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "OrderItem_cashback_discount_check" CHECK ("cashbackDiscountCents" >= 0 AND "cashbackDiscountCents" <= "totalCents");

ALTER TABLE "ProductReview"
  ADD COLUMN "cashbackRewardCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cashbackRewardState" "CashbackState" NOT NULL DEFAULT 'NONE',
  ADD CONSTRAINT "ProductReview_cashback_reward_check" CHECK ("cashbackRewardCents" >= 0);
