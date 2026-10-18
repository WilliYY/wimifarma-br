import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient, Product } from "../src/generated/prisma/client";
import { publishPilotProductImages } from "./publish-pilot-product-images";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "pilot-publication-"));
  const source = path.join(root, "private-original.png");
  const bytes = await sharp({ create: { width: 900, height: 750, channels: 3, background: "white" } }).png().toBuffer();
  await writeFile(source, bytes);
  const input = { images: [{ ean: "7896004708539", filePath: source, mimeType: "image/png", sourceUrl: "https://supplier.example/image.png",
    sha256: createHash("sha256").update(bytes).digest("hex") }] };
  const product = { id: "synthetic-product", ean: input.images[0].ean, name: "Losartana Potássica 50 mg 30 Comprimidos Revestidos Germed",
    brand: "Germed", status: "ACTIVE", inventorySource: "DISTRIBUTOR", deletedAt: null, requiresPrescription: true,
    prescriptionType: "ORDINARY", isPopularPharmacy: false, imageUrl: "/api/admin/fornecedores/imagens/00000000-0000-0000-0000-000000000000.webp", imageAssetId: null } as Product;
  let validActor = true, failAudit = false, changed: Partial<Product> = {};
  const writes: { kind: string; data: Record<string, unknown> }[] = [];
  const audits: Record<string, unknown>[] = [];
  let committed = false;
  const tx = { $queryRaw: async () => [], user: { findFirst: async () => validActor ? { id: "synthetic-admin" } : null },
    product: { findMany: async () => [product], findUnique: async () => ({ ...product, ...changed }),
      update: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ kind: "product", data }); } },
    productImage: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ kind: "asset", data }); return { id: "synthetic-asset" }; } },
    auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { if (failAudit) throw new Error("Synthetic audit failure"); audits.push(data); } } };
  const db = { $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => {
    const result = await callback(tx); committed = true; return result;
  } } as unknown as Pick<PrismaClient, "$transaction">;
  const directory = path.join(root, "public");
  return { root, source, bytes, input, product, writes, audits, directory,
    actor: (value: boolean) => { validActor = value; }, fail: () => { failAudit = true; }, change: (value: Partial<Product>) => { changed = value; },
    committed: () => committed, run: (apply = false) => publishPilotProductImages(db, input, "synthetic-admin", apply, directory),
    cleanup: () => rm(root, { recursive: true, force: true }) };
}

test("pilot image dry-run decodes and validates without creating files, assets or audit records", async () => {
  const f = await fixture();
  try {
    const result = await f.run();
    assert.equal(result.applied, false);
    assert.equal(result.images[0].action, "PUBLISH_IMAGE");
    assert.equal(f.writes.length, 0);
    assert.equal(f.audits.length, 0);
    assert.deepEqual(await readdir(f.root), ["private-original.png"]);
    await writeFile(f.source, Buffer.from("not an image"));
    await assert.rejects(f.run(), /Invalid local image file|SHA-256 mismatch/);
  } finally { await f.cleanup(); }
});

test("pilot image publication rejects actor, unreviewed EAN, hash, source, MIME and post-lock identity changes", async () => {
  for (const invalid of ["actor", "ean", "hash", "source", "mime", "name", "brand", "physical", "prescription", "presentation"] as const) {
    const f = await fixture();
    try {
      if (invalid === "actor") f.actor(false);
      if (invalid === "ean") f.input.images[0].ean = "7890000000000";
      if (invalid === "hash") f.input.images[0].sha256 = "0".repeat(64);
      if (invalid === "source") f.input.images[0].sourceUrl = "https://user:password@supplier.example/image.png";
      if (invalid === "mime") f.input.images[0].mimeType = "image/webp";
      if (invalid === "name") f.change({ name: "Losartana 100 mg 30 Comprimidos" });
      if (invalid === "brand") f.change({ brand: "Other" });
      if (invalid === "physical") f.change({ inventorySource: "PHARMACY" });
      if (invalid === "prescription") f.change({ prescriptionType: "CONTROLLED" });
      if (invalid === "presentation") f.change({ name: f.product.name.replace("30", "60") });
      await assert.rejects(f.run(true));
      assert.equal(f.writes.length, 0, invalid);
      assert.deepEqual(await readdir(f.root), ["private-original.png"]);
    } finally { await f.cleanup(); }
  }
});

test("publication writes only image fields, bounded WebP, private original preserved and source/hash audited", async () => {
  const f = await fixture();
  try {
    const result = await f.run(true);
    assert.equal(result.applied, true);
    assert.equal(f.committed(), true);
    const updates = f.writes.filter(write => write.kind === "product");
    assert.equal(updates.length, 1);
    assert.deepEqual(Object.keys(updates[0].data).sort(), ["imageAssetId", "imageUrl"]);
    const files = await readdir(f.directory);
    assert.equal(files.length, 1);
    assert.match(files[0], /^product-[a-f0-9-]{36}\.webp$/);
    const output = await readFile(path.join(f.directory, files[0]));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.ok(metadata.width! <= 640 && metadata.height! <= 640 && output.length <= 100_000);
    assert.equal(metadata.xmp, undefined);
    if (process.platform !== "win32") assert.equal((await stat(path.join(f.directory, files[0]))).mode & 0o777, 0o600);
    assert.deepEqual(await readFile(f.source), f.bytes);
    const audit = f.audits[0].metadata as Record<string, unknown>;
    assert.equal(audit.sourceUrl, f.input.images[0].sourceUrl);
    assert.equal(audit.sourceSha256, f.input.images[0].sha256);
    assert.deepEqual(audit.before, { imageUrl: f.product.imageUrl, imageAssetId: null });
    assert.deepEqual(audit.after, updates[0].data);
  } finally { await f.cleanup(); }
});

test("audit failure rolls back transaction and removes newly created public files without removing the original", async () => {
  const f = await fixture();
  try {
    f.fail();
    await assert.rejects(f.run(true), /Synthetic audit failure/);
    assert.equal(f.committed(), false);
    assert.deepEqual(await readdir(f.directory), []);
    assert.deepEqual(await readFile(f.source), f.bytes);
  } finally { await f.cleanup(); }
});

test("existing public cover is preserved without writes, including safe repeated publication", async () => {
  const f = await fixture();
  try {
    f.change({ imageUrl: "/uploads/products/product-00000000-0000-0000-0000-000000000000.webp", imageAssetId: "existing" });
    for (let repeat = 0; repeat < 2; repeat++) assert.equal((await f.run(true)).images[0].action, "PRESERVE_PUBLIC_IMAGE");
    assert.equal(f.writes.length, 0);
    assert.equal(f.audits.length, 0);
    assert.deepEqual(await readdir(f.root), ["private-original.png"]);
  } finally { await f.cleanup(); }
});

test("small source images are never enlarged", async () => {
  const f = await fixture();
  try {
    const bytes = await sharp({ create: { width: 40, height: 30, channels: 3, background: "white" } }).png().toBuffer();
    await writeFile(f.source, bytes);
    f.input.images[0].sha256 = createHash("sha256").update(bytes).digest("hex");
    const image = (await f.run()).images[0];
    assert.equal(image.width, 40);
    assert.equal(image.height, 30);
  } finally { await f.cleanup(); }
});
