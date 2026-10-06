CREATE TYPE "PrescriptionType" AS ENUM ('UNREVIEWED', 'ORDINARY', 'CONTROLLED');

ALTER TABLE "Product"
  ADD COLUMN "prescriptionType" "PrescriptionType" NOT NULL DEFAULT 'UNREVIEWED';

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_prescriptionType_requiresPrescription_check"
  CHECK ("prescriptionType" = 'UNREVIEWED' OR "requiresPrescription" = true);

ALTER TABLE "Order"
  ADD COLUMN "requiresPrescriptionReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "prescriptionReviewedAt" TIMESTAMP(3),
  ADD COLUMN "prescriptionReviewedById" TEXT;
