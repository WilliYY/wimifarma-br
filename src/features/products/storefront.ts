import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { categorySlug } from "@/lib/seo";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { type CatalogGroup } from "./home-shortcuts";
import { catalogGroupNames, catalogSections, matchesCatalogSection, sortCatalogProducts, type CatalogSort } from "./catalog-navigation";
import { buildProductSearchText, rankProductsForQuery } from "./public-search";
import { buildPublicBrands, matchingBrandNames, type PublicBrand } from "./brands";
import { isDiscountedOffer, rotateDailyOffers } from "@/features/offers/daily-rotation";

export const PAGE_SIZE = 24;
const getPublicBrandRecords = cache(async () => getPrisma().product.findMany({ where: { status: "ACTIVE", brand: { not: null } }, select: { brand: true, category: true, requiresPrescription: true, catalogClassification: true }, orderBy: { brand: "asc" } }));
export const getPublicBrands = cache(async (): Promise<PublicBrand[]> => buildPublicBrands(await getPublicBrandRecords()));
const storefrontSelect = { ...supplierOfferInclude, cmedReference: true, sku: true, searchText: true, ean: true, inventorySource: true, id: true, name: true, slug: true, brand: true, category: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, activeIngredients: true, searchTerms: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, cashbackEnabled: true, cashbackRateBps: true } satisfies Prisma.ProductSelect;
export const getPublicCatalogSections = cache(async () => {
  const rows = await getPrisma().product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, category: true, activeIngredients: true, searchTerms: true, catalogClassification: true } });
  const categories = await getPublicCategories();
  return catalogSections.filter(section => {
    const names = catalogGroupNames(categories, section.group);
    return rows.some(row => (names.includes(row.category ?? "") || (section.group === "medicines" && (row.catalogClassification as { kind?: string } | null)?.kind === "MEDICINE")) && matchesCatalogSection(row, section));
  }).map(section => section.id);
});
export const getPublicCategories = cache(async () => {
  const products = await getPrisma().product.findMany({ where: { status: "ACTIVE", category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  const categories = new Map<string, { name: string; slug: string; names: string[] }>();
  for (const item of products) {
    const name = item.category?.trim(); if (!name) continue;
    const slug = categorySlug(name); if (!slug) continue;
    const existing = categories.get(slug);
    if (existing) existing.names.push(item.category!); else categories.set(slug, { name: slug === "medicamentos" ? "Medicamentos" : name, slug, names: [item.category!] });
  }
  return [...categories.values()];
});
export function catalogPageNumber(value: string | string[] | undefined) {
  const numeric = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 10000 ? numeric : 1;
}
export function catalogPageHref(path: string, page: number) {
  const url = new URL(path, "https://catalog.invalid");
  if (page > 1) url.searchParams.set("pagina", String(page)); else url.searchParams.delete("pagina");
  return `${url.pathname}${url.search}`;
}

export async function getStorefrontProducts({ page = 1, categories, offers = false, group, sort, brand, section, query }: { page?: number; categories?: string[]; offers?: boolean; group?: CatalogGroup; sort?: CatalogSort; brand?: string; section?: string; query?: string } = {}) {
  const prisma = getPrisma();
  const groupedNames = group ? catalogGroupNames(await getPublicCategories(), group) : undefined;
  const brandNames = brand !== undefined ? matchingBrandNames(await getPublicBrandRecords(), brand) : undefined;
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", ...(categories ? { category: { in: categories } } : {}), ...(brandNames ? { brand: { in: brandNames } } : {}), ...(group ? { OR: [{ category: { in: groupedNames } }, ...(group === "medicines" ? [{ catalogClassification: { path: ["kind"], equals: "MEDICINE" } }] : [])] } : {}) };
  // Resolve supplier availability before sorting the full result and paginating.
  const rows = await prisma.product.findMany({ where, select: storefrontSelect });
  const now = Date.now();
  const subsection = catalogSections.find(item => item.id === section);
  const filtered = subsection ? rows.filter(row => matchesCatalogSection(row, subsection)) : rows;
  const matches = query ? rankProductsForQuery(filtered.map(row => ({ ...row, searchText: row.searchText || buildProductSearchText(row) })), query) : filtered;
  const resolved = matches.map(item => toSaleProduct(item, now)).filter(item => !offers || isDiscountedOffer(item));
  const products = offers && !query && (!sort || sort === "relevantes")
    ? rotateDailyOffers(resolved, new Date(now))
    : query && (!sort || sort === "relevantes")
    ? resolved.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
    : sortCatalogProducts(resolved, sort ?? (categories || group || brand !== undefined ? "preco-asc" : "relevantes"));
  return { count: products.length, products: products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}
