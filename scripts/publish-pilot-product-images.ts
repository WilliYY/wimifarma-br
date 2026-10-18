import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import type { PrismaClient, Product } from "../src/generated/prisma/client";
import { lockProductCatalog } from "../src/features/products/mutations";
import { isPrivateSupplierImageUrl } from "../src/features/product-images/private-supplier-policy";
import { productUploadsDirectory } from "../src/features/product-images/storage";
import { MAX_PRODUCT_IMAGE_BYTES, MAX_PRODUCT_IMAGE_PIXELS } from "../src/features/product-images/service";

// Exact presentations reviewed by the owner. This is not a category-wide permission.
const identities: Record<string, { name: string; brand: string }> = {};
for (const [ean, brand] of [
  ["7896181915638", "Biosintética"], ["7896004708539", "Germed"], ["7896422507738", "Medley"],
  ["7896004778204", "Nova Química"], ["7896004706795", "EMS"], ["7899095236639", "Geolab"], ["7897595627360", "Sandoz"],
]) identities[ean] = { name: `Losartana Potássica 50 mg 30 Comprimidos Revestidos ${brand}`, brand };
for (const [ean, brand, count] of [["7896112486787", "Aradois", "30"], ["7896112486886", "Aradois", "60"], ["7896181920410", "Corus", "30"]]) {
  identities[ean] = { name: `${brand} Losartana Potássica 50 mg ${count} Comprimidos Revestidos`, brand };
}

export const pilotImageManifestSchema = z.object({ images: z.array(z.object({
  ean: z.string().refine(ean => Object.hasOwn(identities, ean), "EAN outside the reviewed pilot."),
  filePath: z.string().min(1).max(2000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sourceUrl: z.url().max(2000).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  }, "A credential-free HTTPS source is required."),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()).min(1).max(10).refine(rows => new Set(rows.map(row => row.ean)).size === rows.length, "Duplicate EAN.") }).strict();

function validateIdentity(product: Product | null, ean: string): asserts product is Product {
  const expected = identities[ean];
  if (!expected || !product || product.ean !== ean || product.name !== expected.name || product.brand !== expected.brand ||
    product.deletedAt || product.status !== "ACTIVE" || product.inventorySource !== "DISTRIBUTOR" ||
    !product.requiresPrescription || product.prescriptionType !== "ORDINARY" || product.isPopularPharmacy) {
    throw new Error(`Pilot identity or classification changed for ${ean}; manual review required.`);
  }
}

export async function preparePilotImage(row: z.infer<typeof pilotImageManifestSchema>["images"][number]) {
  const initial = await lstat(row.filePath);
  if (!initial.isFile() || initial.isSymbolicLink() || initial.size < 12 || initial.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("Invalid local image file.");
  const file = await open(row.filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let bytes: Buffer;
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.dev !== initial.dev || stat.ino !== initial.ino || stat.size !== initial.size) throw new Error("Image file changed during validation.");
    bytes = await file.readFile();
  } finally { await file.close(); }
  if (bytes.length !== initial.size || createHash("sha256").update(bytes).digest("hex") !== row.sha256) throw new Error("Source image SHA-256 mismatch.");
  const metadata = await sharp(bytes, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS }).metadata();
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/avif": "heif" };
  if (metadata.format !== formats[row.mimeType] || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new Error("Invalid static image or MIME mismatch.");
  // Re-encode without generated content, cropping, enlargement, background removal or source metadata.
  for (const quality of [88, 78, 68, 58]) {
    const result = await sharp(bytes, { limitInputPixels: MAX_PRODUCT_IMAGE_PIXELS }).rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
    if (result.info.size <= 100_000) return { buffer: result.data, width: result.info.width, height: result.info.height, sizeBytes: result.info.size };
  }
  throw new Error("Image exceeds 100 KB after safe compression.");
}

export async function publishPilotProductImages(db: Pick<PrismaClient, "$transaction">, input: unknown, actorId: string, apply = false,
  directory = productUploadsDirectory()) {
  const manifest = pilotImageManifestSchema.parse(input);
  if (!actorId.trim()) throw new Error("Active ADMIN actor required.");
  const prepared = new Map<string, Awaited<ReturnType<typeof preparePilotImage>>>();
  for (const row of manifest.images) prepared.set(row.ean, await preparePilotImage(row));
  const created: string[] = [];
  try {
    return await db.$transaction(async tx => {
      await lockProductCatalog(tx);
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
      if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("Active ADMIN actor required.");
      const selected = await tx.product.findMany({ where: { ean: { in: manifest.images.map(row => row.ean) } }, orderBy: { id: "asc" } });
      if (selected.length !== manifest.images.length) throw new Error("All reviewed products must already exist.");
      const rows = new Map(manifest.images.map(row => [row.ean, row]));
      const plans = [];
      for (const candidate of selected) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${candidate.id} FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: candidate.id } });
        const row = rows.get(candidate.ean!);
        if (!row) throw new Error("Unexpected product identity.");
        validateIdentity(product, row.ean);
        if (product.imageUrl && !isPrivateSupplierImageUrl(product.imageUrl)) {
          plans.push({ ean: row.ean, action: "PRESERVE_PUBLIC_IMAGE" });
          continue;
        }
        if (product.imageAssetId) throw new Error("Existing image asset requires manual review.");
        const image = prepared.get(row.ean)!;
        plans.push({ ean: row.ean, action: "PUBLISH_IMAGE", width: image.width, height: image.height, sizeBytes: image.sizeBytes });
        if (!apply) continue;
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const fileName = `product-${randomUUID()}.webp`;
        const filePath = path.join(directory, fileName);
        // wx prevents overwriting another asset; record before writing to clean up partial writes too.
        const output = await open(filePath, "wx", 0o600);
        created.push(filePath);
        try { await output.writeFile(image.buffer); await output.sync(); } finally { await output.close(); }
        const url = `/uploads/products/${fileName}`;
        const asset = await tx.productImage.create({ data: { url, originalName: `pilot-${row.ean}.webp`, mimeType: "image/webp",
          width: image.width, height: image.height, sizeBytes: image.sizeBytes, backgroundRemoved: false, createdById: actorId } });
        const after = { imageUrl: url, imageAssetId: asset.id };
        await tx.product.update({ where: { id: product.id }, data: after });
        await tx.auditLog.create({ data: { action: "SUPPLIER_PILOT_IMAGE_PUBLISHED", entity: "Product", entityId: product.id, userId: actorId,
          metadata: { ean: row.ean, sourceUrl: row.sourceUrl, sourceSha256: row.sha256,
            publishedSha256: createHash("sha256").update(image.buffer).digest("hex"),
            before: { imageUrl: product.imageUrl, imageAssetId: product.imageAssetId }, after,
            width: image.width, height: image.height, sizeBytes: image.sizeBytes } } });
      }
      return { applied: apply, images: plans };
    }, { timeout: 30_000 });
  } catch (error) {
    const cleanup = await Promise.allSettled(created.map(file => rm(file, { force: true })));
    if (cleanup.some(result => result.status === "rejected")) throw new Error("Publication failed; rollback could not remove every created image. Manual cleanup required.", { cause: error });
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === "--apply" && !apply) { apply = true; continue; }
    if (!["--file", "--actor-id"].includes(key) || values.has(key) || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("Use --file <private.json> --actor-id <active ADMIN> [--apply]. Dry-run is the default.");
    values.set(key, args[++index]);
  }
  if (!values.get("--file") || !values.get("--actor-id")) throw new Error("Use --file <private.json> --actor-id <active ADMIN> [--apply]. Dry-run is the default.");
  if (apply && process.platform !== "win32" && process.getuid?.() !== 1001) throw new Error("Run publication as application UID 1001 so mode-600 images remain readable by the runtime.");
  const { getPrisma } = await import("../src/lib/prisma");
  const db = getPrisma();
  try {
    const input = JSON.parse(await readFile(values.get("--file")!, "utf8"));
    console.log(JSON.stringify(await publishPilotProductImages(db, input, values.get("--actor-id")!, apply), null, 2));
  } finally { await db.$disconnect(); }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/publish-pilot-product-images.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Pilot image publication failed."); process.exitCode = 1; });
}
