import { NextResponse } from "next/server";
import { gtinVariants, normalizeGtin } from "@/features/supplier-catalog/commerce";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminApi } from "@/features/auth/permissions";
import { productUpdateSchema } from "@/features/products/schema";
import { prescriptionClassificationIsConsistent, resolvePrescriptionType } from "@/features/products/purchase-policy";
import { buildProductSearchText } from "@/features/products/public-search";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { lockProductCatalog, ProductMutationError, resolveProductGallery, resolveFeaturedPosition } from "@/features/products/mutations";
import { productTrashMutationSchema } from "@/features/products/trash-policy";
import { moveProductToTrash } from "@/features/products/trash-service";
import { isValidGtin, productIdentityKey } from "@/features/products/identity";
import { invalidateShippingProfile } from "@/features/shipping/product-draft";
import { privateSupplierImageAllowed } from "@/features/product-images/private-supplier-policy";
import { classificationIsConsistent, emptyClassification, readClassification } from "@/features/products/catalog-operations";
import { validateSupplierMarkupChange } from "@/features/products/catalog-operations-service";
import { validatePhotoPublication } from "@/features/products/photo-publication-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const productSelect = {
  catalogClassification: true,
  supplierMarkupBps: true,
  inventorySource: true,
  wimicoinsEnabled: true,
  wimicoinsRateBps: true,
  shippingProfile: true,
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
  imageUrls: true,
  isPopularPharmacy: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  prescriptionType: true,
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

function serializeProduct(product: ProductRecord, admin = false) {
  const { supplierMarkupBps, ...safe } = product;
  return {
    ...safe,
    ...(admin ? { supplierMarkupBps } : {}),
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
  if ((parsed.data.catalogClassification !== undefined || parsed.data.supplierMarkupBps !== undefined) && guard.session?.user.role !== "ADMIN") return NextResponse.json({ error: "Somente ADMIN pode configurar classificação e acréscimo." }, { status: 403 });

  if (parsed.data.shippingProfile !== undefined && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar a embalagem de frete." }, { status: 403 });
  }
  if (parsed.data.prescriptionType !== undefined && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode classificar o tipo de receita." }, { status: 403 });
  }
  const prisma = getPrisma();
  if ((parsed.data.cashbackEnabled !== undefined || parsed.data.cashbackRateBps !== undefined) && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar cashback." }, { status: 403 });
  }
  if ((parsed.data.wimicoinsEnabled !== undefined || parsed.data.wimicoinsRateBps !== undefined) && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar WimiCoins." }, { status: 403 });
  }
  if (parsed.data.wimicoinsEnabled && (parsed.data.requiresPrescription || parsed.data.isPopularPharmacy)) {
    return NextResponse.json({ error: "WimiCoins não disponíveis para produtos com receita ou Farmácia Popular." }, { status: 422 });
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
    supplierMarkupBps: parsed.data.supplierMarkupBps,
    inventorySource: parsed.data.inventorySource,
    wimicoinsEnabled: parsed.data.requiresPrescription || parsed.data.isPopularPharmacy ? false : parsed.data.wimicoinsEnabled,
    wimicoinsRateBps: parsed.data.wimicoinsRateBps,
    shippingProfile: parsed.data.shippingProfile,
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
    prescriptionType: parsed.data.prescriptionType,
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
      await transaction.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
      if (imageAsset && !await transaction.productImage.findUnique({ where: { id: imageAsset.id }, select: { id: true } })) throw new ProductMutationError("A foto foi removida da biblioteca. Selecione outra foto.", 409);
      const current = await transaction.product.findUnique({ where: { id, deletedAt: null }, include: { supplierOffers: true } });
      if (!current) return null;
      const incomingEan = parsed.data.ean?.trim() || null;
      const currentEan = current.ean?.trim() || null;
      const eanWasProvided = parsed.data.ean !== undefined;
      const effectiveEan = eanWasProvided ? incomingEan : currentEan;
      const canonicalEan = normalizeGtin(effectiveEan);
      if (eanWasProvided && incomingEan !== currentEan && incomingEan && !isValidGtin(incomingEan)) throw new ProductMutationError("EAN/GTIN inválido. Confira os números da embalagem.", 422);
      productData.ean = effectiveEan ?? undefined;
      if ((parsed.data.inventorySource ?? current.inventorySource) === "DISTRIBUTOR" && (!canonicalEan || !isValidGtin(effectiveEan ?? ""))) throw new ProductMutationError("Produtos de distribuidor exigem EAN válido.", 422);
      if (parsed.data.inventorySource !== undefined && guard.session?.user.role !== "ADMIN") throw new ProductMutationError("Somente ADMIN pode alterar a origem do estoque.", 403);
      if (parsed.data.inventorySource && parsed.data.inventorySource !== current.inventorySource && await transaction.orderItem.findFirst({ where: { productId: id, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } }, select: { id: true } })) throw new ProductMutationError("Conclua ou cancele os pedidos deste produto antes de mudar a origem do estoque.", 409);
      if (canonicalEan && await transaction.product.findFirst({ where: { id: { not: id }, OR: [{ eanNormalized: canonicalEan }, { ean: { in: gtinVariants(effectiveEan) } }] }, select: { id: true } })) throw new ProductMutationError("Este EAN já pertence a outro cadastro. Revise os produtos antes de alterar.", 409);
      const identityChanged = productIdentityKey({ name: current.name, brand: current.brand ?? "", ean: current.ean ?? "" }) !== productIdentityKey({ name: productData.name, brand: productData.brand ?? "", ean: productData.ean ?? "" });
      if (current.inventorySource === "DISTRIBUTOR" && identityChanged && await transaction.orderItem.findFirst({ where: { productId: id, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } }, select: { id: true } })) throw new ProductMutationError("Há pedidos em aberto. Preserve EAN, apresentação e fabricante até concluir ou cancelar esses pedidos.", 409);
      const prescriptionType = resolvePrescriptionType(current.prescriptionType, parsed.data.prescriptionType, identityChanged);
      const catalogClassification = identityChanged ? emptyClassification : readClassification(parsed.data.catalogClassification ?? current.catalogClassification);
      if (!classificationIsConsistent(catalogClassification, { ...productData, prescriptionType })) throw new ProductMutationError("Classificação incompatível com o cadastro de receita. Revise a classificação antes de salvar.");
      await validateSupplierMarkupChange(transaction, current, parsed.data.supplierMarkupBps);
      if (current.requiresPrescription && !productData.requiresPrescription && guard.session?.user.role !== "ADMIN") throw new ProductMutationError("Somente o administrador pode retirar a exigência de receita.", 403);
      if (!prescriptionClassificationIsConsistent({ requiresPrescription: productData.requiresPrescription, prescriptionType })) throw new ProductMutationError("Atualize o tipo de receita antes de retirar a exigência de receita.", 422);
      const shippingProfile = productData.shippingProfile ?? (identityChanged ? invalidateShippingProfile(current.shippingProfile) : undefined);
      const imageUrl = imageAsset?.url ?? (clearImage ? null : normalizedImageUrl ?? current.imageUrl);
      if (!privateSupplierImageAllowed(imageUrl, parsed.data.inventorySource ?? current.inventorySource, productData.requiresPrescription)) {
        throw new ProductMutationError("Fotos internas exigem produto de distribuidor com receita. Selecione uma foto pública para outra origem.", 422);
      }
      const imageUrls = await resolveProductGallery(transaction, imageUrl, parsed.data.imageUrls ?? current.imageUrls);
      const nextImageAssetId = imageAsset ? imageAsset.id : clearImage || normalizedImageUrl ? null : current.imageAssetId;
      const galleryChanged = JSON.stringify(current.imageUrls) !== JSON.stringify(imageUrls);
      const explicitlyReviewed = guard.session?.user.role === "ADMIN" &&
        (parsed.data.photoReviewConfirmed === true || Boolean(imageAsset && imageAsset.id !== current.imageAssetId) || galleryChanged);
      if (parsed.data.photoReviewConfirmed && guard.session?.user.role !== "ADMIN") throw new ProductMutationError("Somente ADMIN pode confirmar a revisão das fotos.", 403);
      const photoReview = await validatePhotoPublication(transaction, current, { ...current, ...productData, catalogClassification, prescriptionType, imageUrl, imageUrls,
        inventorySource: productData.inventorySource ?? current.inventorySource,
        imageAssetId: nextImageAssetId }, explicitlyReviewed);
      const featuredPosition = await resolveFeaturedPosition(transaction, { featured: parsed.data.featured, currentPosition: current.featuredPosition, status: productData.status, imageUrl });
      const updated = await transaction.product.updateMany({
        data: {
          ...productData,
          catalogClassification,
          prescriptionType,
          shippingProfile,
          brand: normalizeOptional(productData.brand) ?? null,
          category: normalizeOptional(productData.category) ?? null,
          description: normalizeOptional(productData.description) ?? null,
          ean: normalizeOptional(productData.ean) ?? null,
          eanNormalized: canonicalEan,
          featuredPosition,
          imageAssetId: imageAsset
            ? imageAsset.id
            : clearImage || normalizedImageUrl
              ? null
              : undefined,
          imageUrl,
          imageUrls,
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
            shippingDraftUpdated: shippingProfile !== undefined,
            cashbackEnabled: savedProduct.cashbackEnabled,
            cashbackRateBps: savedProduct.cashbackRateBps,
            wimicoinsEnabled: savedProduct.wimicoinsEnabled,
            wimicoinsRateBps: savedProduct.wimicoinsRateBps,
            hasImage: Boolean(savedProduct.imageUrl),
            imageAssetId: savedProduct.imageAssetId,
            ...(photoReview ? { photoReview } : {}),
            featuredPosition: savedProduct.featuredPosition,
            name: savedProduct.name,
            classificationBefore: current.catalogClassification,
            classificationAfter: savedProduct.catalogClassification,
            supplierMarkupBefore: current.supplierMarkupBps,
            supplierMarkupAfter: savedProduct.supplierMarkupBps,
            prescriptionBefore: { requiresPrescription: current.requiresPrescription, type: current.prescriptionType },
            prescriptionAfter: { requiresPrescription: savedProduct.requiresPrescription, type: savedProduct.prescriptionType },
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

    return NextResponse.json({ data: serializeProduct(product, guard.session?.user.role === "ADMIN") });
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
