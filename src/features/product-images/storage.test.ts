import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { serveProductImage } from "./storage";

test("serves an upload created after startup, with immutable cache and conditional GET", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wimifarma-images-"));
  const name = `product-${randomUUID()}.webp`;
  try {
    assert.equal((await serveProductImage(new Request("http://localhost/image"), name, directory)).status, 404);
    const bytes = await sharp({ create: { width: 12, height: 12, channels: 3, background: "red" } }).webp().toBuffer();
    await writeFile(path.join(directory, name), bytes);
    const response = await serveProductImage(new Request("http://localhost/image"), name, directory);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.match(response.headers.get("cache-control") ?? "", /immutable/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    const cached = await serveProductImage(new Request("http://localhost/image", { headers: { "if-none-match": response.headers.get("etag")! } }), name, directory);
    assert.equal(cached.status, 304);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("rejects traversal, unexpected extensions, missing and non-image files", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wimifarma-images-"));
  try {
    for (const name of ["../.env", "..%2f.env", "product-x.svg", "photo.webp", "C:\\Windows\\file.webp"]) {
      assert.equal((await serveProductImage(new Request("http://localhost/image"), name, directory)).status, 404);
    }
    const name = `product-${randomUUID()}.webp`;
    await writeFile(path.join(directory, name), "not an image");
    assert.equal((await serveProductImage(new Request("http://localhost/image"), name, directory)).status, 404);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
