import { normalizeProductSearch } from "./public-search";
import { groupCategoryNames } from "./home-shortcuts";

export type PublicBrand = { key: string; name: string; href: string };
type BrandRecord = { brand: string | null; category?: string | null; requiresPrescription?: boolean; catalogClassification?: unknown };

const laboratoryKeys = new Set([
  "EMS", "Teuto", "Germed", "Sandoz", "Aché", "Althaia", "Biolab", "Biosintética", "Cimed", "Eurofarma", "Geolab", "Legrand", "Medley", "Medquímica", "Merck", "Momenta", "Nova Química", "Organon", "Pharlab", "Torrent", "Wyeth",
].map(normalizeProductSearch));

// These commercial medicine names also occur in records with incomplete classification.
const medicineBrandKeys = new Set([
  "Ablok", "Ablok Plus", "Adipept", "Angipress", "Aradois", "Corus", "Creslip", "Dispetic", "Divelol", "Galvus Met", "Glifage", "Meritor", "Plenance", "Renitec", "Rosucor", "Runner", "Sinvascor", "Sitglu Met", "Trezor", "Vaslip", "Vasopril", "Vasopril Plus",
].map(normalizeProductSearch));

function isMedicineRecord(record: BrandRecord) {
  const classification = record.catalogClassification;
  return record.requiresPrescription === true
    || (typeof classification === "object" && classification !== null && "kind" in classification && classification.kind === "MEDICINE")
    || Boolean(record.category && groupCategoryNames([{ name: record.category }], "medicines").length);
}

export function buildPublicBrands(records: BrandRecord[]): PublicBrand[] {
  const brands = new Map<string, PublicBrand>();
  const hiddenKeys = new Set<string>();
  for (const record of records) {
    const name = record.brand?.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = normalizeProductSearch(name);
    if (medicineBrandKeys.has(key) || (!laboratoryKeys.has(key) && isMedicineRecord(record))) hiddenKeys.add(key);
    if (!key || brands.has(key)) continue;
    brands.set(key, { key, name, href: `/catalogo?marca=${encodeURIComponent(name)}&ordem=preco-asc` });
  }
  return [...brands.values()].filter(brand => !hiddenKeys.has(brand.key)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function matchingBrandNames(records: BrandRecord[], brand: string): string[] {
  const key = normalizeProductSearch(brand);
  if (!key) return [];
  return [...new Set(records.flatMap(record => record.brand && normalizeProductSearch(record.brand) === key ? [record.brand] : []))];
}
