ALTER TABLE "Product"
  ADD COLUMN "wimicoinsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wimicoinsRateBps" INTEGER NOT NULL DEFAULT 200,
  ADD CONSTRAINT "Product_wimicoins_rate_check" CHECK ("wimicoinsRateBps" BETWEEN 1 AND 10000);

ALTER TABLE "Order"
  ADD COLUMN "wimicoinsEarnedPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wimicoinsState" "CashbackState" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "wimicoinsRedeemedPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wimicoinsRedemptionState" "CashbackRedemptionState" NOT NULL DEFAULT 'NONE',
  ADD CONSTRAINT "Order_wimicoins_points_check" CHECK ("wimicoinsEarnedPoints" >= 0 AND "wimicoinsRedeemedPoints" >= 0 AND "cashbackRedeemedCents" + "wimicoinsRedeemedPoints" <= "subtotalCents");

ALTER TABLE "OrderItem"
  ADD COLUMN "wimicoinsDiscountPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wimicoinsRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wimicoinsEarnedPoints" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "OrderItem_wimicoins_points_check" CHECK ("wimicoinsRateBps" BETWEEN 0 AND 10000 AND "wimicoinsEarnedPoints" >= 0 AND "wimicoinsDiscountPoints" >= 0 AND "cashbackDiscountCents" + "wimicoinsDiscountPoints" <= "totalCents");

CREATE TABLE "ClubMembership" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClubMembership_customerId_key" ON "ClubMembership"("customerId");
CREATE INDEX "ClubMembership_active_joinedAt_idx" ON "ClubMembership"("active", "joinedAt");
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WimicoinAccount" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "balancePoints" INTEGER NOT NULL DEFAULT 0,
  "lifetimeEarnedPoints" INTEGER NOT NULL DEFAULT 0,
  "lifetimeRedeemedPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WimicoinAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WimicoinAccount_customerId_key" ON "WimicoinAccount"("customerId");
ALTER TABLE "WimicoinAccount" ADD CONSTRAINT "WimicoinAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WimicoinTransaction" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "type" "CashbackTransactionType" NOT NULL,
  "amountPoints" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WimicoinTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WimicoinTransaction_amount_check" CHECK ("amountPoints" > 0)
);
CREATE UNIQUE INDEX "WimicoinTransaction_eventKey_key" ON "WimicoinTransaction"("eventKey");
CREATE INDEX "WimicoinTransaction_accountId_createdAt_idx" ON "WimicoinTransaction"("accountId", "createdAt");
ALTER TABLE "WimicoinTransaction" ADD CONSTRAINT "WimicoinTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WimicoinAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
