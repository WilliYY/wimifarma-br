import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import {
  ACCEPTED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  processProductImage,
  ProductImageError,
} from "@/features/product-images/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PRODUCT_IMAGE_BYTES + 64_000) {
    return NextResponse.json(
      { error: "A imagem deve ter no maximo 10 MB." },
      { status: 413 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const image = formData?.get("image");
  const shouldRemoveBackground = formData?.get("removeBackground") === "true";

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "Envie uma imagem de produto." },
      { status: 422 },
    );
  }

  if (
    image.size > MAX_PRODUCT_IMAGE_BYTES ||
    !ACCEPTED_PRODUCT_IMAGE_TYPES.has(image.type)
  ) {
    return NextResponse.json(
      { error: "Use JPG, PNG, WebP ou AVIF de ate 10 MB." },
      { status: 422 },
    );
  }

  let outputPath: string | undefined;

  try {
    const processed = await processProductImage({
      buffer: Buffer.from(await image.arrayBuffer()),
      fileName: image.name,
      mimeType: image.type,
      removeBackground: shouldRemoveBackground,
    });
    const uploadsDirectory = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadsDirectory, { recursive: true });

    const fileName = `product-${randomUUID()}.webp`;
    const imageUrl = `/uploads/products/${fileName}`;
    outputPath = path.join(uploadsDirectory, fileName);
    await writeFile(outputPath, processed.buffer, { flag: "wx" });

    const prisma = getPrisma();
    const asset = await prisma.$transaction(async (transaction) => {
      const created = await transaction.productImage.create({
        data: {
          backgroundRemoved: shouldRemoveBackground,
          createdById: persistedUserId(guard.session?.user?.id),
          height: processed.height,
          originalName: image.name.slice(0, 240),
          sizeBytes: processed.sizeBytes,
          url: imageUrl,
          width: processed.width,
        },
        select: {
          backgroundRemoved: true,
          createdAt: true,
          height: true,
          id: true,
          originalName: true,
          sizeBytes: true,
          url: true,
          width: true,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "PRODUCT_IMAGE_UPLOADED",
          entity: "ProductImage",
          entityId: created.id,
          metadata: {
            backgroundRemoved: created.backgroundRemoved,
            height: created.height,
            originalName: created.originalName,
            sizeBytes: created.sizeBytes,
            width: created.width,
          },
          userId: persistedUserId(guard.session?.user?.id),
        },
      });

      return created;
    });

    return NextResponse.json(
      { data: { ...asset, createdAt: asset.createdAt.toISOString() } },
      { status: 201 },
    );
  } catch (error) {
    if (outputPath) await rm(outputPath, { force: true }).catch(() => undefined);

    if (error instanceof ProductImageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Nao foi possivel salvar a imagem. Tente novamente." },
      { status: 500 },
    );
  }
}
