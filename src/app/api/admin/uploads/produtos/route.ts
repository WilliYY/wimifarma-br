import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdminApi } from "@/features/auth/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_DIMENSION = 1600;

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_IMAGE_BYTES + 64_000) {
    return NextResponse.json(
      { error: "A imagem deve ter no maximo 10 MB." },
      { status: 413 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const image = formData?.get("image");

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "Envie uma imagem de produto." },
      { status: 422 },
    );
  }

  if (image.size > MAX_IMAGE_BYTES || !image.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Use uma imagem valida de ate 10 MB." },
      { status: 422 },
    );
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image dimensions");
    }

    const uploadsDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "products",
    );
    await mkdir(uploadsDirectory, { recursive: true });

    const fileName = `product-${randomUUID()}.webp`;
    await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        fit: "inside",
        height: MAX_OUTPUT_DIMENSION,
        width: MAX_OUTPUT_DIMENSION,
        withoutEnlargement: true,
      })
      .webp({ effort: 4, quality: 86, smartSubsample: true })
      .toFile(path.join(uploadsDirectory, fileName));

    return NextResponse.json(
      { data: { imageUrl: `/uploads/products/${fileName}` } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel processar essa imagem." },
      { status: 422 },
    );
  }
}
