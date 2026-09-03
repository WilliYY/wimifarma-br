import { NextResponse } from "next/server";
import { adminRoutePermissions, requireApiRole } from "@/features/auth/permissions";
import { showcaseSelectionSchema } from "@/features/offers/showcase";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const showcaseProductSelect = {
  brand: true,
  category: true,
  featuredPosition: true,
  id: true,
  imageUrl: true,
  name: true,
  price: true,
  promotionalPrice: true,
} as const;

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

function serializeProduct(product: {
  brand: string | null;
  category: string | null;
  featuredPosition: number | null;
  id: string;
  imageUrl: string | null;
  name: string;
  price: { toString(): string };
  promotionalPrice: { toString(): string } | null;
}) {
  return {
    ...product,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
  };
}

export async function GET() {
  const guard = await requireApiRole(adminRoutePermissions["/admin/ofertas"]);
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: showcaseProductSelect,
    where: {
      imageUrl: { not: null },
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ data: products.map(serializeProduct) });
}

export async function PUT(request: Request) {
  const guard = await requireApiRole(adminRoutePermissions["/admin/ofertas"]);
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = showcaseSelectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const selectedIds = parsed.data.productIds.filter(
    (productId): productId is string => Boolean(productId),
  );
  const selectedProducts = selectedIds.length
    ? await prisma.product.findMany({
        select: { id: true, imageUrl: true, name: true, status: true },
        where: { id: { in: selectedIds } },
      })
    : [];

  if (selectedProducts.length !== selectedIds.length) {
    return NextResponse.json(
      { error: "Um dos produtos selecionados nao existe mais." },
      { status: 422 },
    );
  }

  const unavailableProduct = selectedProducts.find(
    (product) => product.status !== "ACTIVE" || !product.imageUrl,
  );

  if (unavailableProduct) {
    return NextResponse.json(
      {
        error: `${unavailableProduct.name} precisa estar publicado e ter foto para entrar na vitrine.`,
      },
      { status: 422 },
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.product.updateMany({
      data: { featuredPosition: null },
      where: { featuredPosition: { not: null } },
    });

    for (const [index, productId] of parsed.data.productIds.entries()) {
      if (!productId) continue;

      const updated = await transaction.product.updateMany({
        data: { featuredPosition: index + 1 },
        where: {
          id: productId,
          imageUrl: { not: null },
          status: "ACTIVE",
        },
      });

      if (updated.count !== 1) {
        throw new Error("A selecao da vitrine mudou durante o salvamento.");
      }
    }

    await transaction.auditLog.create({
      data: {
        action: "PRODUCT_SHOWCASE_UPDATED",
        entity: "ProductShowcase",
        entityId: "home-best-offers",
        metadata: { productIds: parsed.data.productIds },
        userId: persistedUserId(guard.session?.user.id),
      },
    });
  });

  return NextResponse.json({ data: { productIds: parsed.data.productIds } });
}
