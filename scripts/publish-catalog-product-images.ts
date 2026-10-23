import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { PrismaClient, Product } from "../src/generated/prisma/client";
import { catalogClassificationSchema, classificationIsConsistent } from "../src/features/products/catalog-operations";
import { lockProductCatalog } from "../src/features/products/mutations";
import { gtinVariants, normalizeGtin } from "../src/features/supplier-catalog/commerce";
import { importSourceSchema } from "../src/features/supplier-catalog/import-manifest";
import { productUploadsDirectory } from "../src/features/product-images/storage";
import { productPhotoReview } from "../src/features/products/photo-publication-policy";
import { preparePilotImage } from "./publish-pilot-product-images";

// Each presentation and reuse authorization is reviewed explicitly before publication.
export const catalogImageManifestSchema = z.object({ images: z.array(z.object({
  ean: z.string().refine(value => normalizeGtin(value) !== null, "Invalid GTIN."),
  name: z.string().trim().min(5).max(160), brand: z.string().trim().min(1).max(120),
  catalogClassification: catalogClassificationSchema,
  filePath: z.string().min(1).max(2000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), sourceUrl: importSourceSchema,
  sourceKind: z.enum(["MANUFACTURER", "DISTRIBUTOR", "RETAILER"]),
  sourceObservedAt: z.iso.datetime({ offset: true }).refine(value => Date.parse(value) <= Date.now(), "Source must already have been observed."),
  sourceEvidence: z.string().trim().min(8).max(400),
  presentationVerified: z.literal(true), eanVerified: z.literal(true), reuseAuthorized: z.literal(true),
  publishOnApproval: z.boolean().default(false),
}).strict().refine(row => {
  const classification = row.catalogClassification;
  return ["MEDICINE", "PERFUMERY", "HYGIENE"].includes(classification.kind) &&
    (classification.kind !== "MEDICINE" || (classification.otc && classification.medicineClass !== "UNCLASSIFIED")) &&
    classificationIsConsistent(classification, { requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false });
}, "Only explicitly classified OTC, perfumery or hygiene presentations are allowed.")).min(1).max(50)
  .refine(rows => new Set(rows.map(row => normalizeGtin(row.ean))).size === rows.length, "Duplicate GTIN.") }).strict();

type ImageRow = z.infer<typeof catalogImageManifestSchema>["images"][number];

function validateIdentity(product: Product | null, row: ImageRow): asserts product is Product {
  const classification = catalogClassificationSchema.safeParse(product?.catalogClassification);
  const ean = normalizeGtin(row.ean);
  if (!product || normalizeGtin(product.ean ?? "") !== ean || (product.eanNormalized && product.eanNormalized !== ean) ||
    product.name !== row.name || product.brand !== row.brand || product.deletedAt || !["ACTIVE", "DRAFT"].includes(product.status) ||
    product.inventorySource !== "DISTRIBUTOR" || product.requiresPrescription || product.prescriptionType !== "UNREVIEWED" ||
    product.isPopularPharmacy || !classification.success ||
    Object.entries(row.catalogClassification).some(([key, value]) => classification.data[key as keyof typeof classification.data] !== value)) {
    throw new Error(`Identity or non-prescription classification changed for ${row.ean}; manual review required.`);
  }
}

export async function publishCatalogProductImages(db: Pick<PrismaClient, "$transaction">, input: unknown, actorId: string, apply = false,
  directory = productUploadsDirectory()) {
  const manifest = catalogImageManifestSchema.parse(input);
  if (!actorId.trim()) throw new Error("Active ADMIN actor required.");
  const prepared = new Map<string, Awaited<ReturnType<typeof preparePilotImage>>>();
  for (const row of manifest.images) prepared.set(normalizeGtin(row.ean)!, await preparePilotImage(row));
  const created: string[] = [];
  try {
    return await db.$transaction(async tx => {
      await lockProductCatalog(tx);
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
      if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("Active ADMIN actor required.");
      const selected = await tx.product.findMany({ where: { OR: manifest.images.flatMap(row => [
        { eanNormalized: normalizeGtin(row.ean)! }, { ean: { in: gtinVariants(row.ean) } },
      ]) }, orderBy: { id: "asc" } });
      const rows = new Map<string, ImageRow>();
      for (const row of manifest.images) {
        const ean = normalizeGtin(row.ean);
        const matches = selected.filter(product => product.eanNormalized === ean || normalizeGtin(product.ean ?? "") === ean);
        if (matches.length !== 1) throw new Error(`Missing or ambiguous product identity for ${row.ean}; manual review required.`);
        rows.set(matches[0].id, row);
      }
      if (rows.size !== selected.length) throw new Error("Ambiguous product identities; manual review required.");
      const plans = [];
      for (const candidate of selected) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${candidate.id} FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: candidate.id } });
        const row = rows.get(candidate.id)!;
        validateIdentity(product, row);
        // Leave every manual cover, asset and gallery intact, even if some slots are empty.
        if (product.imageUrl || product.imageAssetId || product.imageUrls.length > 0) {
          plans.push({ ean: row.ean, action: "PRESERVE_EXISTING_IMAGES" });
          continue;
        }
        const image = prepared.get(normalizeGtin(row.ean)!)!;
        const publish = product.status === "DRAFT" && row.publishOnApproval;
        plans.push({ ean: row.ean, action: "PUBLISH_IMAGE", publishOnApproval: row.publishOnApproval,
          statusAfter: publish ? "ACTIVE" : product.status, width: image.width, height: image.height, sizeBytes: image.sizeBytes });
        if (!apply) continue;
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const fileName = `product-${randomUUID()}.webp`;
        const filePath = path.join(directory, fileName);
        const output = await open(filePath, "wx", 0o600);
        created.push(filePath);
        try { await output.writeFile(image.buffer); await output.sync(); } finally { await output.close(); }
        const url = `/uploads/products/${fileName}`;
        const asset = await tx.productImage.create({ data: { url, originalName: `catalog-${row.ean}.webp`, mimeType: "image/webp",
          width: image.width, height: image.height, sizeBytes: image.sizeBytes, backgroundRemoved: false, createdById: actorId } });
        const after = { imageUrl: url, imageAssetId: asset.id, ...(publish ? { status: "ACTIVE" as const } : {}) };
        await tx.product.update({ where: { id: product.id }, data: after });
        await tx.auditLog.create({ data: { action: "SUPPLIER_CATALOG_IMAGE_PUBLISHED", entity: "Product", entityId: product.id, userId: actorId,
          metadata: { ean: row.ean, eanNormalized: normalizeGtin(row.ean), name: row.name, brand: row.brand,
            catalogClassification: row.catalogClassification, sourceUrl: row.sourceUrl, sourceKind: row.sourceKind,
            sourceObservedAt: row.sourceObservedAt, sourceEvidence: row.sourceEvidence,
            presentationVerified: true, eanVerified: true, reuseAuthorized: true,
            sourceSha256: row.sha256, publishedSha256: createHash("sha256").update(image.buffer).digest("hex"),
            publishOnApproval: row.publishOnApproval,
            photoReview: productPhotoReview({ ...product, ...after }),
            before: { status: product.status, imageUrl: product.imageUrl, imageAssetId: product.imageAssetId, imageUrls: product.imageUrls }, after,
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
    console.log(JSON.stringify(await publishCatalogProductImages(db, input, values.get("--actor-id")!, apply), null, 2));
  } finally { await db.$disconnect(); }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/publish-catalog-product-images.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Catalog image publication failed."); process.exitCode = 1; });
}
