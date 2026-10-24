import { NextResponse } from "next/server";
import { cashbackProductIsEligible, medicineCashbackDefaults } from "@/features/cashback/rules";
import { requireAdminApi } from "@/features/auth/permissions";
import { productCreateSchema } from "@/features/products/schema";
import { buildProductSearchText } from "@/features/products/public-search";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { lockProductCatalog, ProductMutationError, resolveProductGallery, resolveFeaturedPosition } from "@/features/products/mutations";
import { gtinVariants, normalizeGtin, resolveSupplierOffer } from "@/features/supplier-catalog/commerce";
import { classificationIsConsistent } from "@/features/products/catalog-operations";
import { privateSupplierImageAllowed } from "@/features/product-images/private-supplier-policy";
import { validatePhotoPublication } from "@/features/products/photo-publication-policy";
import { isValidGtin } from "@/features/products/identity";

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
  imageAsset: { select: { width: true, height: true, originalName: true } },
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

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function slugify(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized.slice(0, 110) || "produto";
}

async function uniqueSlug(baseSlug: string) {
  const prisma = getPrisma();
  const base = slugify(baseSlug);
  let candidate = base;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${base.slice(0, 110)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function serializeProduct(product: Omit<Awaited<ReturnType<typeof getProducts>>[number], "supplierOffers">, admin = false) {
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

async function getProducts() {
  const prisma = getPrisma();

  return prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { ...productSelect, supplierOffers: true },
  });
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const admin = guard.session?.user.role === "ADMIN";
  const products = await getProducts();

  return NextResponse.json({ data: products.map(product => {
    const { supplierOffers: _offers, ...safe } = product;
    void _offers;
    const best = product.inventorySource === "DISTRIBUTOR" ? resolveSupplierOffer({ ...product, supplierDemandAllowed: true }) : null;
    return { ...serializeProduct(safe, admin), ...(best ? { price: (best.unitPriceCents / 100).toFixed(2) } : {}), supplierPricing: best ? { supplier: best.supplier, ...(admin ? { unitCostCents: best.unitCostCents } : {}), unitPriceCents: best.unitPriceCents, purchaseLimit: best.purchaseLimit, demandAllowed: true, validUntil: new Date(best.validUntil).toISOString() } : null };
  }) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = productCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  if ((parsed.data.catalogClassification !== undefined || parsed.data.supplierMarkupBps !== undefined) && guard.session?.user.role !== "ADMIN") return NextResponse.json({ error: "Somente ADMIN pode configurar classificação e acréscimo." }, { status: 403 });
  if (parsed.data.catalogClassification && !classificationIsConsistent(parsed.data.catalogClassification, parsed.data)) return NextResponse.json({ error: "Classificação incompatível com o cadastro de receita." }, { status: 422 });

  if (parsed.data.shippingProfile !== undefined && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar a embalagem de frete." }, { status: 403 });
  }
  if (parsed.data.inventorySource === "DISTRIBUTOR" && guard.session?.user.role !== "ADMIN") return NextResponse.json({ error: "Somente ADMIN pode cadastrar estoque de distribuidor." }, { status: 403 });
  if (parsed.data.ean?.trim() && !isValidGtin(parsed.data.ean.trim())) return NextResponse.json({ error: "EAN/GTIN inválido. Confira os números da embalagem." }, { status: 422 });
  if (parsed.data.inventorySource === "DISTRIBUTOR" && !normalizeGtin(parsed.data.ean)) return NextResponse.json({ error: "Produtos de distribuidor exigem EAN válido." }, { status: 422 });
  if (parsed.data.prescriptionType !== undefined && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode classificar o tipo de receita." }, { status: 403 });
  }
  const prisma = getPrisma();
  const slug = await uniqueSlug(parsed.data.slug ?? parsed.data.name);
  if ((parsed.data.cashbackEnabled !== undefined || parsed.data.cashbackRateBps !== undefined) && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar cashback." }, { status: 403 });
  }
  if ((parsed.data.wimicoinsEnabled !== undefined || parsed.data.wimicoinsRateBps !== undefined) && guard.session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente o administrador pode configurar WimiCoins." }, { status: 403 });
  }
  if (parsed.data.wimicoinsEnabled && (parsed.data.requiresPrescription || parsed.data.isPopularPharmacy)) {
    return NextResponse.json({ error: "WimiCoins não disponíveis para produtos com receita ou Farmácia Popular." }, { status: 422 });
  }
  if (parsed.data.cashbackEnabled && !cashbackProductIsEligible(parsed.data)) {
    return NextResponse.json({ error: "Este produto não é elegível ao cashback." }, { status: 422 });
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

  const { featured, ...fields } = parsed.data;
  if (!privateSupplierImageAllowed(imageAsset?.url ?? fields.imageUrl, fields.inventorySource, fields.requiresPrescription)) {
    return NextResponse.json({ error: "Fotos internas exigem produto de distribuidor com receita. Selecione uma foto pública para outra origem." }, { status: 422 });
  }
  try {
    const product = await prisma.$transaction(async transaction => {
      await lockProductCatalog(transaction);
      const canonicalEan = normalizeGtin(parsed.data.ean);
      if (canonicalEan && await transaction.product.findFirst({ where: { OR: [{ eanNormalized: canonicalEan }, { ean: { in: gtinVariants(parsed.data.ean) } }] }, select: { id: true } })) throw new ProductMutationError("Este EAN já está cadastrado. Edite o produto existente para manter uma única apresentação.", 409);
      if (imageAsset && !await transaction.productImage.findUnique({ where: { id: imageAsset.id }, select: { id: true } })) {
        throw new ProductMutationError("A foto foi removida da biblioteca. Selecione outra foto.", 409);
      }
      const imageUrls = await resolveProductGallery(transaction, imageAsset?.url ?? fields.imageUrl, fields.imageUrls ?? []);
      const photoReview = await validatePhotoPublication(transaction, null, { ...fields, imageUrls, imageAssetId: imageAsset?.id,
        imageUrl: imageAsset?.url ?? fields.imageUrl }, guard.session?.user.role === "ADMIN" && Boolean(imageAsset));
      const featuredPosition = await resolveFeaturedPosition(transaction, { featured, status: fields.status, imageUrl: imageAsset?.url ?? fields.imageUrl });
      const product = await transaction.product.create({
        data: {
          ...medicineCashbackDefaults(fields),
          ...fields,
          featuredPosition,
          imageUrls,
          brand: normalizeOptional(parsed.data.brand),
          category: normalizeOptional(parsed.data.category),
          ean: normalizeOptional(parsed.data.ean),
          eanNormalized: canonicalEan,
          imageAssetId: imageAsset?.id,
          imageUrl: imageAsset?.url ?? normalizeOptional(parsed.data.imageUrl),
          searchText: buildProductSearchText(parsed.data),
          sku: normalizeOptional(parsed.data.sku),
          slug,
        },
        select: productSelect,
      });

      await transaction.auditLog.create({
        data: {
          action: "PRODUCT_CREATED",
          entity: "Product",
          entityId: product.id,
          metadata: {
            shippingDraftUpdated: parsed.data.shippingProfile !== undefined,
            cashbackEnabled: product.cashbackEnabled,
            cashbackRateBps: product.cashbackRateBps,
            wimicoinsEnabled: product.wimicoinsEnabled,
            wimicoinsRateBps: product.wimicoinsRateBps,
            hasImage: Boolean(product.imageUrl),
            imageAssetId: product.imageAssetId,
            ...(photoReview ? { photoReview } : {}),
            featuredPosition: product.featuredPosition,
            name: product.name,
            catalogClassification: product.catalogClassification,
            supplierMarkupBps: product.supplierMarkupBps,
            prescriptionAfter: { requiresPrescription: product.requiresPrescription, type: product.prescriptionType },
            slug: product.slug,
            status: product.status,
          },
          userId: persistedUserId(guard.session?.user.id),
        },
      });
      return product;
    });

    return NextResponse.json({ data: serializeProduct(product, guard.session?.user.role === "ADMIN") }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ja existe um produto com este SKU ou endereco. Confira o cadastro e tente novamente." }, { status: 409 });
    console.error("Falha ao cadastrar produto", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Nao foi possivel cadastrar o produto. Tente novamente." }, { status: 503 });
  }
}
