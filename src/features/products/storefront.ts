import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { categorySlug } from "@/lib/seo";

export const PAGE_SIZE = 24;
const storefrontSelect = { id: true, name: true, slug: true, brand: true, category: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, activeIngredients: true, searchTerms: true, requiresPrescription: true, isPopularPharmacy: true, cashbackEnabled: true, cashbackRateBps: true } satisfies Prisma.ProductSelect;
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
export async function getStorefrontProducts({ page = 1, categories, offers = false }: { page?: number; categories?: string[]; offers?: boolean } = {}) {
  const prisma = getPrisma();
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", ...(categories ? { category: { in: categories } } : {}), ...(offers ? { promotionalPrice: { lt: prisma.product.fields.price } } : {}) };
  const [rows, count] = await Promise.all([
    prisma.product.findMany({ where, select: storefrontSelect, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.product.count({ where }),
  ]);
  return { count, products: rows.map(item => ({ ...item, price: item.price.toString(), promotionalPrice: item.promotionalPrice?.toString() ?? null })) };
}
