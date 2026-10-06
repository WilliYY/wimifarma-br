export const prescriptionTypes = ["UNREVIEWED", "ORDINARY", "CONTROLLED"] as const;
export type PrescriptionType = (typeof prescriptionTypes)[number];

export type ProductPurchaseRules = {
  requiresPrescription: boolean;
  isPopularPharmacy: boolean;
  prescriptionType?: PrescriptionType;
};

// A red stripe alone does not define the prescription type. Existing records
// stay assisted until classified; the model cannot grant purchase permission.
export function requiresPurchaseAssistance(product: ProductPurchaseRules): boolean {
  return product.isPopularPharmacy || product.prescriptionType === "CONTROLLED" ||
    (product.requiresPrescription && product.prescriptionType !== "ORDINARY");
}

export function requiresPrescriptionReview(product: ProductPurchaseRules): boolean {
  return (product.requiresPrescription || product.prescriptionType === "ORDINARY") && !requiresPurchaseAssistance(product);
}

export function prescriptionClassificationIsConsistent(product: { requiresPrescription: boolean; prescriptionType?: PrescriptionType }): boolean {
  return !product.prescriptionType || product.prescriptionType === "UNREVIEWED" || product.requiresPrescription;
}

export function resolvePrescriptionType(current: PrescriptionType, requested: PrescriptionType | undefined, identityChanged: boolean): PrescriptionType {
  return requested ?? (identityChanged ? "UNREVIEWED" : current);
}
