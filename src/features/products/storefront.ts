import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { categorySlug } from "@/lib/seo";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { groupCategoryNames, type CatalogGroup } from "./home-shortcuts";
import { commercialPrice } from "./home-collections";
import { buildPublicBrands, matchingBrandNames, type PublicBrand } from "./brands";

export const PAGE_SIZE = 24;
const getPublicBrandRecords = cache(async () => getPrisma().product.findMany({ where: { status: "ACTIVE", brand: { not: null } }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }));
export const getPublicBrands = cache(async (): Promise<PublicBrand[]> => buildPublicBrands(await getPublicBrandRecords()));
const storefrontSelect = { ...supplierOfferInclude, ean: true, inventorySource: true, id: true, name: true, slug: true, brand: true, category: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, activeIngredients: true, searchTerms: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, cashbackEnabled: true, cashbackRateBps: true } satisfies Prisma.ProductSelect;
export const getPublicCategories = cache(async () => {
  const products = await getPrisma().product.findMany({ where: { status: "ACTIVE", category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  const categories = new Map<string, { name: string; slug: string; names: string[] }>();
  for (const item of products) {
    const name = item.category?.trim(); if (!name) continue;
    const slug = categorySlug(name); if (!slug) continue;
    const existing = categories.get(slug);
    if (existing) existing.names.push(item.category!); else categories.set(slug, { name, slug, names: [item.category!] });
  }
  return [...categories.values()];
});
export function catalogPageNumber(value: string | string[] | undefined) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 10000 ? numeric : 1;
}
export function catalogPageHref(path: string, page: number) {
  const url = new URL(path, "https://catalog.invalid");
  if (page > 1) url.searchParams.set("pagina", String(page)); else url.searchParams.delete("pagina");
  return `${url.pathname}${url.search}`;
}

export async function getStorefrontProducts({ page = 1, categories, offers = false, group, sort, brand }: { page?: number; categories?: string[]; offers?: boolean; group?: CatalogGroup; sort?: "preco-asc"; brand?: string } = {}) {
  const prisma = getPrisma();
  const groupedNames = group ? groupCategoryNames(await getPublicCategories(), group) : undefined;
  const brandNames = brand !== undefined ? matchingBrandNames(await getPublicBrandRecords(), brand) : undefined;
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", ...(categories ? { category: { in: categories } } : {}), ...(brandNames ? { brand: { in: brandNames } } : {}), ...(offers ? { promotionalPrice: { lt: prisma.product.fields.price } } : {}), ...(group ? { OR: [{ category: { in: groupedNames } }, ...(group === "medicines" ? [{ catalogClassification: { path: ["kind"], equals: "MEDICINE" } }] : [])] } : {}) };
  // Resolve supplier availability before sorting the full result and paginating.
  const rows = await prisma.product.findMany({ where, select: storefrontSelect });
  const now = Date.now();
  const byPrice = sort === "preco-asc" || categories || group || brand !== undefined;
  const products = rows.map(item => toSaleProduct(item, now)).sort((a, b) =>
    Number(b.stock > 0) - Number(a.stock > 0) ||
    (byPrice ? commercialPrice(a) - commercialPrice(b) : 0) ||
    a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id),
  );
  return { count: products.length, products: products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}
