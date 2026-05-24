-- Persist customer identity created from Google OAuth.
ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "Customer"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "googleSubject" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE UNIQUE INDEX "Customer_googleSubject_key" ON "Customer"("googleSubject");
CREATE INDEX "Customer_lastLoginAt_idx" ON "Customer"("lastLoginAt");
