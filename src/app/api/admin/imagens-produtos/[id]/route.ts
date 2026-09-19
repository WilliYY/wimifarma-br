import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { lockProductCatalog, ProductMutationError } from "@/features/products/mutations";

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
  try {
    const image = await prisma.$transaction(async (transaction) => {
      await lockProductCatalog(transaction);
      const image = await transaction.productImage.findUnique({
        where: { id },
        select: {
          _count: { select: { products: true } },
          id: true,
          url: true,
        },
      });

      if (!image) throw new ProductMutationError("Imagem nao encontrada.", 404);
      if (image._count.products > 0 || await transaction.product.count({ where: { imageUrl: image.url } })) {
        throw new ProductMutationError("Esta imagem esta em uso. Retire ou substitua a foto do produto antes de excluir da biblioteca.", 409);
      }

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
      return image;
    });

    if (image.url.startsWith("/uploads/products/")) {
      const fileName = path.basename(image.url);
      const filePath = path.join(process.cwd(), "public", "uploads", "products", fileName);
      await rm(filePath, { force: true }).catch(() => undefined);
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    if (error instanceof ProductMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Nao foi possivel excluir a foto. Atualize a biblioteca e tente novamente." }, { status: 503 });
  }
}
