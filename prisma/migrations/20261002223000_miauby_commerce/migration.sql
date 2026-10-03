CREATE TABLE "MiaubyConfig" (
  "id" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "cartAlerts" BOOLEAN NOT NULL DEFAULT true, "orderAlerts" BOOLEAN NOT NULL DEFAULT true,
  "paymentAlerts" BOOLEAN NOT NULL DEFAULT true, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MiaubyConfig_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MiaubyEvent" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "type" TEXT NOT NULL, "text" TEXT NOT NULL,
  "sessionId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseExpiresAt" TIMESTAMP(3),
  "messageId" TEXT, "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "sentAt" TIMESTAMP(3),
  CONSTRAINT "MiaubyEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MiaubyEvent_key_key" ON "MiaubyEvent"("key");
CREATE INDEX "MiaubyEvent_status_availableAt_idx" ON "MiaubyEvent"("status", "availableAt");
CREATE INDEX "MiaubyEvent_sessionId_status_idx" ON "MiaubyEvent"("sessionId", "status");
CREATE INDEX "MiaubyEvent_createdAt_idx" ON "MiaubyEvent"("createdAt");
