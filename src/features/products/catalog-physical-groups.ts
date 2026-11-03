import { shippingAdminProfileSchema } from "@/features/shipping/product-draft";
import { readClassification } from "./catalog-operations";

type PhysicalCatalogProduct = {
  id: string;
  name: string;
  sku?: string | null;
  inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  catalogClassification?: unknown;
  shippingProfile?: unknown;
};

export type CatalogPhysicalGroup = { key: string; label: string; productIds: string[] };
export const PHYSICAL_REVIEW_KEY = "review";
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/** Read-only exact groups. Missing evidence never implies a unit count or physical equivalence. */
export function catalogPhysicalGroups(products: readonly PhysicalCatalogProduct[]): CatalogPhysicalGroup[] {
  const groups = new Map<string, CatalogPhysicalGroup>();
  for (const product of products) {
    if ((product.inventorySource ?? "PHARMACY") !== "PHARMACY") continue;
    const parsed = shippingAdminProfileSchema.safeParse(product.shippingProfile);
    const profile = parsed.success ? parsed.data : null;
    const reference = profile?.reference;
    const classification = readClassification(product.catalogClassification);
    const name = normalize(product.name);
    const packaging = name.match(/\b(caixa|frasco|bisnaga|tubo|sachê|sache|refil|pacote|blister|aerossol|aerosol|roll-on)\b/u)?.[0];
    // Explicit retail count/content only; doses such as mg never establish package quantity.
    const presentation = [...name.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:ml|kg|g|l|unidades?|un|comprimidos?|cápsulas?|capsulas?|cp|cps)\b/gu)].map(match => match[0]);
    const hasCompleteSource = Boolean(profile && reference && product.sku?.trim() && classification.kind !== "UNCLASSIFIED" &&
      packaging && presentation.length && !/\b(?:kit|combo|multipack|leve|grátis|gratis)\b|\d\s*[x×+]\s*\d/u.test(name) &&
      reference.packageLevel === "retail_unit" && normalize(reference.productName) === name &&
      reference.estimate?.packageMaterial && reference.estimate.productFamily && reference.estimate.targetSource &&
      reference.weightSource && reference.dimensionsSource &&
      ["weightGrams", "lengthCm", "widthCm", "heightCm"].every(key => {
        const field = key as "weightGrams" | "lengthCm" | "widthCm" | "heightCm";
        return profile[field] != null && profile[field] === reference[field];
      }));
    const key = hasCompleteSource && profile ? JSON.stringify([
      classification, packaging, presentation, profile.measurementBasis,
      reference?.estimate?.packageMaterial, reference?.estimate?.productFamily, reference?.estimate?.packageDescription,
      profile.weightGrams, profile.lengthCm, profile.widthCm, profile.heightCm,
    ]) : PHYSICAL_REVIEW_KEY;
    const label = key === PHYSICAL_REVIEW_KEY || !profile ? "A conferir · identidade, apresentação ou fonte física pendente"
      : `${packaging} · ${presentation.join(" / ")} · ${profile.weightGrams} g · ${profile.lengthCm} × ${profile.widthCm} × ${profile.heightCm} cm`;
    const existing = groups.get(key);
    if (existing) existing.productIds.push(product.id);
    else groups.set(key, { key, label, productIds: [product.id] });
  }
  return [...groups.values()].sort((a, b) => a.key === PHYSICAL_REVIEW_KEY ? 1 : b.key === PHYSICAL_REVIEW_KEY ? -1 : a.label.localeCompare(b.label, "pt-BR"));
}
