-- Allow customer accounts to use email/password without mixing them with admin users.
ALTER TABLE "Customer"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordSetAt" TIMESTAMP(3);
