import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { productCreateSchema } from "@/features/products/schema";
import { buildProductSearchText } from "@/features/products/public-search";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { lockProductCatalog, ProductMutationError, resolveFeaturedPosition } from "@/features/products/mutations";

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

function serializeProduct(product: Awaited<ReturnType<typeof getProducts>>[number]) {
  return {
    ...product,
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
    select: productSelect,
    take: 100,
  });
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const products = await getProducts();

  return NextResponse.json({ data: products.map(serializeProduct) });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = productCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const slug = await uniqueSlug(parsed.data.slug ?? parsed.data.name);
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

  const { featured, ...fields } = parsed.data;
  try {
    const product = await prisma.$transaction(async transaction => {
      await lockProductCatalog(transaction);
      if (imageAsset && !await transaction.productImage.findUnique({ where: { id: imageAsset.id }, select: { id: true } })) {
        throw new ProductMutationError("A foto foi removida da biblioteca. Selecione outra foto.", 409);
      }
      const featuredPosition = await resolveFeaturedPosition(transaction, { featured, status: fields.status, imageUrl: imageAsset?.url ?? fields.imageUrl });
      const product = await transaction.product.create({
        data: {
          ...fields,
          featuredPosition,
          brand: normalizeOptional(parsed.data.brand),
          category: normalizeOptional(parsed.data.category),
          ean: normalizeOptional(parsed.data.ean),
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
            cashbackEnabled: product.cashbackEnabled,
            cashbackRateBps: product.cashbackRateBps,
            hasImage: Boolean(product.imageUrl),
            featuredPosition: product.featuredPosition,
            name: product.name,
            slug: product.slug,
            status: product.status,
          },
          userId: persistedUserId(guard.session?.user.id),
        },
      });
      return product;
    });

    return NextResponse.json({ data: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ja existe um produto com este SKU ou endereco. Confira o cadastro e tente novamente." }, { status: 409 });
    console.error("Falha ao cadastrar produto", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Nao foi possivel cadastrar o produto. Tente novamente." }, { status: 503 });
  }
}
