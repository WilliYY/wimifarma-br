export const MEDICINE_PLACEHOLDER_URL = "/brand/medicamento-sem-foto.webp";

export type ProductImageIdentity = {
  catalogClassification?: unknown;
  category?: string | null;
  requiresPrescription?: boolean;
  prescriptionType?: string;
  isPopularPharmacy?: boolean;
};

/** Explicit visual identity only; ethical is independent of reference status. */
export function medicineIllustrationUrl(product: ProductImageIdentity) {
  if (product.prescriptionType === "ANTIMICROBIAL") return "/brand/medicamento-antibiotico-ilustrativo.webp";
  if (product.prescriptionType === "CONTROLLED") return "/brand/medicamento-controlado-ilustrativo.webp";
  const value = product.catalogClassification;
  const classification = value && typeof value === "object" && !Array.isArray(value)
    ? value as { medicineClass?: unknown; ethical?: unknown } : null;
  if (classification?.medicineClass === "GENERIC") return MEDICINE_PLACEHOLDER_URL;
  if (classification?.medicineClass === "SIMILAR") return "/brand/medicamento-similar-ilustrativo.webp";
  if (classification?.medicineClass === "REFERENCE" || classification?.ethical === true) return "/brand/medicamento-etico-ilustrativo.webp";
  return "/brand/medicamento-ilustrativo.webp";
}

export function productImageAlt(name: string, imageUrl?: string | null) {
  return imageUrl && [MEDICINE_PLACEHOLDER_URL, "/brand/medicamento-similar-ilustrativo.webp", "/brand/medicamento-etico-ilustrativo.webp", "/brand/medicamento-ilustrativo.webp", "/brand/medicamento-antibiotico-ilustrativo.webp", "/brand/medicamento-controlado-ilustrativo.webp"].includes(imageUrl)
    ? `Imagem ilustrativa de medicamento, não representa a embalagem de ${name}` : name;
}

/** Visual classification only; never changes purchase or prescription rules. */
export function isMedicineImagePlaceholder(product: ProductImageIdentity) {
  if (product.requiresPrescription || product.isPopularPharmacy) return true;
  const category = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(medicamentos?|genericos?|eticos?|farmacia popular)\b/.test(category);
}
