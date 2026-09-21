import { requireAdminApi } from "@/features/auth/permissions";
import { buildMerchantFeed } from "@/features/products/marketing";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  try {
    const rows = await getPrisma().product.findMany({ where: { status: "ACTIVE" }, orderBy: { id: "asc" }, take: 5001, select: { id: true, slug: true, name: true, brand: true, category: true, description: true, ean: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, status: true, activeIngredients: true, requiresPrescription: true, isPopularPharmacy: true, imageAsset: { select: { width: true, height: true, originalName: true } } } });
    if (rows.length > 5000) return Response.json({ error: "O catálogo excede o limite desta exportação. Solicite exportação paginada." }, { status: 422, headers: { "Cache-Control": "no-store" } });
    const result = buildMerchantFeed(rows.map(row => ({ ...row, price: row.price.toString(), promotionalPrice: row.promotionalPrice?.toString() ?? null })));
    if (!result.count) return Response.json({ error: "Nenhum produto atende aos requisitos desta exportação. Confira marca, EAN, descrição, categoria e foto real de pelo menos 500 × 500 px. Medicamentos e itens regulados exigem análise separada." }, { status: 422, headers: { "Cache-Control": "no-store" } });
    return new Response(result.xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": 'attachment; filename="wimifarma-google-revisao.xml"', "Cache-Control": "no-store", "X-Feed-Included": String(result.count), "X-Feed-Excluded": String(result.excluded) } });
  } catch { return Response.json({ error: "Não foi possível exportar o catálogo agora." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
