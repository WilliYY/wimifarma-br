import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { toSaleProduct } from "@/features/supplier-catalog/commerce";

const PAGE_SIZE = 100;

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
      deletedAt: null,
      ...(enabled ? { cashbackEnabled: true } : {}),
      ...(query ? { OR: ["name", "brand", "sku", "ean"].map((field) => ({ [field]: { contains: query, mode: "insensitive" as const } })) } : {}),
    };
    const [products, total, active, pending] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        select: { id: true, name: true, brand: true, imageUrl: true, status: true, price: true,
          promotionalPrice: true, cashbackEnabled: true, cashbackRateBps: true, updatedAt: true,
          isPopularPharmacy: true, requiresPrescription: true, inventorySource: true, stock: true,
          ean: true, eanNormalized: true, supplierMarkupBps: true, catalogClassification: true,
          supplierOffers: { select: { id: true, supplier: true, eanNormalized: true, unitCostCents: true,
            substitutionTaxCents: true, retailCeilingCents: true, available: true, stockQuantity: true,
            allocationQuantity: true, reservedQuantity: true, committedQuantity: true, observedAt: true, validUntil: true } } } }),
      prisma.product.count({ where }),
      prisma.product.count({ where: { deletedAt: null, cashbackEnabled: true, status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false } }),
      prisma.order.aggregate({ where: { cashbackState: "PENDING" }, _sum: { cashbackEarnedCents: true } }),
    ]);
    const now = Date.now();
    return NextResponse.json({ data: products.map((p) => {
      const sale = toSaleProduct(p, now);
      const priceAvailable = p.inventorySource !== "DISTRIBUTOR" || sale.availableForPurchase;
      // Explicit allowlist: supplier inputs remain private, including historical fallback prices.
      return { id: p.id, name: p.name, brand: p.brand, imageUrl: p.imageUrl, status: p.status,
        cashbackEnabled: p.cashbackEnabled, cashbackRateBps: p.cashbackRateBps,
        isPopularPharmacy: p.isPopularPharmacy, requiresPrescription: p.requiresPrescription,
        price: priceAvailable ? sale.price : null, promotionalPrice: priceAvailable ? sale.promotionalPrice : null,
        priceAvailable, updatedAt: p.updatedAt.toISOString() };
    }),
      total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), active, pendingCents: pending._sum.cashbackEarnedCents ?? 0,
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
