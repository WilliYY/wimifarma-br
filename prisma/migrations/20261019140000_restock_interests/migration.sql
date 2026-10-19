CREATE TYPE "RestockInterestStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CANCELED', 'EXPIRED');

CREATE TABLE "RestockInterest" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" "RestockInterestStatus" NOT NULL DEFAULT 'WAITING',
  "whatsapp" BOOLEAN NOT NULL DEFAULT false,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "phone" TEXT,
  "email" TEXT,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "whatsappNotifiedAt" TIMESTAMP(3),
  "emailNotifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestockInterest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestockInterest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestockInterest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RestockInterest_customerId_productId_key" ON "RestockInterest"("customerId", "productId");
CREATE INDEX "RestockInterest_status_expiresAt_idx" ON "RestockInterest"("status", "expiresAt");
CREATE INDEX "RestockInterest_productId_status_idx" ON "RestockInterest"("productId", "status");
