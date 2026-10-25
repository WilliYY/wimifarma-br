import { normalizeProductSearch } from "./public-search";
import { groupCategoryNames } from "./home-shortcuts";

export type PublicBrand = { key: string; name: string; href: string; imageUrl?: string };
type BrandRecord = { brand: string | null; name?: string; category?: string | null; requiresPrescription?: boolean; isPopularPharmacy?: boolean; catalogClassification?: unknown; imageUrl?: string | null; imageAsset?: { url: string } | null };

const johnsonsKeys = new Set(["johnson s", "johnson s baby", "johnsons", "johnsons baby"]);
function brandIdentity(name: string) {
  const key = normalizeProductSearch(name);
  if (key === "natural baby wipes mae e filho") return "natural baby";
  return johnsonsKeys.has(key) ? "johnson s" : key;
}

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

export function buildPublicBrands(records: BrandRecord[], validPhotos?: ReadonlySet<string>): PublicBrand[] {
  const brands = new Map<string, PublicBrand>();
  const hiddenKeys = new Set<string>();
  for (const record of records) {
    const registeredName = record.brand?.trim().replace(/\s+/g, " ");
    if (!registeredName) continue;
    const key = brandIdentity(registeredName);
    if (medicineBrandKeys.has(key) || (!laboratoryKeys.has(key) && isMedicineRecord(record))) hiddenKeys.add(key);
    // A product title or presentation is not a brand. Keep the original catalog record unchanged.
    if (!key || (record.name && normalizeProductSearch(record.name) === normalizeProductSearch(registeredName))
      || /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|kg|ml|l|un|unid|unidades|comprimidos|cápsulas)\b/i.test(registeredName)) continue;
    const name = key === "johnson s" ? "Johnson’s" : key === "natural baby" ? "Natural Baby" : registeredName;
    const brand: PublicBrand = brands.get(key) ?? { key, name, href: `/catalogo?marca=${encodeURIComponent(name)}&ordem=preco-asc` };
    const photo = record.imageUrl;
    if (!laboratoryKeys.has(key) && !isMedicineRecord(record) && !record.isPopularPharmacy
      && photo && (!validPhotos || validPhotos.has(photo)) && record.imageAsset?.url === photo && /^\/uploads\/products\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g|avif)$/.test(photo)
      && (!brand.imageUrl || photo < brand.imageUrl)) brand.imageUrl = photo;
    brands.set(key, brand);
  }
  return [...brands.values()].filter(brand => !hiddenKeys.has(brand.key)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function matchingBrandNames(records: BrandRecord[], brand: string): string[] {
  const key = brandIdentity(brand);
  if (!key) return [];
  return [...new Set(records.flatMap(record => record.brand && brandIdentity(record.brand) === key ? [record.brand] : []))];
}
