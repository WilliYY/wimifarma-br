import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient, Product } from "../src/generated/prisma/client";
import { publishCatalogProductImages, catalogImageManifestSchema } from "./publish-catalog-product-images";
import { serveProductImage } from "../src/features/product-images/storage";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "catalog-publication-"));
  const filePath = path.join(root, "original.png");
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "white" } }).png().toBuffer();
  await writeFile(filePath, bytes);
  const catalogClassification = { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false };
  const input = { images: [{ ean: "7896004708539", name: "Apresentação sintética 100 ml", brand: "Teste", catalogClassification,
    filePath, mimeType: "image/png", sha256: createHash("sha256").update(bytes).digest("hex"),
    sourceUrl: "https://supplier.example/products/7896004708539", sourceKind: "DISTRIBUTOR", sourceObservedAt: "2026-10-01T12:00:00Z",
    sourceEvidence: "EAN e apresentação conferidos na fonte autorizada.", presentationVerified: true, eanVerified: true, reuseAuthorized: true }] };
  const product = { id: "synthetic-product", ean: input.images[0].ean, eanNormalized: "07896004708539", name: input.images[0].name,
    brand: "Teste", catalogClassification, status: "ACTIVE", inventorySource: "DISTRIBUTOR", deletedAt: null,
    requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, imageUrl: null, imageUrls: [], imageAssetId: null } as unknown as Product;
  let active = true, fail = false, duplicate = false, change: Partial<Product> = {};
  const writes: { kind: string; data: Record<string, unknown> }[] = [];
  const audits: Record<string, unknown>[] = [];
  const locks: string[] = [];
  const tx = { $queryRaw: async (strings: TemplateStringsArray) => { locks.push(strings.join("?")); return []; },
    user: { findFirst: async () => active ? { id: "admin" } : null },
    product: { findMany: async () => duplicate ? [product, { ...product, id: "collision" }] : [product], findUnique: async () => ({ ...product, ...change }),
      update: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ kind: "product", data }); change = { ...change, ...data }; } },
    productImage: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ kind: "asset", data }); return { id: "asset" }; } },
    auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { if (fail) throw new Error("Synthetic audit failure"); audits.push(data); } } };
  const db = { $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Pick<PrismaClient, "$transaction">;
  const directory = path.join(root, "public");
  return { root, input, product, bytes, filePath, directory, writes, audits, locks,
    actor: () => { active = false; }, fail: () => { fail = true; }, duplicate: () => { duplicate = true; },
    change: (value: Partial<Product>) => { change = value; },
    run: (apply = false) => publishCatalogProductImages(db, input, "admin", apply, directory),
    cleanup: () => rm(root, { recursive: true, force: true }) };
}

test("catalog photo dry-run validates identity and image without creating files or records", async () => {
  const f = await fixture();
  try {
    const result = await f.run();
    assert.equal(result.applied, false);
    assert.equal(result.images[0].action, "PUBLISH_IMAGE");
    assert.equal(f.writes.length, 0);
    assert.equal(f.audits.length, 0);
    assert.deepEqual(await readdir(f.root), ["original.png"]);
    assert.ok(f.locks.some(lock => lock.includes('"User"') && lock.includes("FOR UPDATE")));
    assert.ok(f.locks.some(lock => lock.includes('"Product"') && lock.includes("FOR UPDATE")));
  } finally { await f.cleanup(); }
});

test("publication preserves originals, creates bounded readable WebP and audits provenance", async () => {
  const f = await fixture();
  try {
    await f.run(true);
    const files = await readdir(f.directory);
    assert.equal(files.length, 1);
    const response = await serveProductImage(new Request("https://example.org"), files[0], f.directory);
    assert.equal(response.status, 200);
    const output = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.ok(metadata.width! <= 640 && metadata.height! <= 640 && output.length <= 100_000);
    assert.deepEqual(await readFile(f.filePath), f.bytes);
    assert.deepEqual(Object.keys(f.writes.find(write => write.kind === "product")!.data).sort(), ["imageAssetId", "imageUrl"]);
    const audit = f.audits[0].metadata as Record<string, unknown>;
    assert.equal(audit.sourceSha256, f.input.images[0].sha256);
    assert.equal(audit.sourceUrl, f.input.images[0].sourceUrl);
    assert.equal(audit.publishedSha256, createHash("sha256").update(output).digest("hex"));
    assert.equal(audit.sourceKind, "DISTRIBUTOR");
    assert.equal((await f.run(true)).images[0].action, "PRESERVE_EXISTING_IMAGES");
    assert.equal((await readdir(f.directory)).length, 1);
  } finally { await f.cleanup(); }
});

test("active ADMIN, exact post-lock identity and compatible non-Rx classification are mandatory", async () => {
  for (const invalid of ["actor", "duplicate", "rx", "controlled", "popular", "physical", "deleted", "name", "ean", "classification", "unclassified", "medicine-unreviewed"] as const) {
    const f = await fixture();
    try {
      if (invalid === "actor") f.actor();
      if (invalid === "duplicate") f.duplicate();
      if (invalid === "rx") f.change({ requiresPrescription: true });
      if (invalid === "controlled") f.change({ prescriptionType: "CONTROLLED" });
      if (invalid === "popular") f.change({ isPopularPharmacy: true });
      if (invalid === "physical") f.change({ inventorySource: "PHARMACY" });
      if (invalid === "deleted") f.change({ deletedAt: new Date() });
      if (invalid === "name") f.change({ name: "Apresentação diferente" });
      if (invalid === "ean") f.change({ eanNormalized: "07896181915638" });
      if (invalid === "classification") f.change({ catalogClassification: { kind: "PERFUMERY", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } });
      if (invalid === "unclassified") f.change({ catalogClassification: null });
      if (invalid === "medicine-unreviewed") Object.assign(f.input.images[0].catalogClassification, { kind: "MEDICINE", otc: true });
      await assert.rejects(f.run(true), Error, invalid);
      assert.equal(f.writes.length, 0, invalid);
      assert.deepEqual(await readdir(f.root), ["original.png"]);
    } finally { await f.cleanup(); }
  }
});

test("every existing cover, image asset and gallery is preserved without writes", async () => {
  for (const change of [{ imageUrl: "/uploads/products/existing.webp" }, { imageAssetId: "manual-asset" }, { imageUrls: ["https://example.org/manual.webp"] }]) {
    const f = await fixture();
    try {
      f.change(change);
      assert.equal((await f.run(true)).images[0].action, "PRESERVE_EXISTING_IMAGES");
      assert.equal(f.writes.length, 0);
      assert.deepEqual(await readdir(f.root), ["original.png"]);
    } finally { await f.cleanup(); }
  }
});

test("explicit OTC and perfumery classifications are eligible without changing commercial fields", async () => {
  for (const classification of [
    { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true },
    { kind: "PERFUMERY", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
  ]) {
    const f = await fixture();
    try {
      f.input.images[0].catalogClassification = classification;
      f.change({ catalogClassification: classification });
      assert.equal((await f.run(true)).images[0].action, "PUBLISH_IMAGE");
      assert.deepEqual(Object.keys(f.writes.find(write => write.kind === "product")!.data).sort(), ["imageAssetId", "imageUrl"]);
    } finally { await f.cleanup(); }
  }
});

test("strict sources, explicit verification, source hash, MIME and static image limits fail closed", async () => {
  const f = await fixture();
  try {
    for (const fields of [{ sourceUrl: "https://user:secret@example.org" }, { sourceUrl: "https://example.org/?token=secret" },
      { sourceUrl: "http://example.org" }, { reuseAuthorized: false }, { eanVerified: false }, { presentationVerified: false }, { unexpected: true }]) {
      assert.equal(catalogImageManifestSchema.safeParse({ images: [{ ...f.input.images[0], ...fields }] }).success, false);
    }
    assert.equal(catalogImageManifestSchema.safeParse({ images: [f.input.images[0], { ...f.input.images[0], ean: "07896004708539" }] }).success, false);
    f.input.images[0].sha256 = "0".repeat(64);
    await assert.rejects(f.run(true), /SHA-256/);
    f.input.images[0].sha256 = createHash("sha256").update(f.bytes).digest("hex");
    f.input.images[0].mimeType = "image/webp";
    await assert.rejects(f.run(true), /MIME/);
    assert.equal(f.writes.length, 0);
  } finally { await f.cleanup(); }
});

test("rollback removes created public files and small images are never enlarged", async () => {
  const f = await fixture();
  try {
    const bytes = await sharp({ create: { width: 40, height: 30, channels: 3, background: "white" } }).png().toBuffer();
    await writeFile(f.filePath, bytes);
    f.input.images[0].sha256 = createHash("sha256").update(bytes).digest("hex");
    const planned = (await f.run()).images[0];
    assert.equal(planned.width, 40);
    assert.equal(planned.height, 30);
    f.fail();
    await assert.rejects(f.run(true), /Synthetic audit failure/);
    assert.deepEqual(await readdir(f.directory), []);
    assert.deepEqual(await readFile(f.filePath), bytes);
  } finally { await f.cleanup(); }
});

test("oversized files, decompression bombs and animated sources are rejected before persistence", async () => {
  const f = await fixture();
  try {
    const largeFile = Buffer.alloc(10 * 1024 * 1024 + 1);
    await writeFile(f.filePath, largeFile);
    f.input.images[0].sha256 = createHash("sha256").update(largeFile).digest("hex");
    await assert.rejects(f.run(true), /Invalid local image file/);
    const bomb = await sharp({ create: { width: 6400, height: 6400, channels: 3, background: "white" } }).png().toBuffer();
    await writeFile(f.filePath, bomb);
    f.input.images[0].sha256 = createHash("sha256").update(bomb).digest("hex");
    await assert.rejects(f.run(true), /pixel limit/);
    const frames = Buffer.alloc(20 * 40 * 3);
    frames.fill(255, 0, 20 * 20 * 3);
    const animated = await sharp(frames, { raw: { width: 20, height: 40, pageHeight: 20, channels: 3 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
    assert.equal((await sharp(animated, { animated: true }).metadata()).pages, 2);
    await writeFile(f.filePath, animated);
    f.input.images[0].mimeType = "image/webp";
    f.input.images[0].sha256 = createHash("sha256").update(animated).digest("hex");
    await assert.rejects(f.run(true), /Invalid static image/);
    assert.equal(f.writes.length, 0);
  } finally { await f.cleanup(); }
});
