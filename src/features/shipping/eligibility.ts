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

export function hasPerfumeShippingCargo(name: string): boolean {
  const normalizedName = normalizedCategory(name);
  // Only a dry absorbent presentation by unit can use perfume as a scent qualifier.
  const dryAbsorbent = /^absorventes?\b/.test(normalizedName) && /\b\d+\s*un(?:idades?)?\.?$/.test(normalizedName) &&
    !/ele(?:c)?tric|bateria|pilha|recarreg/.test(normalizedName) &&
    !/\b(liquid[oa]s?|spray|aerossol|aerosol|gel|locao|solucao|essencia|fluido|umidecid[oa]s?|umedecid[oa]s?|umidificad[oa]s?)\b|\b\d+(?:[.,]\d+)?\s*(?:ml|l)\b/.test(normalizedName);
  // A cosmetic powder must identify its dry form and commercial mass, with no mixed presentation.
  const dryPowder = (/^talco\b/.test(normalizedName) || /^desodorante para pes\b.*\bem po\b/.test(normalizedName)) &&
    /\b[1-9]\d*(?:[.,]\d+)?\s*(?:g|kg)\.?$/.test(normalizedName) &&
    (normalizedName.match(/\b\d+(?:[.,]\d+)?\s*(?:g|kg)\b/g)?.length === 1) &&
    !/ele(?:c)?tric|bateria|pilha|recarreg|[+\/]|\b(?:kits?|combos?|liquid\w*|cremes?|cremos[oa]s?|pastas?|pastos[oa]s?|oleos?|oleos[oa]s?|sprays?|aero\w*|alcool\w*|etanol|solvent\w*|acetona|inflam\w*|gel|locao|solucao|essencia|fluido|umidecid\w*|umedecid\w*|umidificad\w*)\b|\d\s*(?:ml|l)\b/.test(normalizedName);
  const perfumeName = dryAbsorbent || dryPowder ? normalizedName.replace(/\b(?:com|sem)\s+perfume\b/g, "") : normalizedName;
  return /\b(perfume|eau de toilette|deo\s*colonia|body splash)\b/.test(perfumeName);
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
    if (hasPerfumeShippingCargo(name)) cargos.push("perfume");
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
