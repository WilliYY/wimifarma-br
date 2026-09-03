import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  normalizeProductSearch,
  rankProductsForQuery,
  rankRelatedProducts,
  type PublicProductSearchItem,
} from "@/features/products/public-search";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const productSelect = {
  activeIngredients: true,
  brand: true,
  category: true,
  id: true,
  imageUrl: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  searchTerms: true,
  searchText: true,
  slug: true,
} as const;

type SearchProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function serializeProduct(product: SearchProduct): PublicProductSearchItem {
  return {
    activeIngredients: product.activeIngredients,
    brand: product.brand,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    name: product.name,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
    requiresPrescription: product.requiresPrescription,
    searchTerms: product.searchTerms,
    slug: product.slug,
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ data: { products: [], relatedProducts: [] } });
  }

  if (query.length > 80) {
    return NextResponse.json(
      { error: "A busca deve ter no maximo 80 caracteres." },
      { status: 422 },
    );
  }

  const prisma = getPrisma();
  const normalizedQuery = normalizeProductSearch(query);
  if (normalizedQuery.length < 2) {
    return NextResponse.json({ data: { products: [], relatedProducts: [] } });
  }
  const matchingProducts = await prisma.product.findMany({
    orderBy: [{ featuredPosition: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: productSelect,
    take: 30,
    where: {
      searchText: { contains: normalizedQuery },
      status: "ACTIVE",
    },
  });
  const products = rankProductsForQuery(matchingProducts, normalizedQuery).slice(0, 6);
  const primaryProduct = products[0];

  if (!primaryProduct) {
    return NextResponse.json(
      { data: { products: [], relatedProducts: [] } },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  }

  const relationFilters: Prisma.ProductWhereInput[] = [];
  relationFilters.push(
    ...primaryProduct.activeIngredients.map((ingredient) => ({
      searchText: { contains: normalizeProductSearch(ingredient) },
    })),
    ...primaryProduct.searchTerms.map((term) => ({
      searchText: { contains: normalizeProductSearch(term) },
    })),
  );
  if (primaryProduct.category) {
    relationFilters.push({ category: { equals: primaryProduct.category, mode: "insensitive" } });
  }

  const relatedCandidates = relationFilters.length
    ? await prisma.product.findMany({
        orderBy: [{ featuredPosition: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: productSelect,
        take: 30,
        where: {
          id: { notIn: products.map((product) => product.id) },
          OR: relationFilters,
          status: "ACTIVE",
        },
      })
    : [];
  const relatedProducts = rankRelatedProducts(primaryProduct, relatedCandidates).slice(0, 4);

  return NextResponse.json(
    {
      data: {
        products: products.map(serializeProduct),
        relatedProducts: relatedProducts.map(serializeProduct),
      },
    },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
  );
}
