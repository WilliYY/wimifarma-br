import type { PrescriptionType } from "./purchase-policy";

export type ProductSearchSource = {
  activeIngredients: string[];
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  ean?: string | null;
  name: string;
  searchTerms: string[];
  sku?: string | null;
};

export type PublicProductSearchItem = {
  cashbackEnabled?: boolean;
  cashbackRateBps?: number;
  activeIngredients: string[];
  brand: string | null;
  category: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  price: string;
  promotionalPrice: string | null;
  requiresPrescription: boolean;
  prescriptionType?: PrescriptionType;
  searchTerms: string[];
  slug: string;
};

export type SearchRankableProduct = {
  id: string;
  name: string;
  searchText: string;
};

export type RelatedProduct = {
  activeIngredients: string[];
  category: string | null;
  id: string;
  name: string;
  searchTerms: string[];
};

export function normalizeProductSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function productSearchPatterns(query: string) {
  const tokens = normalizeProductSearch(query)
    .replace(/(\d+)\s+(mcg|mg|ml|g|kg|ui)\b/g, "$1$2")
    .split(" ")
    .filter(token => token && !["de", "da", "do", "das", "dos", "e"].includes(token));
  return [...new Set(tokens)].slice(0, 12).map(token => {
    const dose = /^(\d+)(mcg|mg|ml|g|kg|ui)$/.exec(token);
    if (dose) return `(^| )${dose[1]} ?${dose[2]}($| )`;
    if (/^\d+$/.test(token)) return `(^| )${token}[a-z]*($| )`;
    return `(^| )${token}`;
  });
}

// Match explicit strengths against the original name: the search index replaces
// punctuation with spaces and cannot distinguish 2,5mg from a fragment of 5mg.
export function productDosePatterns(query: string) {
  const strength = /(\d+(?:[.,]\d+)?)\s*(mcg|mg|ml|kg|g|ui)\b/g;
  const patterns = [...query.toLowerCase().matchAll(strength)].map(match =>
    `(^|[^0-9.,])${match[1].replace(/[.,]/g, "[.,]")}\\s*${match[2]}($|[^a-z0-9])`,
  );
  const bareNumbers = query.toLowerCase().replace(strength, " ").split(/\s+/)
    .map(token => token.replace(/^[([]+|[)\]]+$/g, ""))
    .filter(token => /^\d+(?:[.,]\d+)?$/.test(token) && token.replace(/[.,]/g, "").length < 8);
  return [...patterns, ...bareNumbers.map(number => `(^|[^0-9.,])${number.replace(/[.,]/g, "[.,]")}($|[^0-9.,])`)];
}

export function productSearchHref(query: string, page = 1) {
  const params = new URLSearchParams({ q: query.trim().slice(0, 80) });
  if (page > 1) params.set("pagina", String(page));
  return `/busca?${params.toString()}`;
}

export function ingredientSearchIdentities(ingredients: string[]) {
  return [...new Set(ingredients.flatMap(ingredient => ingredient.split("+").map(part => {
    const normalized = normalizeProductSearch(part);
    return normalized === "losartana potassica" ? "losartana" : normalized;
  })).filter(Boolean))];
}

export function isProductAssociation(product: Pick<RelatedProduct, "activeIngredients" | "name">) {
  return ingredientSearchIdentities(product.activeIngredients).length > 1 || product.name.includes("+");
}

export function parseProductTerms(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[,;\n]/)
    .map((term) => term.trim().replace(/\s+/g, " "))
    .filter((term) => {
      const normalized = normalizeProductSearch(term);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export function buildProductSearchText(product: ProductSearchSource) {
  return [
    product.name,
    product.brand,
    product.category,
    product.description,
    product.ean,
    product.sku,
    ...product.activeIngredients,
    ...product.searchTerms,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeProductSearch)
    .filter(Boolean)
    .join(" ");
}

export function rankProductsForQuery<T extends SearchRankableProduct>(
  products: T[],
  query: string,
) {
  const normalizedQuery = normalizeProductSearch(query);
  const patterns = productSearchPatterns(query).map(pattern => new RegExp(pattern));
  const doses = productDosePatterns(query).map(pattern => new RegExp(pattern, "i"));
  if (!patterns.length) return [];

  return products
    .filter((product) => patterns.every(pattern => pattern.test(product.searchText)) && doses.every(dose => dose.test(product.name)))
    .map((product) => {
      const normalizedName = normalizeProductSearch(product.name);
      let score = 0;

      if (normalizedName === normalizedQuery) score = 500;
      else if (normalizedName.startsWith(normalizedQuery)) score = 350;
      else if (` ${normalizedName}`.includes(` ${normalizedQuery}`)) score = 250;
      else if (normalizedName.includes(normalizedQuery)) score = 180;
      else if (product.searchText.startsWith(normalizedQuery)) score = 100;

      return { product, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.product.name.localeCompare(right.product.name, "pt-BR"),
    )
    .map(({ product }) => product);
}

function normalizedSet(values: string[]) {
  return new Set(values.map(normalizeProductSearch).filter(Boolean));
}

export function rankRelatedProducts<T extends RelatedProduct>(
  source: RelatedProduct,
  candidates: T[],
) {
  const sourceIngredients = normalizedSet(source.activeIngredients);
  const sourceTerms = normalizedSet(source.searchTerms);
  const sourceCategory = normalizeProductSearch(source.category ?? "");

  return candidates
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => {
      const ingredientMatches = candidate.activeIngredients.filter((ingredient) =>
        sourceIngredients.has(normalizeProductSearch(ingredient)),
      ).length;
      const termMatches = candidate.searchTerms.filter((term) =>
        sourceTerms.has(normalizeProductSearch(term)),
      ).length;
      const categoryMatches =
        Boolean(sourceCategory) &&
        normalizeProductSearch(candidate.category ?? "") === sourceCategory;
      const score = ingredientMatches * 100 + termMatches * 20 + (categoryMatches ? 5 : 0);

      return { product: candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.product.name.localeCompare(right.product.name, "pt-BR"),
    )
    .map(({ product }) => product);
}
