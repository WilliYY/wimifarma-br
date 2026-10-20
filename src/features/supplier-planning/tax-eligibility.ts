import { readClassification } from "@/features/products/catalog-operations";

/** Only a validated non-medicine classification can waive the medicine ST check. */
export function requiresSupplierTaxEvidence(product: { requiresPrescription?: boolean; catalogClassification?: unknown }): boolean {
  const kind = readClassification(product.catalogClassification).kind;
  return product.requiresPrescription === true || kind === "MEDICINE" || kind === "UNCLASSIFIED";
}

export function hasRequiredSupplierTax(
  offer: { supplier: string; substitutionTaxCents?: number | null },
  isMedicine: boolean,
): boolean {
  if (!isMedicine || offer.supplier !== "PROFARMA") return true;
  const tax = offer.substitutionTaxCents;
  return typeof tax === "number" && Number.isSafeInteger(tax) && tax >= 0 && tax <= 100_000_000;
}
