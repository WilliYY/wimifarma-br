export const MEDICINE_PLACEHOLDER_URL = "/brand/medicamento-sem-foto.webp";

export type ProductImageIdentity = {
  category?: string | null;
  requiresPrescription?: boolean;
  isPopularPharmacy?: boolean;
};

/** Visual classification only; never changes purchase or prescription rules. */
export function isMedicineImagePlaceholder(product: ProductImageIdentity) {
  if (product.requiresPrescription || product.isPopularPharmacy) return true;
  const category = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(medicamentos?|genericos?|eticos?|farmacia popular)\b/.test(category);
}
