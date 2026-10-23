import type { PrescriptionType } from "./purchase-policy";
import type { PublicPmcReference } from "./cmed-reference";
import { searchTopics, type SearchTopic } from "./search-topics";

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
  pmcReference?: PublicPmcReference | null;
  supplierDemandAllowed?: boolean;
  cashbackEnabled?: boolean;
  catalogClassification?: unknown;
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
  brand?: string | null;
  searchText: string;
  activeIngredients?: string[];
  searchTerms?: string[];
  category?: string | null;
  catalogClassification?: unknown;
  sku?: string | null;
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

export function isPrescriptionSearchProduct(product: { requiresPrescription: boolean; prescriptionType?: PrescriptionType }) {
  return product.requiresPrescription || Boolean(product.prescriptionType && product.prescriptionType !== "UNREVIEWED");
}

export function productSearchPlan(query: string) {
  let remaining = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const topics: SearchTopic[] = [];
  // Longest phrase wins: "pressao baixa" and "diabetes tipo 1" cannot fall
  // through to the generic topic. Preserve original punctuation for doses.
  const aliases = searchTopics.flatMap(topic => topic.aliases.map(alias => ({ topic, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);
  for (const { topic, alias } of aliases) {
    const pattern = new RegExp(`(^|[^a-z0-9])${alias.replace(/ /g, "[\\s-]+")}(?=$|[^a-z0-9])`, "g");
    if (!pattern.test(remaining)) continue;
    remaining = remaining.replace(pattern, "$1 ");
    if (!topics.includes(topic)) topics.push(topic);
  }
  const normalized = normalizeProductSearch(query);
  const blocked = topics.length > 0 && (
    /\b(nao|sem|contraindic[a-z]*|alerg[a-z]*|gravida|gravidez|gestante|infantil|crianca|criancas|bebe)\b/.test(normalized) ||
    /\btipo\s*[013456789]\b/.test(normalizeProductSearch(remaining)) ||
    (topics.some(topic => topic.id === "high-pressure") && /\bbaixa\b/.test(normalized)) ||
    (topics.some(topic => topic.id === "cholesterol") && /\bbaixo\b/.test(normalized))
  );
  return { topics, blocked, patterns: productSearchPatterns(remaining), dosePatterns: productDosePatterns(remaining) };
}

function isMedicineSearchProduct(product: SearchRankableProduct) {
  const classification = product.catalogClassification;
  if (classification && typeof classification === "object" && "kind" in classification) {
    return classification.kind === "MEDICINE";
  }
  return /^medicamentos?$/.test(normalizeProductSearch(product.category ?? ""));
}

export function matchesSearchTopic(product: SearchRankableProduct, topic: SearchTopic) {
  const terms = (product.searchTerms ?? []).map(normalizeProductSearch);
  if (terms.some(term => topic.aliases.includes(term))) return true;
  if (new RegExp(topicNamePattern(topic)).test(normalizeProductSearch(product.name))) return true;
  if (!isMedicineSearchProduct(product)) return false;
  if (topic.namePattern && new RegExp(topic.namePattern).test(normalizeProductSearch(product.name))) return true;
  const ingredients = (product.activeIngredients ?? []).flatMap(value => value.split("+").map(normalizeProductSearch));
  return ingredients.some(ingredient => topic.ingredients.includes(ingredient));
}

export function topicNamePattern(topic: SearchTopic) {
  return `(^| )(${topic.aliases.join("|")})($| )`;
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

export function productSpellingVocabulary(products: { name: string; brand?: string | null; activeIngredients?: string[]; searchTerms?: string[] }[]) {
  return [...new Set(products.flatMap(product => normalizeProductSearch([
    product.name, product.brand, ...(product.activeIngredients ?? []), ...(product.searchTerms ?? []),
  ].filter(Boolean).join(" ")).split(" ").filter(word => /^[a-z]{4,32}$/.test(word))))].sort();
}

function spellingDistance(left: string, right: string, limit: number) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let beforePrevious: number[] | undefined;
  for (let i = 1; i <= left.length; i++) {
    const current = Array<number>(right.length + 1).fill(limit + 1);
    current[0] = i;
    let minimum = i;
    for (let j = Math.max(1, i - limit); j <= Math.min(right.length, i + limit); j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + Number(left[i - 1] !== right[j - 1]));
      if (beforePrevious && i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
      minimum = Math.min(minimum, current[j]);
    }
    if (minimum > limit) return limit + 1;
    beforePrevious = previous;
    previous = current;
  }
  return previous[right.length];
}

export function correctProductSearchQuery(query: string, vocabulary: string[]) {
  if (query.length > 80) return null;
  const known = new Set(vocabulary);
  let changed = false;
  const corrected = query.replace(/[\p{L}\p{N}]+(?:[-/_][\p{L}\p{N}]+)*/gu, token => {
    const word = normalizeProductSearch(token);
    if (!/^[a-z]{4,32}$/.test(word) || /[\d/-]/.test(token) || known.has(word) || vocabulary.some(candidate => candidate.startsWith(word))) return token;
    const limit = word.length >= 8 ? 2 : 1;
    let best = limit + 1;
    let replacement: string | null = null;
    let ambiguous = false;
    for (const candidate of vocabulary) {
      if (Math.abs(candidate.length - word.length) > limit) continue;
      const distance = spellingDistance(word, candidate, limit);
      if (distance < best) {
        best = distance;
        replacement = candidate;
        ambiguous = false;
      } else if (distance === best && candidate !== replacement) ambiguous = true;
    }
    if (!replacement || ambiguous || best > limit) return token;
    changed = true;
    return replacement;
  });
  return changed ? corrected : null;
}

export function rankProductsForQuery<T extends SearchRankableProduct>(products: T[], query: string): T[] {
  const exact = rankExactProductsForQuery(products, query);
  if (exact.length || productSearchPlan(query).blocked) return exact;
  const corrected = correctProductSearchQuery(query, productSpellingVocabulary(products));
  return corrected ? rankExactProductsForQuery(products, corrected) : exact;
}

function rankExactProductsForQuery<T extends SearchRankableProduct>(
  products: T[],
  query: string,
) {
  const normalizedQuery = normalizeProductSearch(query);
  const plan = productSearchPlan(query);
  const patterns = plan.patterns.map(pattern => new RegExp(pattern));
  const doses = plan.dosePatterns.map(pattern => new RegExp(pattern, "i"));
  if (plan.blocked || (!patterns.length && !plan.topics.length)) return [];

  return products
    .filter((product) => (product.sku && normalizeProductSearch(product.sku) === normalizedQuery) ||
      (plan.topics.every(topic => matchesSearchTopic(product, topic)) && patterns.every(pattern => pattern.test(product.searchText)) && doses.every(dose => dose.test(product.name))))
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
