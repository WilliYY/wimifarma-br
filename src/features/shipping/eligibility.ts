export function requiresPharmacyShippingSupport(product: {
  category: string | null;
  requiresPrescription: boolean;
  isPopularPharmacy: boolean;
}): boolean {
  const category = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return product.requiresPrescription || product.isPopularPharmacy || /medicament|farmaci/.test(category);
}
