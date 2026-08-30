import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { id } = await context.params;
  const prisma = getPrisma();
  const image = await prisma.productImage.findUnique({
    where: { id },
    select: {
      _count: { select: { products: true } },
      id: true,
      url: true,
    },
  });

  if (!image) {
    return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
  }

  if (image._count.products > 0) {
    return NextResponse.json(
      { error: "Esta imagem esta em uso por um produto e nao pode ser excluida." },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.productImage.delete({ where: { id } });
    await transaction.auditLog.create({
      data: {
        action: "PRODUCT_IMAGE_DELETED",
        entity: "ProductImage",
        entityId: image.id,
        metadata: { url: image.url },
        userId: persistedUserId(guard.session?.user?.id),
      },
    });
  });

  if (image.url.startsWith("/uploads/products/")) {
    const fileName = path.basename(image.url);
    const filePath = path.join(process.cwd(), "public", "uploads", "products", fileName);
    await rm(filePath, { force: true }).catch(() => undefined);
  }

  return NextResponse.json({ data: { id } });
}
