import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const guard = await requireAdminOnlyApi();
    if (guard.response) return guard.response;
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().slice(0, 120);
    const page = Math.min(10000, Math.max(1, Number(params.get("page")) || 1));
    if (!Number.isInteger(page)) return NextResponse.json({ error: "Pagina invalida." }, { status: 422 });
    const enabled = params.get("enabled") === "true";
    const prisma = getPrisma();
    const where = {
      ...(enabled ? { cashbackEnabled: true } : {}),
      ...(query ? { OR: ["name", "brand", "sku", "ean"].map((field) => ({ [field]: { contains: query, mode: "insensitive" as const } })) } : {}),
    };
    const [products, total, active, pending] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * 24, take: 24,
        select: { id: true, name: true, brand: true, imageUrl: true, status: true, price: true,
          promotionalPrice: true, cashbackEnabled: true, cashbackRateBps: true, updatedAt: true,
          isPopularPharmacy: true, requiresPrescription: true } }),
      prisma.product.count({ where }),
      prisma.product.count({ where: { cashbackEnabled: true, status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false } }),
      prisma.order.aggregate({ where: { cashbackState: "PENDING" }, _sum: { cashbackEarnedCents: true } }),
    ]);
    return NextResponse.json({ data: products.map((p) => ({ ...p, price: p.price.toString(),
      promotionalPrice: p.promotionalPrice?.toString() ?? null, updatedAt: p.updatedAt.toISOString() })),
      total, page, pages: Math.max(1, Math.ceil(total / 24)), active, pendingCents: pending._sum.cashbackEarnedCents ?? 0,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    console.error("[cashback.products.list] failed", { code });
    return NextResponse.json({ error: "Nao foi possivel carregar os produtos. Tente novamente." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST() {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  return NextResponse.json({ error: "Creditos sao gerados pelos pedidos. Lancamentos manuais indisponiveis." },
    { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
}
