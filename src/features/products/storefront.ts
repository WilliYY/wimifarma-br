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
const getPublicBrandRecords = cache(async () => getPrisma().product.findMany({ where: { status: "ACTIVE", brand: { not: null } }, select: { brand: true, name: true, category: true, requiresPrescription: true, isPopularPharmacy: true, catalogClassification: true }, orderBy: { brand: "asc" } }));
export const getPublicBrands = cache(async (): Promise<PublicBrand[]> => buildPublicBrands(await getPublicBrandRecords()));
const storefrontSelect = { ...supplierOfferInclude, cmedReference: true, sku: true, searchText: true, ean: true, inventorySource: true, id: true, name: true, slug: true, brand: true, category: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, activeIngredients: true, searchTerms: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, cashbackEnabled: true, cashbackRateBps: true } satisfies Prisma.ProductSelect;
function availableCatalogSections(rows: Parameters<typeof matchesCatalogSection>[0][], categories: readonly { name: string; names?: string[] }[]) {
  return catalogSections.filter(section => {
    const names = catalogGroupNames(categories, section.group);
    return rows.some(row => (names.includes(row.category ?? "") || (section.group === "medicines" && (row.catalogClassification as { kind?: string } | null)?.kind === "MEDICINE")) && matchesCatalogSection(row, section));
  }).map(section => section.id);
}
export const getPublicCatalogSections = cache(async () => {
  const rows = await getPrisma().product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, category: true, activeIngredients: true, searchTerms: true, catalogClassification: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true } });
  return availableCatalogSections(rows, await getPublicCategories());
});
function productCategories(products: readonly { category: string | null }[]) {
  const categories = new Map<string, { name: string; slug: string; names: string[] }>();
  for (const item of products) {
    const name = item.category?.trim(); if (!name) continue;
    const slug = categorySlug(name); if (!slug) continue;
    const existing = categories.get(slug);
    if (existing) { if (!existing.names.includes(item.category!)) existing.names.push(item.category!); }
    else categories.set(slug, { name: slug === "medicamentos" ? "Medicamentos" : name, slug, names: [item.category!] });
  }
  return [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
export const getPublicCategories = cache(async () => {
  const products = await getPrisma().product.findMany({ where: { status: "ACTIVE", category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  return productCategories(products);
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
  const groupedRows = group === "beauty" ? rows.filter(item => (item.catalogClassification as { kind?: string } | null)?.kind !== "MEDICINE"
    && !item.requiresPrescription && !item.isPopularPharmacy && (!item.prescriptionType || item.prescriptionType === "UNREVIEWED")) : rows;
  const now = Date.now();
  const saleRows = groupedRows.map(item => toSaleProduct(item, now));
  const saleById = new Map(saleRows.map(item => [item.id, item]));
  const offerRows = offers ? saleRows.filter(isDiscountedOffer) : [];
  const offerIds = new Set(offerRows.map(item => item.id));
  const scopeRows = offers ? groupedRows.filter(item => offerIds.has(item.id)) : groupedRows;
  const subsection = catalogSections.find(item => item.id === section);
  const filtered = subsection ? scopeRows.filter(row => matchesCatalogSection(row, subsection)) : scopeRows;
  const matches = query ? rankProductsForQuery(filtered.map(row => ({ ...row, searchText: row.searchText || buildProductSearchText(row) })), query) : filtered;
  const resolved = matches.map(item => saleById.get(item.id)!);
  const products = offers && !query && (!sort || sort === "relevantes")
    ? rotateDailyOffers(resolved, new Date(now))
    : query && (!sort || sort === "relevantes")
    ? resolved.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
    : sortCatalogProducts(resolved, sort ?? (categories || group || brand !== undefined ? "preco-asc" : "relevantes"));
  const offerCategories = productCategories(offerRows);
  const careCategories = offers ? productCategories(saleRows.filter(item => item.stock > 0 && Number(item.promotionalPrice ?? item.price) > 0
    && !item.requiresPrescription && !item.isPopularPharmacy && (!item.prescriptionType || item.prescriptionType === "UNREVIEWED")
    && (item.catalogClassification as { kind?: string } | null)?.kind !== "MEDICINE" && !/^medicamentos?$/i.test(item.category ?? ""))) : [];
  const browseLinks = ([{ group: "beauty", label: "Higiene e beleza" }, { group: "baby", label: "Infantil" }, { group: "dermo", label: "Dermo" }] as const)
    .filter(item => catalogGroupNames(careCategories, item.group).length > 0)
    .map(item => ({ label: item.label as string, href: `/catalogo?grupo=${item.group}` }));
  const adultDiapers = careCategories.find(item => /^fraldas? adultas?$/i.test(item.name));
  if (adultDiapers) browseLinks.push({ label: adultDiapers.name, href: `/categorias/${adultDiapers.slug}` });
  return { count: products.length, products: products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    offerNavigation: offers ? { categories: offerCategories, sections: availableCatalogSections(scopeRows, offerCategories), browseLinks } : undefined,
    // These are the full category/brand rows, before subsection and pagination, never just the visible page.
    categorySections: categories ? availableCatalogSections(scopeRows, categories.map(name => ({ name }))) : undefined };
}
