ALTER TABLE "MiaubyConfig" ADD COLUMN "customerStatusAlerts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MiaubyEvent" ADD COLUMN "recipient" TEXT;
ALTER TABLE "MiaubyEvent" ADD COLUMN "orderId" TEXT;
ALTER TABLE "MiaubyEvent" ADD COLUMN "orderStatus" "OrderStatus";
