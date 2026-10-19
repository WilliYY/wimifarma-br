import { requiresPrescriptionReview, requiresPurchaseAssistance, type PrescriptionType } from "@/features/products/purchase-policy";
import { shippingProfileSchema } from "./schema";

export function requiresPharmacyShippingSupport(product: {
  category: string | null;
  requiresPrescription: boolean;
  prescriptionType?: PrescriptionType;
  isPopularPharmacy: boolean;
}): boolean {
  return product.prescriptionType === "ANTIMICROBIAL" || requiresPurchaseAssistance(product) || /farmacia\s*popular/.test(normalizedCategory(product.category));
}

function normalizedCategory(category: string | null): string {
  return (category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function permittedShippingServices(configured: number[], products: {
  category: string | null; requiresPrescription: boolean; prescriptionType?: PrescriptionType; isPopularPharmacy: boolean;
  shippingProfile?: unknown;
}[]): number[] {
  // Other carriers need explicit acceptance of this cargo. Quotes alone do not prove acceptance.
  const containsMedication = products.some((product) => requiresPrescriptionReview(product) ||
    requiresPurchaseAssistance(product) || /medicament|farmaci/.test(normalizedCategory(product.category)));
  const approvals = products.map(product => {
    const profile = shippingProfileSchema.safeParse(product.shippingProfile);
    return profile.success ? profile.data.approvedServiceIds : undefined;
  });
  return configured.filter(service => (!containsMedication || service === 1 || service === 2) &&
    approvals.every(approved => approved === undefined || approved.includes(service)));
}
