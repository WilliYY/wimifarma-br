import { publicProductImageUrl, publicProductImageUrls } from "@/features/product-images/private-supplier-policy";
import { priceWithMarkup } from "@/features/supplier-planning/planning";
import { MAX_ORDER_ITEM_QUANTITY } from "@/features/products/quantity";
import { hasRequiredSupplierTax, requiresSupplierTaxEvidence } from "@/features/supplier-planning/tax-eligibility";
import { normalizeGtin } from "@/features/products/gtin";
import { readClassification } from "@/features/products/catalog-operations";
import { resolveCmedReference, type PublicPmcReference } from "@/features/products/cmed-reference";

export { normalizeGtin, gtinVariants } from "@/features/products/gtin";

export const supplierOfferInclude = { supplierOffers: true, supplierMarkupBps: true, catalogClassification: true } as const;

export type SupplierCommerceOffer = {
  id: string;
  supplier: string;
  eanNormalized: string;
  unitCostCents: number;
  substitutionTaxCents?: number | null;
  retailCeilingCents?: number | null;
  available: boolean;
  stockQuantity: number | null;
  allocationQuantity: number;
  reservedQuantity: number;
  committedQuantity: number;
  observedAt: Date | string;
  validUntil: Date | string;
};

export type CommerceProduct = {
  supplierDemandAllowed?: boolean;
  catalogClassification?: unknown;
  imageAssetId?: string | null;
  supplierMarkupBps?: number;
  inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  ean?: string | null;
  eanNormalized?: string | null;
  stock: number;
  price: unknown;
  promotionalPrice?: unknown;
  requiresPrescription?: boolean;
  isPopularPharmacy?: boolean;
  imageUrl?: string | null;
  imageUrls?: string[];
  imageAsset?: unknown;
  supplierOffers?: SupplierCommerceOffer[];
  cmedReference?: unknown;
};

export function resolveSupplierOffer(product: Pick<CommerceProduct, "ean" | "eanNormalized" | "supplierOffers" | "requiresPrescription" | "supplierMarkupBps" | "supplierDemandAllowed" | "catalogClassification">, quantity = 1, now = Date.now()) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_ITEM_QUANTITY || !Number.isFinite(now)) return null;
  const markup = product.supplierMarkupBps ?? 6000;
  if (!Number.isSafeInteger(markup) || markup < 0 || markup > 10000) return null;
  const ean = normalizeGtin(product.eanNormalized ?? product.ean);
  if (!ean) return null;
  const isMedicine = requiresSupplierTaxEvidence(product);
  // Prefer current eligible observations. For the demand policy, retain the last
  // structurally valid offer without rewriting its dates or inventory accounting.
  // Each product/source has one persisted row; an unavailable refresh replaces it.
  return (product.supplierOffers ?? []).flatMap(offer => {
    const observedAt = new Date(offer.observedAt).getTime();
    const validUntil = new Date(offer.validUntil).getTime();
    if (!offer.available || !hasRequiredSupplierTax(offer, isMedicine) || normalizeGtin(offer.eanNormalized) !== ean ||
      !Number.isSafeInteger(offer.unitCostCents) || offer.unitCostCents < 1 || offer.unitCostCents > 100_000_000 ||
      !Number.isFinite(observedAt) || !Number.isFinite(validUntil) || observedAt > now ||
      (validUntil <= now && product.supplierDemandAllowed !== true) ||
      validUntil <= observedAt || validUntil - observedAt > 86_400_000 ||
      [offer.allocationQuantity, offer.reservedQuantity, offer.committedQuantity].some(value => !Number.isSafeInteger(value) || value < 0) ||
      (offer.stockQuantity !== null && (!Number.isSafeInteger(offer.stockQuantity) || offer.stockQuantity < 0))) return [];
    const unitPriceCents = priceWithMarkup(offer.unitCostCents, markup);
    if (product.requiresPrescription && (!Number.isSafeInteger(offer.retailCeilingCents) || offer.retailCeilingCents! < 1)) return [];
    if (offer.retailCeilingCents != null && (!Number.isSafeInteger(offer.retailCeilingCents) || unitPriceCents > offer.retailCeilingCents)) return [];
    // The owner accepts supplier fulfilment above observed quantities. Keep the
    // observation and accounting intact; this limit bounds protocol/money only.
    if (product.supplierDemandAllowed && offer.stockQuantity === 0) return [];
    const purchaseLimit = product.supplierDemandAllowed ? MAX_ORDER_ITEM_QUANTITY : Math.max(0, Math.min(offer.allocationQuantity, offer.stockQuantity ?? offer.allocationQuantity) - offer.reservedQuantity - offer.committedQuantity);
    if (purchaseLimit < quantity) return [];
    return [{ ...offer, purchaseLimit, unitPriceCents }];
  }).sort((a, b) => Number(new Date(a.validUntil).getTime() <= now) - Number(new Date(b.validUntil).getTime() <= now)
    || a.unitCostCents - b.unitCostCents || a.supplier.localeCompare(b.supplier) || a.id.localeCompare(b.id))[0] ?? null;
}

export function withCommerceAvailability<T extends CommerceProduct>(product: T, now = Date.now()): Omit<T, "supplierMarkupBps" | "supplierOffers" | "price" | "promotionalPrice" | "inventorySource" | "imageUrl" | "imageUrls" | "imageAsset" | "imageAssetId" | "cmedReference"> & {
  inventorySource: "PHARMACY" | "DISTRIBUTOR"; supplierDemandAllowed?: boolean; price: string; promotionalPrice: string | null;
  purchaseLimit: number; availableForPurchase: boolean; imageUrl: string | null; imageUrls: string[]; imageAsset?: unknown;
  pmcReference: PublicPmcReference | null;
} {
  const { supplierMarkupBps: _markup, supplierOffers: _privateOffers, price: _price, promotionalPrice: _promo, inventorySource: _source, imageUrl: _image, imageUrls: _images, imageAsset: _asset, imageAssetId: _assetId, cmedReference: _cmed, ...safe } = product;
  void [_markup, _privateOffers, _price, _promo, _source, _image, _images, _asset, _assetId, _cmed];
  const inventorySource = product.inventorySource ?? "PHARMACY";
  const imageUrl = publicProductImageUrl(product);
  const pmcReference = !product.isPopularPharmacy && readClassification(product.catalogClassification).kind === "MEDICINE"
    ? resolveCmedReference(product.cmedReference, product.eanNormalized ?? product.ean, now) : null;
  if (inventorySource === "PHARMACY") return {
    ...safe, inventorySource, pmcReference, supplierDemandAllowed: false, imageUrl, imageUrls: publicProductImageUrls(product), imageAsset: imageUrl && !product.requiresPrescription ? product.imageAsset : null, purchaseLimit: Math.max(0, product.stock), availableForPurchase: product.stock > 0,
    price: String(product.price), promotionalPrice: product.promotionalPrice == null ? null : String(product.promotionalPrice),
  };
  const offer = resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, 1, now);
  return {
    ...safe, inventorySource, pmcReference, supplierDemandAllowed: true, imageUrl, imageUrls: publicProductImageUrls(product), imageAsset: null, purchaseLimit: offer?.purchaseLimit ?? 0, availableForPurchase: Boolean(offer),
    price: offer ? (offer.unitPriceCents / 100).toFixed(2) : String(product.price), promotionalPrice: null,
  };
}

/** Legacy sale DTOs call their purchase limit `stock`; the database stock remains physical. */
export function toSaleProduct<T extends CommerceProduct>(product: T, now = Date.now()) {
  const sale = withCommerceAvailability(product, now);
  return { ...sale, stock: sale.purchaseLimit };
}
