import type { PublicCatalogIdentity } from "../catalog-identities/types";
import { normalizeGtin } from "./gtin";
import { buildProductSearchText, productSearchPlan, rankExactProductsForQuery } from "./public-search";

type CommercialIdentity = { id: string; name: string; ean?: string | null; eanNormalized?: string | null };
export type PublicCatalogEntry<T> = T | PublicCatalogIdentity;

export function isConsultationIdentity(value: unknown): value is PublicCatalogIdentity {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "CONSULTATION";
}

/** Search metadata is derived only from the public identity allowlist. */
export function consultationSearchRecord(item: PublicCatalogIdentity) {
  const source = { id: item.id, name: item.name, ean: item.ean, eanNormalized: item.gtinCanonical,
    category: item.categoryName, brand: null, activeIngredients: [], searchTerms: [] };
  return { ...source, searchText: buildProductSearchText(source) };
}

export function searchConsultationCatalog(items: readonly PublicCatalogIdentity[], query: string) {
  if (productSearchPlan(query).topics.length) return [];
  const byId = new Map(items.map(item => [item.id, item]));
  return rankExactProductsForQuery(items.map(consultationSearchRecord), query).map(item => byId.get(item.id)!);
}

/** Re-project the public allowlist; commercial references never enter this DTO. */
function consultationProjection(item: PublicCatalogIdentity): PublicCatalogIdentity | null {
  const gtin = normalizeGtin(item.gtinCanonical);
  if (!gtin || gtin !== item.gtinCanonical || normalizeGtin(item.ean) !== gtin ||
    item.id !== `catalog:${gtin}` || item.href !== `/catalogo/item/${item.ean}` || !item.name.trim()) return null;
  return { kind: "CONSULTATION", id: item.id, gtinCanonical: gtin, ean: item.ean, name: item.name,
    categoryName: item.categoryName, categorySlug: item.categorySlug, href: item.href };
}

/** Preserve commercial ranking; an exact barcode identity can lead its own search. */
export function mergeConsultationCatalog<T extends CommercialIdentity>(
  sales: readonly T[],
  identities: readonly PublicCatalogIdentity[],
  { query }: { query?: string } = {},
): PublicCatalogEntry<T>[] {
  const occupied = new Set(sales.flatMap(item => {
    const gtin = normalizeGtin(item.eanNormalized) ?? normalizeGtin(item.ean);
    return gtin ? [gtin] : [];
  }));
  const consultations: PublicCatalogIdentity[] = [];
  for (const item of identities) {
    const projected = consultationProjection(item);
    if (!projected || occupied.has(projected.gtinCanonical)) continue;
    occupied.add(projected.gtinCanonical);
    consultations.push(projected);
  }
  const exactGtin = normalizeGtin(query);
  const exact = exactGtin ? consultations.find(item => item.gtinCanonical === exactGtin) : undefined;
  return exact
    ? [exact, ...sales, ...consultations.filter(item => item !== exact)]
    : [...sales, ...consultations];
}

export function paginateConsultationCatalog<T extends CommercialIdentity>(
  sales: readonly T[],
  identities: readonly PublicCatalogIdentity[],
  { page = 1, pageSize = 24, query }: { page?: number; pageSize?: number; query?: string } = {},
) {
  const safePage = Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
  const safeSize = Number.isFinite(pageSize) ? Math.min(24, Math.max(1, Math.floor(pageSize))) : 24;
  const merged = mergeConsultationCatalog(sales, identities, { query });
  return { count: merged.length, products: merged.slice((safePage - 1) * safeSize, safePage * safeSize) };
}
