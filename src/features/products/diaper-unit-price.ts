import { isMedicineProduct } from "./product-description";

type DiaperProduct = Parameters<typeof isMedicineProduct>[0] & { name: string };

/** Informational comparison of a single, explicitly counted diaper package. */
export function diaperPackageUnitPrice(product: DiaperProduct, packagePriceCents: number) {
  if (!Number.isSafeInteger(packagePriceCents) || packagePriceCents <= 0 || isMedicineProduct(product)) return null;
  const name = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!/^fraldas?\b/u.test(name)) return null;
  // Packs, kits and promotions can describe a per-pack count or a combined total.
  // Without a structured total, neither is a reliable divisor.
  if (/\b(?:kit|combo|fardo|caixa|leve|pague)\b|[+×]|\d\s*x\s*\d|\d+\s*(?:pacotes|packs)\b/u.test(name)) return null;
  const counts = [...name.matchAll(/(?<![\p{L}\d.,])(?:(?:rn|xxg|xg|gg|p|m|g)\s*)?(\d{1,4})\s*(?:unidades?|unids?\.?|unds?\.?|un\.?|fraldas?)(?![\p{L}\d])/gu)];
  if (counts.length !== 1) return null;
  const quantity = Number(counts[0][1]);
  if (quantity < 1) return null;
  const perDiaperCents = Math.round(packagePriceCents / quantity);
  return perDiaperCents > 0 ? { quantity, perDiaperCents } : null;
}
