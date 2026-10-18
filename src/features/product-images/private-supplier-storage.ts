import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ACCEPTED_PRODUCT_IMAGE_TYPES, MAX_PRODUCT_IMAGE_BYTES, MAX_PRODUCT_IMAGE_PIXELS, processProductImage, ProductImageError } from "./service";
import { PRIVATE_SUPPLIER_IMAGE_NAME, PRIVATE_SUPPLIER_IMAGE_PREFIX } from "./private-supplier-policy";

export const privateSupplierImagesDirectory = () => path.join(process.cwd(), "var", "private-supplier-images");
export const privateSupplierImageHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export const MAX_PRIVATE_SUPPLIER_IMAGE_BYTES = 100_000;

function missingFile(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "ENOENT" || error.code === "ELOOP");
}

/** Validate and compress without filesystem writes, including importer dry runs. */
export async function preparePrivateSupplierImage(input: { buffer: Buffer; fileName: string; mimeType: string }) {
  if (!input.buffer.length || input.buffer.length > MAX_PRODUCT_IMAGE_BYTES || !ACCEPTED_PRODUCT_IMAGE_TYPES.has(input.mimeType)) {
    throw new ProductImageError("Use JPG, PNG, WebP ou AVIF de até 10 MB.");
  }
  const metadata = await sharp(input.buffer, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS }).metadata()
    .catch(() => { throw new ProductImageError("O arquivo enviado não é uma imagem válida."); });
  if (!metadata.format || !["jpeg", "png", "webp", "heif"].includes(metadata.format)) throw new ProductImageError("Use JPG, PNG, WebP ou AVIF.");
  const source = await processProductImage({ ...input, removeBackground: false });
  let output = await sharp(source.buffer).resize({ width: 352, height: 352, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer({ resolveWithObject: true });
  if (output.info.size > MAX_PRIVATE_SUPPLIER_IMAGE_BYTES) {
    output = await sharp(source.buffer).resize({ width: 352, height: 352, fit: "inside", withoutEnlargement: true }).webp({ quality: 60, effort: 5 }).toBuffer({ resolveWithObject: true });
  }
  if (output.info.size > MAX_PRIVATE_SUPPLIER_IMAGE_BYTES) throw new ProductImageError("A foto continua muito pesada. Recorte o produto e tente novamente.");
  return { buffer: output.data, width: output.info.width, height: output.info.height, sizeBytes: output.info.size };
}

/** Trusted local callers and the authenticated upload route share this storage contract. */
export async function storePrivateSupplierImage(input: { buffer: Buffer; fileName: string; mimeType: string }, directory = privateSupplierImagesDirectory()) {
  const processed = await preparePrivateSupplierImage(input);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const fileName = `${randomUUID()}.webp`;
  await writeFile(path.join(directory, fileName), processed.buffer, { flag: "wx", mode: 0o600 });
  return { fileName, url: `${PRIVATE_SUPPLIER_IMAGE_PREFIX}${fileName}`, width: processed.width, height: processed.height, sizeBytes: processed.sizeBytes };
}

/** Authentication is mandatory in the route before calling this filesystem reader. */
export async function servePrivateSupplierImage(fileName: string, directory = privateSupplierImagesDirectory()) {
  const missing = () => new Response(null, { status: 404, headers: privateSupplierImageHeaders });
  if (!PRIVATE_SUPPLIER_IMAGE_NAME.test(fileName)) return missing();
  const filePath = path.join(directory, fileName);
  const initial = await lstat(filePath).catch(error => { if (missingFile(error)) return null; throw error; });
  if (!initial || initial.isSymbolicLink() || !initial.isFile()) return missing();
  const file = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    .catch(error => { if (missingFile(error)) return null; throw error; });
  if (!file) return missing();
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.dev !== initial.dev || stat.ino !== initial.ino || stat.size < 12 || stat.size > MAX_PRIVATE_SUPPLIER_IMAGE_BYTES) return missing();
    const bytes = await file.readFile();
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return missing();
    return new Response(new Uint8Array(bytes), { headers: { ...privateSupplierImageHeaders, "Content-Type": "image/webp", "Content-Length": String(bytes.length) } });
  } finally { await file.close(); }
}
