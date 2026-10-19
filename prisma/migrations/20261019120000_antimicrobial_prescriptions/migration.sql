ALTER TYPE "PrescriptionType" ADD VALUE 'ANTIMICROBIAL';
CREATE TABLE "PrescriptionUpload" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "orderId" TEXT UNIQUE REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "submissionId" TEXT NOT NULL,
  "cartFingerprint" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL CHECK ("mimeType" IN ('image/png', 'image/jpeg', 'application/pdf')),
  "ciphertext" BYTEA NOT NULL,
  "iv" BYTEA NOT NULL CHECK (octet_length("iv") = 12),
  "tag" BYTEA NOT NULL CHECK (octet_length("tag") = 16),
  "sizeBytes" INTEGER NOT NULL CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 3145728),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PrescriptionUpload_customerId_expiresAt_idx" ON "PrescriptionUpload"("customerId", "expiresAt");
CREATE TABLE "PrescriptionUploadQuota" (
  "customerId" TEXT PRIMARY KEY REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL CHECK ("count" >= 0)
);
