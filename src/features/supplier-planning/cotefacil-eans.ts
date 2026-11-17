import { normalizeGtin } from "@/features/products/gtin";

function uniqueEans(values: Iterable<string>) {
  const eans: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let invalid = 0;

  for (const value of values) {
    const canonical = normalizeGtin(value);
    if (!canonical) {
      invalid++;
    } else if (seen.has(canonical)) {
      duplicates++;
    } else {
      seen.add(canonical);
      eans.push(value);
    }
  }

  return { eans, duplicates, invalid };
}

export function parseCotefacilEans(text: string) {
  return uniqueEans(text.split(/[\s,;]+/).filter(Boolean));
}

export function collectCatalogEans(products: readonly { ean: string | null; eanNormalized: string | null }[]) {
  let missing = 0;
  const storedEans = products.flatMap(({ ean, eanNormalized }) => {
    const original = ean?.trim() ?? "";
    const normalized = eanNormalized?.trim() ?? "";
    if (!original && !normalized) {
      missing++;
      return [];
    }

    const canonical = normalizeGtin(normalized);
    // Keep the stored barcode length when both fields identify the same product.
    return [canonical && normalizeGtin(original) !== canonical ? normalized : original];
  });
  const result = uniqueEans(storedEans);
  result.eans.sort();

  return { ...result, missing };
}
