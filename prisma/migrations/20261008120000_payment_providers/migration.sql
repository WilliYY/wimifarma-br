-- Additive gateway snapshot. Existing attempts remain Mercado Pago.
BEGIN;
ALTER TABLE "OnlinePayment"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mercado-pago',
  ADD COLUMN "integrationId" TEXT NOT NULL DEFAULT 'mercado-pago',
  ADD COLUMN "method" TEXT,
  ADD COLUMN "installments" INTEGER,
  ADD COLUMN "pixQrCodeId" TEXT,
  ADD COLUMN "checkoutSessionId" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "submissionStartedAt" TIMESTAMP(3),
  ADD COLUMN "fundsAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "financialReviewReason" TEXT;

CREATE UNIQUE INDEX "OnlinePayment_remote_id_key"
  ON "OnlinePayment"("provider", "environment", "accountId", "providerOrderId");
CREATE UNIQUE INDEX "OnlinePayment_pix_id_key"
  ON "OnlinePayment"("provider", "environment", "accountId", "pixQrCodeId");
CREATE UNIQUE INDEX "OnlinePayment_checkout_id_key"
  ON "OnlinePayment"("provider", "environment", "accountId", "checkoutSessionId");
DROP INDEX "OnlinePayment_providerOrderId_key";

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "checkoutSessionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentWebhookEvent_delivery_key"
  ON "PaymentWebhookEvent"("provider", "environment", "accountId", "eventId");
CREATE INDEX "PaymentWebhookEvent_status_lastAttemptAt_idx"
  ON "PaymentWebhookEvent"("status", "lastAttemptAt");
COMMIT;
