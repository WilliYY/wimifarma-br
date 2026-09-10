CREATE TYPE "CashbackState" AS ENUM ('NONE', 'PENDING', 'CREDITED', 'VOIDED', 'REVERSED');

ALTER TABLE "Product"
  ADD COLUMN "cashbackEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cashbackRateBps" INTEGER NOT NULL DEFAULT 200,
  ADD CONSTRAINT "Product_cashback_rate_check" CHECK ("cashbackRateBps" BETWEEN 1 AND 10000);

ALTER TABLE "Order"
  ADD COLUMN "cashbackEarnedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cashbackState" "CashbackState" NOT NULL DEFAULT 'NONE',
  ADD CONSTRAINT "Order_cashback_amount_check" CHECK ("cashbackEarnedCents" >= 0);

ALTER TABLE "OrderItem"
  ADD COLUMN "cashbackRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cashbackEarnedCents" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "OrderItem_cashback_check" CHECK ("cashbackRateBps" BETWEEN 0 AND 10000 AND "cashbackEarnedCents" >= 0);

ALTER TABLE "CashbackTransaction" ADD COLUMN "eventKey" TEXT;
CREATE UNIQUE INDEX "CashbackTransaction_eventKey_key" ON "CashbackTransaction"("eventKey");
CREATE INDEX "Order_customerId_cashbackState_idx" ON "Order"("customerId", "cashbackState");
