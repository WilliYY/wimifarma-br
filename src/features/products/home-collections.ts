import type { RelatedProductCardItem } from "@/components/site/public-product-card";
import { readClassification, classificationIsConsistent } from "./catalog-operations";

export const HOME_COLLECTION_SIZE = 15;
export type HomeCollections = { care: RelatedProductCardItem[]; otc: RelatedProductCardItem[]; affordable: RelatedProductCardItem[] };

export function brasiliaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function commercialPrice(product: { price: string; promotionalPrice: string | null }) {
  return Number(product.promotionalPrice ?? product.price);
}

function dailyRank(day: string, id: string) {
  let hash = 2166136261;
  for (const char of `${day}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function buildHomeCollections(products: RelatedProductCardItem[], verifiedPhotos: ReadonlySet<string>, date: Date): HomeCollections {
  const eligible = [...new Map(products.filter(product => product.imageUrl && verifiedPhotos.has(product.imageUrl) &&
    !product.imageUrl.startsWith("/brand/") && !product.requiresPrescription &&
    (!product.prescriptionType || product.prescriptionType === "UNREVIEWED") && !product.isPopularPharmacy &&
    product.stock > 0 && Number.isFinite(commercialPrice(product)) && commercialPrice(product) > 0).map(product => [product.id, product])).values()];
  const day = brasiliaDay(date);
  const rotate = (rows: RelatedProductCardItem[]) => [...rows].sort((a, b) => dailyRank(day, a.id) - dailyRank(day, b.id) || a.id.localeCompare(b.id));
  const otcPool = eligible.filter(product => {
    const classification = readClassification(product.catalogClassification);
    return classification.kind === "MEDICINE" && classification.otc && classificationIsConsistent(classification, product);
  });
  const otc = rotate(otcPool).slice(0, HOME_COLLECTION_SIZE);
  const otcIds = new Set(otc.map(product => product.id));
  const carePool = eligible.filter(product => {
    const classification = readClassification(product.catalogClassification);
    if (classification.kind === "MEDICINE") return false;
    const category = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return ["PERFUMERY", "HYGIENE"].includes(classification.kind) || /\b(perfumaria|higiene|beleza|dermo|dermocosmeticos|cosmeticos|cuidados pessoais)\b/.test(category);
  });
  // Prefer other MIPs in the mixed collection; reuse only when there is a care assortment.
  const cheapOtc = [...otcPool].sort((a, b) => commercialPrice(a) - commercialPrice(b) || a.id.localeCompare(b.id));
  const mixedOtc = [...cheapOtc.filter(product => !otcIds.has(product.id)), ...cheapOtc.filter(product => otcIds.has(product.id))].slice(0, 5);
  const careItems = rotate(carePool).slice(0, HOME_COLLECTION_SIZE - mixedOtc.length);
  const care = careItems.flatMap((product, index) => [product, ...(mixedOtc[index] ? [mixedOtc[index]] : [])]);
  if (careItems.length) care.push(...mixedOtc.slice(careItems.length));
  const cheapest = [...eligible].sort((a, b) => commercialPrice(a) - commercialPrice(b) || dailyRank(day, a.id) - dailyRank(day, b.id) || a.id.localeCompare(b.id)).slice(0, HOME_COLLECTION_SIZE);
  // Keep the five best prices first; rotate the other low-price cards daily,
  // even when every price differs (a price tie must not be required).
  const affordable = [...cheapest.slice(0, 5), ...rotate(cheapest.slice(5))];
  const sameProducts = (a: RelatedProductCardItem[], b: RelatedProductCardItem[]) => a.length === b.length && a.every(product => b.some(other => other.id === product.id));
  return { care, otc, affordable: sameProducts(affordable, care) || sameProducts(affordable, otc) ? [] : affordable };
}
