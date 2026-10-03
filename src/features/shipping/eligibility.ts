export function requiresPharmacyShippingSupport(product: {
  category: string | null;
  requiresPrescription: boolean;
  isPopularPharmacy: boolean;
}): boolean {
  return product.requiresPrescription || product.isPopularPharmacy || /farmacia\s*popular/.test(normalizedCategory(product.category));
}

function normalizedCategory(category: string | null): string {
  return (category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function permittedShippingServices(configured: number[], products: { category: string | null }[]): number[] {
  // Other carriers need explicit acceptance of this cargo. Quotes alone do not prove acceptance.
  const containsMedication = products.some((product) => /medicament|farmaci/.test(normalizedCategory(product.category)));
  return containsMedication ? configured.filter((service) => service === 1 || service === 2) : configured;
}
