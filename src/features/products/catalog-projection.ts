import type { Prisma } from "@/generated/prisma/client";
import { resolveCommerceTerms, type CommerceProduct } from "@/features/supplier-catalog/commerce";
import { normalizeVerifiedMedicineProduct } from "./medicine-presentation";
import { resolveCmedReference } from "./cmed-reference";
import { readClassification } from "./catalog-operations";

/** Global ranking needs identity and commercial evidence, not images or card benefits. */
export const catalogCandidateSelect = {
  id: true, sku: true, name: true, ean: true, brand: true, category: true,
  activeIngredients: true, searchTerms: true,
  requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true,
  price: true, promotionalPrice: true, stock: true, inventorySource: true,
  supplierMarkupBps: true, catalogClassification: true, shippingProfile: true,
  supplierOffers: { select: {
    id: true, supplier: true, eanNormalized: true, unitCostCents: true,
    substitutionTaxCents: true, retailCeilingCents: true, available: true,
    stockQuantity: true, allocationQuantity: true, reservedQuantity: true, committedQuantity: true,
    observedAt: true, validUntil: true,
  } },
} as const satisfies Prisma.ProductSelect;

export function projectCatalogCandidate<T extends CommerceProduct & { id: string; name: string }>(product: T, now: number) {
  const terms = resolveCommerceTerms(product, now);
  return normalizeVerifiedMedicineProduct({ ...product, ...terms, stock: terms.purchaseLimit,
    pmcReference: !product.isPopularPharmacy && readClassification(product.catalogClassification).kind === "MEDICINE"
      ? resolveCmedReference(product.cmedReference, product.eanNormalized ?? product.ean, now) : null });
}
