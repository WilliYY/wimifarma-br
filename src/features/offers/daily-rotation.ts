import { canDisplayPmcSavings, pmcSavingsPercent, type PublicPmcReference } from "@/features/products/cmed-reference";
import { brasiliaDay, dailyRank } from "@/features/products/home-collections";

type OfferProduct = {
  price: string;
  promotionalPrice: string | null;
  pmcReference?: PublicPmcReference | null;
  catalogClassification?: unknown;
  requiresPrescription?: boolean;
  prescriptionType?: string;
  isPopularPharmacy?: boolean;
};

/** Use the same comparison as the public card; Pix is selected only at checkout. */
export function productOfferDiscount(product: OfferProduct): number | null {
  const price = Number(product.price);
  const sale = Number(product.promotionalPrice ?? product.price);
  if (!Number.isFinite(price) || !Number.isFinite(sale) || price <= 0 || sale <= 0) return null;
  if (product.pmcReference) {
    return canDisplayPmcSavings(product) ? pmcSavingsPercent(product.pmcReference.amountCents, Math.round(sale * 100)) : null;
  }
  if (!product.promotionalPrice || sale >= price) return null;
  const percent = Math.round((price - sale) * 100 / price);
  return percent >= 1 ? percent : null;
}

export function isDiscountedOffer(product: OfferProduct & { stock: number }): boolean {
  return product.stock > 0 && !product.requiresPrescription && !product.isPopularPharmacy &&
    (!product.prescriptionType || product.prescriptionType === "UNREVIEWED") && productOfferDiscount(product) !== null;
}

export function rotateDailyOffers<T extends { id: string }>(products: T[], date: Date): T[] {
  const day = brasiliaDay(date);
  return products.slice().sort((a, b) => dailyRank(day, a.id) - dailyRank(day, b.id) || a.id.localeCompare(b.id));
}
