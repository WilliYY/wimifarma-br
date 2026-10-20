import { normalizeProductSearch } from "./public-search";

export type PublicBrand = { key: string; name: string; href: string };
type BrandRecord = { brand: string | null };

export function buildPublicBrands(records: BrandRecord[]): PublicBrand[] {
  const brands = new Map<string, PublicBrand>();
  for (const { brand } of records) {
    const name = brand?.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = normalizeProductSearch(name);
    if (!key || brands.has(key)) continue;
    brands.set(key, { key, name, href: `/catalogo?marca=${encodeURIComponent(name)}&ordem=preco-asc` });
  }
  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function matchingBrandNames(records: BrandRecord[], brand: string): string[] {
  const key = normalizeProductSearch(brand);
  if (!key) return [];
  return [...new Set(records.flatMap(record => record.brand && normalizeProductSearch(record.brand) === key ? [record.brand] : []))];
}
