CREATE TABLE "SecretCredential" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "service" TEXT,
    "identifier" TEXT,
    "secretCiphertext" TEXT NOT NULL,
    "secretIv" TEXT NOT NULL,
    "secretTag" TEXT NOT NULL,
    "notesCiphertext" TEXT,
    "notesIv" TEXT,
    "notesTag" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretCredential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecretCredential_service_idx" ON "SecretCredential"("service");
CREATE INDEX "SecretCredential_createdAt_idx" ON "SecretCredential"("createdAt");
