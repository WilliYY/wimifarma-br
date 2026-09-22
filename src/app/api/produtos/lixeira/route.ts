import { requireAdminApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return Response.json({ error: "Página inválida." }, { status: 400, headers });
  try {
    const products = await getPrisma().product.findMany({ where: { deletedAt: { not: null }, purgeAt: { gt: new Date() } }, select: { id: true, name: true, imageUrl: true, deletedAt: true, purgeAt: true, updatedAt: true }, orderBy: [{ deletedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21 });
    return Response.json({ data: products.slice(0, 20), page, hasMore: products.length > 20 }, { headers });
  } catch { return Response.json({ error: "Não foi possível carregar a lixeira. Tente novamente." }, { status: 503, headers }); }
}
