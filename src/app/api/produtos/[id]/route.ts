import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminApi } from "@/features/auth/permissions";
import { productUpdateSchema } from "@/features/products/schema";
import { buildProductSearchText } from "@/features/products/public-search";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { lockProductCatalog, ProductMutationError, resolveFeaturedPosition } from "@/features/products/mutations";
import { productTrashMutationSchema } from "@/features/products/trash-policy";
import { moveProductToTrash } from "@/features/products/trash-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const productSelect = {
  cashbackEnabled: true,
  cashbackRateBps: true,
  activeIngredients: true,
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
  searchTerms: true,
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
  if ((parsed.data.cashbackEnabled !== undefined || parsed.data.cashbackRateBps !== undefined) && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar cashback." }, { status: 403 });
  }
  if (parsed.data.cashbackEnabled && (parsed.data.requiresPrescription || parsed.data.isPopularPharmacy)) {
    return NextResponse.json({ error: "Cashback nao disponivel para produtos com receita ou Farmacia Popular." }, { status: 422 });
  }
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
    cashbackEnabled: parsed.data.requiresPrescription || parsed.data.isPopularPharmacy ? false : parsed.data.cashbackEnabled,
    cashbackRateBps: parsed.data.cashbackRateBps,
    activeIngredients: parsed.data.activeIngredients,
    brand: parsed.data.brand,
    category: parsed.data.category,
    description: parsed.data.description,
    ean: parsed.data.ean,
    isPopularPharmacy: parsed.data.isPopularPharmacy,
    name: parsed.data.name,
    price: parsed.data.price,
    promotionalPrice: parsed.data.promotionalPrice,
    requiresPrescription: parsed.data.requiresPrescription,
    searchTerms: parsed.data.searchTerms,
    sku: parsed.data.sku,
    status: parsed.data.status,
    stock: parsed.data.stock,
  };
  const normalizedImageUrl = normalizeOptional(parsed.data.imageUrl);
  const clearImage = parsed.data.imageAssetId === null || parsed.data.imageUrl === null;

  try {
    const product = await prisma.$transaction(async (transaction) => {
      await lockProductCatalog(transaction);
      if (imageAsset && !await transaction.productImage.findUnique({ where: { id: imageAsset.id }, select: { id: true } })) throw new ProductMutationError("A foto foi removida da biblioteca. Selecione outra foto.", 409);
      const current = await transaction.product.findUnique({ where: { id, deletedAt: null }, select: { imageUrl: true, featuredPosition: true } });
      if (!current) return null;
      const imageUrl = imageAsset?.url ?? (clearImage ? null : normalizedImageUrl ?? current.imageUrl);
      const featuredPosition = await resolveFeaturedPosition(transaction, { featured: parsed.data.featured, currentPosition: current.featuredPosition, status: productData.status, imageUrl });
      const updated = await transaction.product.updateMany({
        data: {
          ...productData,
          brand: normalizeOptional(productData.brand) ?? null,
          category: normalizeOptional(productData.category) ?? null,
          description: normalizeOptional(productData.description) ?? null,
          ean: normalizeOptional(productData.ean) ?? null,
          featuredPosition,
          imageAssetId: imageAsset
            ? imageAsset.id
            : clearImage || normalizedImageUrl
              ? null
              : undefined,
          imageUrl,
          promotionalPrice: productData.promotionalPrice ?? null,
          searchText: buildProductSearchText(productData),
          sku: normalizeOptional(productData.sku) ?? null,
        },
        where: {
          id,
          deletedAt: null,
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
            cashbackEnabled: savedProduct.cashbackEnabled,
            cashbackRateBps: savedProduct.cashbackRateBps,
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
    if (error instanceof ProductMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ja existe outro produto com este SKU." },
        { status: 409 },
      );
    }
    console.error("Falha ao editar produto", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Nao foi possivel salvar o produto. Reabra a edicao e tente novamente." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  if (!guard.session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = productTrashMutationSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Atualize o catálogo antes de excluir o produto." }, { status: 422 });
  const { id } = await params;
  const userId = guard.session.user.id;
  try {
    const data = await getPrisma().$transaction(tx => moveProductToTrash(tx, id, new Date(parsed.data.expectedUpdatedAt), userId), { timeout: 10000 });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ProductMutationError ? error.message : "Não foi possível excluir o produto." }, { status: error instanceof ProductMutationError ? error.status : 503 });
  }
}
