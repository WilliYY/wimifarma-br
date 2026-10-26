import { catalogGroup, categoryShortcuts, groupCategoryNames, type CatalogGroup } from "./home-shortcuts";
import { commercialPrice } from "./home-collections";
import { matchesSearchTopic, normalizeProductSearch, type SearchRankableProduct } from "./public-search";
import { searchTopics } from "./search-topics";

export const catalogSorts = [
  { value: "relevantes", label: "Mais relevantes" },
  { value: "preco-asc", label: "Menor preço" },
  { value: "preco-desc", label: "Maior preço" },
  { value: "nome-asc", label: "Nome: A–Z" },
  { value: "nome-desc", label: "Nome: Z–A" },
] as const;
export type CatalogSort = typeof catalogSorts[number]["value"];
export type CatalogParams = Record<string, string | string[] | undefined>;
type CatalogSection = { id: string; label: string; group: CatalogGroup; topic?: string; pattern?: RegExp };
export const catalogSections: CatalogSection[] = [
  { id: "diabetes", label: "Diabetes", group: "medicines", topic: "diabetes" },
  { id: "pressure", label: "Pressão", group: "medicines", topic: "high-pressure" },
  { id: "cholesterol", label: "Colesterol", group: "medicines", topic: "cholesterol" },
  { id: "pain", label: "Dor e febre", group: "medicines", topic: "pain" },
  { id: "flu", label: "Gripe", group: "medicines", topic: "flu" },
  { id: "heartburn", label: "Azia e refluxo", group: "medicines", topic: "heartburn" },
  { id: "hair", label: "Cabelos", group: "beauty", pattern: /\b(shampoo|condicionador|capilar|cabelos?|leave in)\b/ },
  { id: "bath", label: "Banho", group: "beauty", pattern: /\b(sabonete|banho)\b/ },
  { id: "deodorant", label: "Desodorantes", group: "beauty", pattern: /\b(desodorante|antitranspirante)\b/ },
  { id: "oral", label: "Higiene bucal", group: "beauty", pattern: /\b(dental|bucal|dentais|dentifricio)\b/ },
  { id: "intimate", label: "Higiene íntima", group: "beauty", pattern: /\b(intimo|intima|absorvente)\b/ },
  { id: "perfume", label: "Perfumes", group: "beauty", pattern: /\b(perfume|colonia|eau de (parfum|toilette|cologne))\b/ },
  { id: "sun", label: "Proteção solar", group: "dermo", pattern: /\b(protetor solar|protecao solar|fps\s*\d+)\b/ },
  { id: "hydration", label: "Hidratação", group: "dermo", pattern: /\b(hidratante|hidratacao|locao corporal)\b/ },
  { id: "face", label: "Cuidados com o rosto", group: "dermo", pattern: /\b(facial|rosto|serum|micelar)\b/ },
  { id: "diapers", label: "Fraldas", group: "baby", pattern: /\b(fralda|fraldas)\b/ },
  { id: "baby-care", label: "Cuidados infantis", group: "baby", pattern: /\b(infantil|bebe|baby|lencos umedecidos)\b/ },
  { id: "vitamins", label: "Vitaminas", group: "vitamins", pattern: /\b(vitamina|vitaminas|multivitaminico|polivitaminico)\b/ },
  { id: "supplements", label: "Suplementos", group: "vitamins", pattern: /\b(suplemento|creatina|whey|colageno|omega)\b/ },
];

export function catalogFilters(params: CatalogParams) {
  const string = (key: string, max: number) => typeof params[key] === "string" ? params[key].trim().slice(0, max) || undefined : undefined;
  const numeric = typeof params.pagina === "string" && /^\d+$/.test(params.pagina) ? Number(params.pagina) : 1;
  const section = catalogSections.find(section => section.id === params.assunto);
  const group = catalogGroup(params.grupo);
  return {
    page: Number.isInteger(numeric) && numeric >= 1 && numeric <= 10_000 ? numeric : 1,
    sort: catalogSorts.find(sort => sort.value === params.ordem)?.value ?? "relevantes",
    group: group ?? section?.group,
    brand: string("marca", 120), query: string("q", 80),
    section: section && (!group || group === section.group) ? section.id : undefined,
    offers: params.ofertas === "1",
  };
}

export function catalogFilterHref(path: string, changes: Record<string, string | undefined> = {}, destination?: string) {
  const url = new URL(path, "https://catalog.invalid");
  if (destination) url.pathname = destination;
  else if ("grupo" in changes) url.pathname = "/catalogo";
  url.searchParams.delete("pagina");
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}`;
}

export function catalogFiltersPath(base: string, filters: ReturnType<typeof catalogFilters>) {
  const query = new URLSearchParams();
  if (filters.group) query.set("grupo", filters.group);
  if (filters.section) query.set("assunto", filters.section);
  if (filters.brand) query.set("marca", filters.brand);
  if (filters.query) query.set("q", filters.query);
  if (filters.sort !== "relevantes") query.set("ordem", filters.sort);
  if (filters.offers && base !== "/ofertas") query.set("ofertas", "1");
  return `${base}${query.size ? `?${query}` : ""}`;
}

export function catalogPagination(page: number, pages: number): (number | string)[] {
  const total = Math.max(1, Math.floor(pages));
  const current = Math.min(total, Math.max(1, page));
  const start = current <= 4 ? 1 : current >= total - 3 ? Math.max(1, total - 5) : current - 2;
  const end = current <= 4 ? Math.min(total, 6) : current >= total - 3 ? total : current + 2;
  const numbers = [...new Set([1, ...Array.from({ length: end - start + 1 }, (_, i) => start + i), total])];
  return numbers.flatMap((number, i) => i && number - numbers[i - 1] > 1 ? [`gap-${numbers[i - 1]}`, number] : [number]);
}

export function matchesCatalogSection(product: Omit<SearchRankableProduct, "searchText">, section: CatalogSection) {
  if (section.group === "baby" && !groupCategoryNames([{ name: product.category ?? "" }], "baby").length) return false;
  if (section.topic) return matchesSearchTopic({ ...product, searchText: "" }, searchTopics.find(topic => topic.id === section.topic)!);
  const classification = product.catalogClassification as { kind?: string } | null;
  if (classification?.kind === "MEDICINE" || /^medicamentos?$/.test(normalizeProductSearch(product.category ?? ""))) return false;
  let name = normalizeProductSearch(product.name);
  if (section.id === "perfume") {
    name = name.replace(/\b(sem|livre de|isento de) (perfume|fragrancia)\b/g, "");
    const fragrance = section.pattern?.exec(name);
    if (!fragrance) return false;
    const care = /\b(antitranspirante|antiperspirante|sabonete|shampoo|condicionador|hidratante|creme|locao corporal|oleo de banho|lencos?|talco)\b/.exec(name);
    if (care && care.index < fragrance.index) return false;
    // Desodorante colônia é uma fragrância; perfume no nome de um aerossol não muda seu tipo.
    const deodorant = /\bdesodorantes?\b/.exec(name);
    if (deodorant && deodorant.index < fragrance.index && !/\b(colonia|eau de (parfum|toilette|cologne))\b/.test(name)) return false;
    return true;
  }
  return section.pattern?.test(name) ?? false;
}

export function catalogGroupNames(categories: readonly { name: string; names?: string[] }[], group: CatalogGroup) {
  const names = groupCategoryNames(categories, group);
  if (group === "beauty") names.push(...categories.filter(category => /\b(higiene|cuidados pessoais)\b/.test(normalizeProductSearch(category.name))).flatMap(category => category.names ?? [category.name]));
  return [...new Set(names)];
}

export function catalogCategoryGroups(categories: readonly { name: string; slug: string; names: string[] }[]) {
  const assigned = new Set<string>();
  const groups = categoryShortcuts.map(group => {
    const names = catalogGroupNames(categories, group.id);
    const children = categories.filter(category => category.names.some(name => names.includes(name)) && !assigned.has(category.slug));
    children.forEach(category => assigned.add(category.slug));
    return { id: group.id, label: group.id === "beauty" ? "Higiene e beleza" : group.label, categories: children };
  });
  return { groups, others: categories.filter(category => !assigned.has(category.slug)) };
}

export function sortCatalogProducts<T extends { id: string; name: string; stock: number; price: string; promotionalPrice: string | null }>(products: T[], sort: CatalogSort = "relevantes") {
  return products.slice().sort((a, b) => {
    const availability = Number(b.stock > 0) - Number(a.stock > 0);
    const price = commercialPrice(a) - commercialPrice(b);
    const name = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    return availability || (sort === "preco-asc" ? price : sort === "preco-desc" ? -price : sort === "nome-desc" ? -name : sort === "nome-asc" ? name : 0) || name || a.id.localeCompare(b.id);
  });
}
