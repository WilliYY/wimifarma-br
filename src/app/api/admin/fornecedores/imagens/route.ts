import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { MAX_PRODUCT_IMAGE_BYTES, ProductImageError } from "@/features/product-images/service";
import { privateSupplierImageHeaders, privateSupplierImagesDirectory, storePrivateSupplierImage } from "@/features/product-images/private-supplier-storage";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return new Response(null, { status: guard.response.status, headers: privateSupplierImageHeaders });
  if (request.headers.get("origin") !== new URL(process.env.AUTH_URL || request.url).origin) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers: privateSupplierImageHeaders });
  }
  let saved: Awaited<ReturnType<typeof storePrivateSupplierImage>> | undefined;
  try {
    const bytes = await readLimitedBody(request, { maxBytes: MAX_PRODUCT_IMAGE_BYTES + 64_000, timeoutMs: 30_000 });
    const form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData()
      .catch(() => { throw new ProductImageError("Envie uma imagem válida."); });
    const image = form.get("image");
    if (!(image instanceof File) || !image.size) throw new ProductImageError("Envie uma imagem de produto.");
    if (image.size > MAX_PRODUCT_IMAGE_BYTES) throw new ProductImageError("Use JPG, PNG, WebP ou AVIF de até 10 MB.");
    saved = await storePrivateSupplierImage({ buffer: Buffer.from(await image.arrayBuffer()), fileName: image.name, mimeType: image.type });
    await getPrisma().auditLog.create({ data: { action: "PRIVATE_SUPPLIER_IMAGE_UPLOADED", entity: "Product", entityId: saved.fileName,
      userId: guard.session?.user.id, metadata: { width: saved.width, height: saved.height, sizeBytes: saved.sizeBytes } } });
    return NextResponse.json({ data: { ...saved, id: "", originalName: image.name.slice(0, 240), backgroundRemoved: false, createdAt: new Date().toISOString() } }, { status: 201, headers: privateSupplierImageHeaders });
  } catch (error) {
    if (saved) await rm(path.join(privateSupplierImagesDirectory(), saved.fileName), { force: true }).catch(() => undefined);
    const status = error instanceof ProductImageError || error instanceof RequestBodyError ? error.status : 500;
    return NextResponse.json({ error: error instanceof ProductImageError || error instanceof RequestBodyError ? error.message : "Não foi possível salvar a foto interna." }, { status, headers: privateSupplierImageHeaders });
  }
}
