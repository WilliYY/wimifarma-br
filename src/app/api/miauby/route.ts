import { NextResponse } from "next/server";
import { miaubyCatalogQuery, miaubyLocalAnswer, miaubyReplyProducts, miaubyRequestSchema, type MiaubyCatalogProduct } from "@/features/miauby/assistant";
import { limitMiaubyRequest } from "@/features/miauby/request-limits";
import { getSearchCatalog } from "@/features/products/search-catalog";
import { readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" }, status });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    const expected = new URL(process.env.AUTH_URL || request.url).origin;
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && new URL(origin).origin !== expected)) return json({ error: "Origem da solicitação não autorizada." }, 403);
  } catch { return json({ error: "Origem da solicitação não autorizada." }, 403); }
  const retryAfter = limitMiaubyRequest(request);
  if (retryAfter) return NextResponse.json({ error: "Muitas perguntas. Aguarde um pouco e tente novamente." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } });
  const parsed = miaubyRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return json({ error: "Envie uma pergunta de até 500 caracteres." }, 422);

  const { message, history } = parsed.data;
  const local = miaubyLocalAnswer(message);
  if (local) return json({ message: local, products: [], source: "local" });
  const query = miaubyCatalogQuery(message, history);
  if (!query) return json({ message: "Qual é o nome do produto? Se souber, inclua a apresentação ou o EAN para eu consultar o preço certo.", products: [], source: "local" });

  try {
    const result = await getSearchCatalog(query, { pageSize: 4, relatedLimit: 0 });
    // The public DTO retains its stored price when a supplier offer expires.
    // Never present that historical fallback as a current Miauby quote.
    const pricedProducts = result.products.filter(product => product.inventorySource !== "DISTRIBUTOR" || product.availableForPurchase);
    const products: MiaubyCatalogProduct[] = pricedProducts.map(product => ({
      id: product.id, name: product.name, slug: product.slug, brand: product.brand,
      inventorySource: product.inventorySource, catalogClassification: product.catalogClassification,
      category: product.category, imageUrl: product.imageUrl, isPopularPharmacy: product.isPopularPharmacy,
      price: String(product.price), promotionalPrice: product.promotionalPrice == null ? null : String(product.promotionalPrice),
      requiresPrescription: product.requiresPrescription,
    }));
    return json({
      message: products.length
        ? `${result.correctedQuery ? `Resultados aproximados para “${result.correctedQuery}”. ` : ""}Encontrei estas apresentações no catálogo da loja. Os preços estão nos produtos abaixo; confira a apresentação ao abrir o item.`
        : result.products.length
          ? "Não consegui confirmar um preço disponível para essa apresentação agora. Fale com a equipe pelo WhatsApp para conferir."
          : "Não encontrei essa apresentação no catálogo. Tente o nome, a marca ou o EAN do produto, ou fale com a equipe pelo WhatsApp.",
      products: miaubyReplyProducts(message, products),
      source: "catalog",
    });
  } catch {
    // Do not log the question, history, private query diagnostics or user data.
    console.error("[miauby] catalog-unavailable");
    return json({ error: "Não consegui consultar os preços agora. Tente novamente em instantes ou fale com a equipe." }, 503);
  }
}
