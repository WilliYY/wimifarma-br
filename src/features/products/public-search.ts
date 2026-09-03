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
  activeIngredients: string[];
  brand: string | null;
  category: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  price: string;
  promotionalPrice: string | null;
  requiresPrescription: boolean;
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

  return products
    .filter((product) => product.searchText.includes(normalizedQuery))
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
