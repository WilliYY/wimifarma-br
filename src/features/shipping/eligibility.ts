import { requiresPrescriptionReview, requiresPurchaseAssistance, type PrescriptionType } from "@/features/products/purchase-policy";
import { shippingProfileSchema } from "./schema";
import { assessCarrierCargo, type ShippingCargo } from "./cargo-policy";

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
  name?: string; catalogClassification?: unknown;
  shippingProfile?: unknown;
}[]): number[] {
  const assessments = products.map(product => {
    const profile = shippingProfileSchema.safeParse(product.shippingProfile);
    const cargos: ShippingCargo[] = profile.success ? [...(profile.data.cargoKinds ?? [])] : [];
    const classification = product.catalogClassification;
    const medicine = Boolean(classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE");
    if (medicine || requiresPrescriptionReview(product) || requiresPurchaseAssistance(product) || /medicament|farmaci/.test(normalizedCategory(product.category))) cargos.push("medication");
    const name = normalizedCategory(product.name ?? null);
    if (/\b(perfume|eau de toilette|deo\s*colonia|body splash)\b/.test(name)) cargos.push("perfume");
    if (/\b(aerossol|aerosol)\b/.test(name)) cargos.push("aerosol");
    return { cargos, approved: profile.success ? profile.data.approvedServiceIds : undefined };
  });
  return configured.filter(service => assessments.every(({ cargos, approved }) => {
    if (cargos.includes("medication") && service !== 1 && service !== 2) return false;
    if (approved !== undefined && !approved.includes(service)) return false;
    const { status } = assessCarrierCargo(service, cargos);
    return status !== "blocked" && status !== "unknown";
  }));
}
