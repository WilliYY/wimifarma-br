ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';
ALTER TABLE "User" ADD COLUMN "customerId" TEXT;
CREATE UNIQUE INDEX "User_customerId_key" ON "User"("customerId");
ALTER TABLE "User" ADD CONSTRAINT "User_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
