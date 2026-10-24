import type { Prisma } from "@/generated/prisma/client";

// Exact JSON equality also rejects incomplete objects and unknown keys, just as
// readClassification does. Path-only filters would accept malformed legacy JSON.
const medicineClassifications = (["GENERIC", "SIMILAR"] as const).flatMap(medicineClass =>
  [false, true].flatMap(ethical => [false, true].map(otc => ({
    catalogClassification: { equals: { kind: "MEDICINE", medicineClass, ethical, otc } },
  }))));

// Database equivalent of cashbackProductIsEligible; no promotional Rx listing.
export const cashbackEligibleWhere: Prisma.ProductWhereInput = {
  isPopularPharmacy: false,
  OR: [
    { requiresPrescription: false, prescriptionType: { notIn: ["ORDINARY", "ANTIMICROBIAL", "CONTROLLED"] } },
    {
      prescriptionType: { in: ["ORDINARY", "ANTIMICROBIAL"] },
      OR: medicineClassifications,
    },
  ],
};
