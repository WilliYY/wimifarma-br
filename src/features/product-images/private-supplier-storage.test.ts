import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { mock } from "node:test";
import filesystem from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import sharp from "sharp";
import { preparePrivateSupplierImage, storePrivateSupplierImage, servePrivateSupplierImage } from "./private-supplier-storage";
import { privateSupplierImageAllowed } from "./private-supplier-policy";

test("internal supplier photos are small WebP outside public, never enlarged or publicly cached", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "private-supplier-images-"));
  try {
    for (const width of [20, 1200]) {
      const buffer = await sharp({ create: { width, height: width, channels: 3, background: "red" } }).png().toBuffer();
      const saved = await storePrivateSupplierImage({ buffer, fileName: "synthetic.png", mimeType: "image/png" }, directory);
      assert.ok(saved.width <= Math.min(width, 352));
      assert.ok(saved.height <= Math.min(width, 352));
      assert.ok(saved.sizeBytes <= 100_000);
      assert.match(saved.url, /^\/api\/admin\/fornecedores\/imagens\/[0-9a-f-]+\.webp$/);
      const bytes = await readFile(path.join(directory, saved.fileName));
      assert.equal((await sharp(bytes).metadata()).format, "webp");
      const response = await servePrivateSupplierImage(saved.fileName, directory);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("etag"), null);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("private images reject traversal, unsupported content and excessive input", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "private-supplier-images-"));
  try {
    for (const name of ["../.env", "..%2f.env", "C:\\private.webp", "photo.svg", "photo.webp"]) {
      const response = await servePrivateSupplierImage(name, directory);
      assert.equal(response.status, 404);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
    const fileName = "00000000-0000-4000-8000-000000000000.webp";
    await writeFile(path.join(directory, fileName), "not an image");
    assert.equal((await servePrivateSupplierImage(fileName, directory)).status, 404);
    await assert.rejects(storePrivateSupplierImage({ buffer: Buffer.alloc(10 * 1024 * 1024 + 1), fileName: "large.webp", mimeType: "image/webp" }, directory));
    await assert.rejects(storePrivateSupplierImage({ buffer: Buffer.from("<svg/>"), fileName: "image.svg", mimeType: "image/svg+xml" }, directory));
    await assert.rejects(storePrivateSupplierImage({ buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'), fileName: "image.png", mimeType: "image/png" }, directory));
    await assert.rejects(storePrivateSupplierImage({ buffer: Buffer.from("invalid"), fileName: "image.png", mimeType: "image/png" }, directory));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("importer dry runs validate and compress without choosing a filename or URL", async () => {
  const buffer = await sharp({ create: { width: 800, height: 600, channels: 3, background: "white" } }).png().toBuffer();
  const prepared = await preparePrivateSupplierImage({ buffer, fileName: "synthetic.png", mimeType: "image/png" });
  assert.equal(prepared.width, 352);
  assert.equal(prepared.height, 264);
  assert.ok(prepared.sizeBytes <= 100_000);
  assert.equal(prepared.buffer.length, prepared.sizeBytes);
  assert.equal("url" in prepared, false);
  assert.equal("fileName" in prepared, false);
});

test("private URL belongs only to prescription distributor products", () => {
  const imageUrl = "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp";
  assert.equal(privateSupplierImageAllowed(imageUrl, "DISTRIBUTOR", true), true);
  assert.equal(privateSupplierImageAllowed(imageUrl, "PHARMACY", true), false);
  assert.equal(privateSupplierImageAllowed(imageUrl, "DISTRIBUTOR", false), false);
  assert.equal(privateSupplierImageAllowed(`https://example.com${imageUrl}`, "PHARMACY", false), false);
  assert.equal(privateSupplierImageAllowed(`${imageUrl}?copy=true`, "DISTRIBUTOR", true), false);
  assert.equal(privateSupplierImageAllowed("/api/admin/fornecedores/imagens/../x", "DISTRIBUTOR", true), false);
  assert.equal(privateSupplierImageAllowed("/uploads/products/example.webp", "PHARMACY", false), true);
});

test("private reader rejects symlinks and propagates operational filesystem failures", async context => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "private-supplier-reader-"));
  try {
    const source = path.join(directory, "source.webp");
    await writeFile(source, "RIFF0000WEBPprivate");
    const failure = Object.assign(new Error("synthetic storage failure"), { code: "EIO" });
    const readFailure = mock.method(filesystem, "lstat", async () => { throw failure; });
    syncBuiltinESMExports();
    try { await assert.rejects(servePrivateSupplierImage("00000000-0000-4000-8000-000000000000.webp", directory), failure); }
    finally { readFailure.mock.restore(); syncBuiltinESMExports(); }
    const name = "00000000-0000-4000-8000-000000000001.webp";
    try { await symlink(source, path.join(directory, name), "file"); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "EPERM") {
        context.diagnostic("Symlink fixture unavailable without Windows symlink privilege; operational failure check passed.");
        return;
      }
      throw error;
    }
    assert.equal((await servePrivateSupplierImage(name, directory)).status, 404);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
