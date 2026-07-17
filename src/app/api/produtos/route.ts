import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { productCreateSchema } from "@/features/products/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const productSelect = {
  brand: true,
  category: true,
  createdAt: true,
  ean: true,
  id: true,
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
  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      brand: normalizeOptional(parsed.data.brand),
      category: normalizeOptional(parsed.data.category),
      ean: normalizeOptional(parsed.data.ean),
      imageUrl: normalizeOptional(parsed.data.imageUrl),
      sku: normalizeOptional(parsed.data.sku),
      slug,
    },
    select: productSelect,
  });

  await prisma.auditLog.create({
    data: {
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      metadata: {
        hasImage: Boolean(product.imageUrl),
        name: product.name,
        slug: product.slug,
        status: product.status,
      },
      userId: persistedUserId(guard.session?.user.id),
    },
  });

  return NextResponse.json({ data: serializeProduct(product) }, { status: 201 });
}
