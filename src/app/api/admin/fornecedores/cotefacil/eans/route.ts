import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPublicCatalogIdentities } from "@/features/catalog-identities/public-query";
import { collectCatalogEans } from "@/features/supplier-planning/cotefacil-eans";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  try {
    const [products, identities] = await Promise.all([
      getPrisma().product.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: { ean: true, eanNormalized: true },
        orderBy: { id: "asc" },
      }),
      getPublicCatalogIdentities(),
    ]);
    const data = collectCatalogEans([
      ...products,
      ...identities.map(({ ean, gtinCanonical }) => ({ ean, eanNormalized: gtinCanonical })),
    ]);

    return NextResponse.json({ data }, { headers });
  } catch {
    console.error("[cotefacil-eans] CATALOG_READ_FAILED");
    return NextResponse.json({ error: "Não foi possível carregar os EANs do catálogo." }, { status: 503, headers });
  }
}
