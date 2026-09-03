import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminApi } from "@/features/auth/permissions";
import { productUpdateSchema } from "@/features/products/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const productSelect = {
  brand: true,
  category: true,
  createdAt: true,
  description: true,
  ean: true,
  featuredPosition: true,
  id: true,
  imageAssetId: true,
  imageUrl: true,
  isPopularPharmacy: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  sku: true,
  slug: true,
  status: true,
  stock: true,
  updatedAt: true,
} as const;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function serializeProduct(product: ProductRecord) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
    updatedAt: product.updatedAt.toISOString(),
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = productUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const imageAssetId = normalizeOptional(parsed.data.imageAssetId);
  const imageAsset = imageAssetId
    ? await prisma.productImage.findUnique({
        select: { id: true, url: true },
        where: { id: imageAssetId },
      })
    : null;

  if (imageAssetId && !imageAsset) {
    return NextResponse.json(
      { error: "A imagem selecionada nao existe mais na biblioteca." },
      { status: 422 },
    );
  }

  const { expectedUpdatedAt } = parsed.data;
  const productData = {
    brand: parsed.data.brand,
    category: parsed.data.category,
    description: parsed.data.description,
    ean: parsed.data.ean,
    isPopularPharmacy: parsed.data.isPopularPharmacy,
    name: parsed.data.name,
    price: parsed.data.price,
    promotionalPrice: parsed.data.promotionalPrice,
    requiresPrescription: parsed.data.requiresPrescription,
    sku: parsed.data.sku,
    status: parsed.data.status,
    stock: parsed.data.stock,
  };
  const normalizedImageUrl = normalizeOptional(parsed.data.imageUrl);

  try {
    const product = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.product.updateMany({
        data: {
          ...productData,
          brand: normalizeOptional(productData.brand) ?? null,
          category: normalizeOptional(productData.category) ?? null,
          description: normalizeOptional(productData.description) ?? null,
          ean: normalizeOptional(productData.ean) ?? null,
          featuredPosition: productData.status === "ACTIVE" ? undefined : null,
          imageAssetId: imageAsset
            ? imageAsset.id
            : normalizedImageUrl
              ? null
              : undefined,
          imageUrl: imageAsset?.url ?? normalizedImageUrl,
          promotionalPrice: productData.promotionalPrice ?? null,
          sku: normalizeOptional(productData.sku) ?? null,
        },
        where: {
          id,
          updatedAt: new Date(expectedUpdatedAt),
        },
      });

      if (updated.count === 0) return null;

      const savedProduct = await transaction.product.findUniqueOrThrow({
        select: productSelect,
        where: { id },
      });

      await transaction.auditLog.create({
        data: {
          action: "PRODUCT_UPDATED",
          entity: "Product",
          entityId: savedProduct.id,
          metadata: {
            hasImage: Boolean(savedProduct.imageUrl),
            featuredPosition: savedProduct.featuredPosition,
            name: savedProduct.name,
            status: savedProduct.status,
          },
          userId: persistedUserId(guard.session?.user.id),
        },
      });

      return savedProduct;
    });

    if (!product) {
      const exists = await prisma.product.findUnique({
        select: { id: true },
        where: { id },
      });

      return NextResponse.json(
        {
          error: exists
            ? "Este produto foi alterado por outra pessoa. Reabra a edicao e tente novamente."
            : "Produto nao encontrado.",
        },
        { status: exists ? 409 : 404 },
      );
    }

    return NextResponse.json({ data: serializeProduct(product) });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ja existe outro produto com este SKU." },
        { status: 409 },
      );
    }
    throw error;
  }
}
