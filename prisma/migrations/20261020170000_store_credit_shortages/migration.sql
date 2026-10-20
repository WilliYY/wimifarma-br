CREATE TYPE "ItemShortageStatus" AS ENUM ('PROPOSED', 'CREDIT_ACCEPTED', 'REFUND_REQUESTED', 'VOIDED');
CREATE TYPE "ItemShortageCreditState" AS ENUM ('NONE', 'ISSUED', 'REVIEW', 'REVERSED');
CREATE TYPE "StoreCreditTransactionKind" AS ENUM ('ISSUE', 'RESERVE', 'RETURN', 'REVERSAL');

ALTER TABLE "SupplierInventoryReservation" ADD COLUMN "releasedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SupplierInventoryReservation" ADD CONSTRAINT "SupplierInventoryReservation_released_check" CHECK ("releasedQuantity" >= 0 AND "releasedQuantity" <= "quantity");

ALTER TABLE "Order"
  ADD COLUMN "hasItemShortages" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storeCreditRedeemedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "storeCreditRedemptionState" "CashbackRedemptionState" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "storeCreditReturnedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cashbackReturnedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wimicoinsReturnedPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cashbackEarnedVoidedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wimicoinsEarnedVoidedPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD CONSTRAINT "Order_store_credit_amounts_check" CHECK (
  "storeCreditRedeemedCents" >= 0 AND "storeCreditRedeemedCents" <= 600000000 AND
  "storeCreditReturnedCents" >= 0 AND "storeCreditReturnedCents" <= "storeCreditRedeemedCents" AND
  "cashbackReturnedCents" >= 0 AND "cashbackReturnedCents" <= "cashbackRedeemedCents" AND
  "wimicoinsReturnedPoints" >= 0 AND "wimicoinsReturnedPoints" <= "wimicoinsRedeemedPoints" AND
  "cashbackEarnedVoidedCents" >= 0 AND "cashbackEarnedVoidedCents" <= "cashbackEarnedCents" AND
  "wimicoinsEarnedVoidedPoints" >= 0 AND "wimicoinsEarnedVoidedPoints" <= "wimicoinsEarnedPoints"
);
ALTER TABLE "OrderItem" ADD COLUMN "shortageQuantity" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "storeCreditDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_shortage_check" CHECK ("shortageQuantity" >= 0 AND "shortageQuantity" <= "quantity");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_store_credit_check" CHECK ("storeCreditDiscountCents" >= 0 AND "storeCreditDiscountCents" <= "totalCents" - "cashbackDiscountCents" - "wimicoinsDiscountPoints");

CREATE TABLE "StoreCreditAccount" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreCreditAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreCreditAccount_customerId_key" ON "StoreCreditAccount"("customerId");
ALTER TABLE "StoreCreditAccount" ADD CONSTRAINT "StoreCreditAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrderItemShortage" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "startUnit" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "cashPaidCents" INTEGER NOT NULL,
  "cashbackReturnCents" INTEGER NOT NULL,
  "wimicoinsReturnPoints" INTEGER NOT NULL,
  "storeCreditReturnCents" INTEGER NOT NULL,
  "pixDiscountCents" INTEGER NOT NULL,
  "cashbackEarnedVoidedCents" INTEGER NOT NULL,
  "wimicoinsEarnedVoidedPoints" INTEGER NOT NULL,
  "status" "ItemShortageStatus" NOT NULL DEFAULT 'PROPOSED',
  "creditState" "ItemShortageCreditState" NOT NULL DEFAULT 'NONE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "consentVersion" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderItemShortage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItemShortage_amounts_check" CHECK (
    "startUnit" >= 0 AND "quantity" > 0 AND "version" > 0 AND
    "cashPaidCents" >= 0 AND "cashbackReturnCents" >= 0 AND "wimicoinsReturnPoints" >= 0 AND "storeCreditReturnCents" >= 0 AND
    "pixDiscountCents" >= 0 AND "cashbackEarnedVoidedCents" >= 0 AND "wimicoinsEarnedVoidedPoints" >= 0
  ),
  CONSTRAINT "OrderItemShortage_credit_status_check" CHECK ("creditState" = 'NONE' OR "status" = 'CREDIT_ACCEPTED')
);
CREATE INDEX "OrderItemShortage_orderItemId_startUnit_idx" ON "OrderItemShortage"("orderItemId", "startUnit");
CREATE UNIQUE INDEX "OrderItemShortage_active_start_key" ON "OrderItemShortage"("orderItemId", "startUnit") WHERE "status" <> 'VOIDED';
CREATE INDEX "OrderItemShortage_orderId_status_idx" ON "OrderItemShortage"("orderId", "status");
CREATE INDEX "OrderItemShortage_creditState_idx" ON "OrderItemShortage"("creditState");
ALTER TABLE "OrderItemShortage" ADD CONSTRAINT "OrderItemShortage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItemShortage" ADD CONSTRAINT "OrderItemShortage_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StoreCreditTransaction" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "kind" "StoreCreditTransactionKind" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "orderId" TEXT,
  "shortageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreCreditTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreCreditTransaction_sign_check" CHECK (("kind" IN ('ISSUE','RETURN') AND "amountCents" > 0) OR ("kind" IN ('RESERVE','REVERSAL') AND "amountCents" < 0))
);
CREATE UNIQUE INDEX "StoreCreditTransaction_eventKey_key" ON "StoreCreditTransaction"("eventKey");
CREATE INDEX "StoreCreditTransaction_accountId_createdAt_idx" ON "StoreCreditTransaction"("accountId", "createdAt");
CREATE INDEX "StoreCreditTransaction_orderId_idx" ON "StoreCreditTransaction"("orderId");
CREATE INDEX "StoreCreditTransaction_shortageId_idx" ON "StoreCreditTransaction"("shortageId");
ALTER TABLE "StoreCreditTransaction" ADD CONSTRAINT "StoreCreditTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StoreCreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreCreditTransaction" ADD CONSTRAINT "StoreCreditTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreCreditTransaction" ADD CONSTRAINT "StoreCreditTransaction_shortageId_fkey" FOREIGN KEY ("shortageId") REFERENCES "OrderItemShortage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
