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

export type CotefacilCatalogItem = { ean: string; description: string };

export function buildCotefacilCsv(eans: readonly string[], items: readonly CotefacilCatalogItem[]) {
  const descriptions = new Map(items.map(item => [normalizeGtin(item.ean), item.description]));
  const escapeDescription = (text: string) => {
    const value = /^[\s\uFEFF]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${value.replaceAll('"', '""')}"`;
  };
  const valid = parseCotefacilEans(eans.join("\n"));
  if (valid.invalid) throw new Error("Revise os EANs antes de baixar o CSV.");

  return valid.eans.map(ean => {
    const description = descriptions.get(normalizeGtin(ean));
    if (!description?.trim()) throw new Error("Há EANs sem descrição pública no catálogo. Revise a lista antes de baixar o CSV.");
    return `"${ean}",1,"${ean}",${escapeDescription(description)},"NAO INFORMADO"`;
  }).join("\r\n") + (valid.eans.length ? "\r\n" : "");
}

export function collectCatalogEans(products: readonly { ean: string | null; eanNormalized: string | null; name?: string }[]) {
  let missing = 0;
  const descriptions = new Map<string, string>();
  const storedEans = products.flatMap(({ ean, eanNormalized, name }) => {
    const original = ean?.trim() ?? "";
    const normalized = eanNormalized?.trim() ?? "";
    if (!original && !normalized) {
      missing++;
      return [];
    }

    const canonical = normalizeGtin(normalized);
    // Keep the stored barcode length when both fields identify the same product.
    const value = canonical && normalizeGtin(original) !== canonical ? normalized : original;
    const identity = normalizeGtin(value);
    if (identity && name?.trim() && !descriptions.has(identity)) descriptions.set(identity, name);
    return [value];
  });
  const result = uniqueEans(storedEans);
  result.eans.sort();

  const items = result.eans.flatMap(ean => {
    const description = descriptions.get(normalizeGtin(ean)!);
    return description ? [{ ean, description }] : [];
  });
  return { ...result, missing, items };
}
