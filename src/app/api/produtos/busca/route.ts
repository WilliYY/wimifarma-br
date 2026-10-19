import { NextResponse } from "next/server";
import { getSearchCatalog, type SearchCatalogProduct } from "@/features/products/search-catalog";
import type { PublicProductSearchItem } from "@/features/products/public-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeProduct(product: SearchCatalogProduct): PublicProductSearchItem {
  return {
    supplierDemandAllowed: product.supplierDemandAllowed,
    cashbackEnabled: product.cashbackEnabled, cashbackRateBps: product.cashbackRateBps,
    activeIngredients: product.activeIngredients, brand: product.brand, category: product.category,
    catalogClassification: product.catalogClassification,
    id: product.id, imageUrl: product.imageUrl, name: product.name,
    price: product.price, promotionalPrice: product.promotionalPrice,
    requiresPrescription: product.requiresPrescription, prescriptionType: product.prescriptionType,
    searchTerms: product.searchTerms, slug: product.slug,
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 80) return NextResponse.json({ error: "A busca deve ter no máximo 80 caracteres." }, { status: 422 });
  const result = await getSearchCatalog(query, { pageSize: 6, relatedLimit: 4 });
  return NextResponse.json({ data: {
    products: result.products.map(serializeProduct), relatedProducts: result.relatedProducts.map(serializeProduct),
  } }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
