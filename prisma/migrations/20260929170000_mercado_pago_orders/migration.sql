ALTER TYPE "OrderPaymentMethod" ADD VALUE 'ONLINE';
CREATE TABLE "PaymentIntegration" (
  "id" TEXT NOT NULL PRIMARY KEY, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "environment" TEXT NOT NULL DEFAULT 'test', "publicKey" TEXT NOT NULL,
  "accountId" TEXT NOT NULL, "ciphertext" TEXT NOT NULL, "iv" TEXT NOT NULL,
  "tag" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "OnlinePayment" (
  "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL,
  "providerOrderId" TEXT, "idempotencyKey" TEXT NOT NULL,
  "environment" TEXT NOT NULL, "integrationRevision" INTEGER NOT NULL,
  "accountId" TEXT NOT NULL, "amountCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW', "statusDetail" TEXT,
  "stockReserved" BOOLEAN NOT NULL DEFAULT false, "requestCiphertext" TEXT,
  "requestIv" TEXT, "requestTag" TEXT, "pixCode" TEXT,
  "providerUpdatedAt" TIMESTAMP(3), "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnlinePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OnlinePayment_orderId_key" ON "OnlinePayment"("orderId");
CREATE UNIQUE INDEX "OnlinePayment_providerOrderId_key" ON "OnlinePayment"("providerOrderId");
CREATE UNIQUE INDEX "OnlinePayment_idempotencyKey_key" ON "OnlinePayment"("idempotencyKey");
CREATE INDEX "OnlinePayment_status_updatedAt_idx" ON "OnlinePayment"("status", "updatedAt");
