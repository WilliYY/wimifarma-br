import { publicProductImageUrl, publicProductImageUrls } from "@/features/product-images/private-supplier-policy";
import { priceWithMarkup } from "@/features/supplier-planning/planning";

export const supplierOfferInclude = { supplierOffers: true, supplierMarkupBps: true, catalogClassification: true } as const;

export type SupplierCommerceOffer = {
  id: string;
  supplier: string;
  eanNormalized: string;
  unitCostCents: number;
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
  imageUrl?: string | null;
  imageUrls?: string[];
  imageAsset?: unknown;
  supplierOffers?: SupplierCommerceOffer[];
};

/** Canonical GTIN-14: leading zeroes are equivalent; nonzero packaging indicators are not. */
export function normalizeGtin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return null;
  let sum = 0;
  for (let i = value.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) sum += Number(value[i]) * weight;
  if ((10 - sum % 10) % 10 !== Number(value.at(-1))) return null;
  return value.padStart(14, "0");
}

export function gtinVariants(raw: unknown): string[] {
  const canonical = normalizeGtin(raw);
  if (!canonical) return [];
  return [8, 12, 13, 14].filter(size => /^0*$/.test(canonical.slice(0, 14 - size))).map(size => canonical.slice(-size));
}

export function resolveSupplierOffer(product: Pick<CommerceProduct, "ean" | "eanNormalized" | "supplierOffers" | "requiresPrescription" | "supplierMarkupBps">, quantity = 1, now = Date.now()) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(now)) return null;
  const markup = product.supplierMarkupBps ?? 6000;
  if (!Number.isSafeInteger(markup) || markup < 0 || markup > 10000) return null;
  const ean = normalizeGtin(product.eanNormalized ?? product.ean);
  if (!ean) return null;
  return (product.supplierOffers ?? []).flatMap(offer => {
    const observedAt = new Date(offer.observedAt).getTime();
    const validUntil = new Date(offer.validUntil).getTime();
    if (!offer.available || normalizeGtin(offer.eanNormalized) !== ean ||
      !Number.isSafeInteger(offer.unitCostCents) || offer.unitCostCents < 1 || offer.unitCostCents > 100_000_000 ||
      !Number.isFinite(observedAt) || !Number.isFinite(validUntil) || observedAt > now || validUntil <= now ||
      validUntil <= observedAt || validUntil - observedAt > 86_400_000 ||
      [offer.allocationQuantity, offer.reservedQuantity, offer.committedQuantity].some(value => !Number.isSafeInteger(value) || value < 0) ||
      (offer.stockQuantity !== null && (!Number.isSafeInteger(offer.stockQuantity) || offer.stockQuantity < 0))) return [];
    const unitPriceCents = priceWithMarkup(offer.unitCostCents, markup);
    if (product.requiresPrescription && (!Number.isSafeInteger(offer.retailCeilingCents) || offer.retailCeilingCents! < 1)) return [];
    if (offer.retailCeilingCents != null && (!Number.isSafeInteger(offer.retailCeilingCents) || unitPriceCents > offer.retailCeilingCents)) return [];
    const purchaseLimit = Math.max(0, Math.min(offer.allocationQuantity, offer.stockQuantity ?? offer.allocationQuantity) - offer.reservedQuantity - offer.committedQuantity);
    if (purchaseLimit < quantity) return [];
    return [{ ...offer, purchaseLimit, unitPriceCents }];
  }).sort((a, b) => a.unitCostCents - b.unitCostCents || a.supplier.localeCompare(b.supplier) || a.id.localeCompare(b.id))[0] ?? null;
}

export function withCommerceAvailability<T extends CommerceProduct>(product: T, now = Date.now()): Omit<T, "supplierMarkupBps" | "supplierOffers" | "price" | "promotionalPrice" | "inventorySource" | "imageUrl" | "imageUrls" | "imageAsset" | "imageAssetId"> & {
  inventorySource: "PHARMACY" | "DISTRIBUTOR"; price: string; promotionalPrice: string | null;
  purchaseLimit: number; availableForPurchase: boolean; imageUrl: string | null; imageUrls: string[]; imageAsset?: unknown;
} {
  const { supplierMarkupBps: _markup, supplierOffers: _privateOffers, price: _price, promotionalPrice: _promo, inventorySource: _source, imageUrl: _image, imageUrls: _images, imageAsset: _asset, imageAssetId: _assetId, ...safe } = product;
  void [_markup, _privateOffers, _price, _promo, _source, _image, _images, _asset, _assetId];
  const inventorySource = product.inventorySource ?? "PHARMACY";
  const imageUrl = publicProductImageUrl(product);
  if (inventorySource === "PHARMACY") return {
    ...safe, inventorySource, imageUrl, imageUrls: publicProductImageUrls(product), imageAsset: imageUrl && !product.requiresPrescription ? product.imageAsset : null, purchaseLimit: Math.max(0, product.stock), availableForPurchase: product.stock > 0,
    price: String(product.price), promotionalPrice: product.promotionalPrice == null ? null : String(product.promotionalPrice),
  };
  const offer = resolveSupplierOffer(product, 1, now);
  return {
    ...safe, inventorySource, imageUrl, imageUrls: publicProductImageUrls(product), imageAsset: null, purchaseLimit: offer?.purchaseLimit ?? 0, availableForPurchase: Boolean(offer),
    price: offer ? (offer.unitPriceCents / 100).toFixed(2) : String(product.price), promotionalPrice: null,
  };
}

/** Legacy sale DTOs call their purchase limit `stock`; the database stock remains physical. */
export function toSaleProduct<T extends CommerceProduct>(product: T, now = Date.now()) {
  const sale = withCommerceAvailability(product, now);
  return { ...sale, stock: sale.purchaseLimit };
}
