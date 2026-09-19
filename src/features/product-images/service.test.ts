import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import sharp from "sharp";
import {
  isBackgroundRemovalAvailable,
  processProductImage,
  ProductImageError,
} from "@/features/product-images/service";

const originalFetch = globalThis.fetch;
const originalLocalUrl = process.env.BACKGROUND_REMOVAL_URL;
const originalRemoveBgKey = process.env.REMOVE_BG_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalLocalUrl === undefined) delete process.env.BACKGROUND_REMOVAL_URL;
  else process.env.BACKGROUND_REMOVAL_URL = originalLocalUrl;
  if (originalRemoveBgKey === undefined) delete process.env.REMOVE_BG_API_KEY;
  else process.env.REMOVE_BG_API_KEY = originalRemoveBgKey;
});

test("uses the local u2net service and flattens the result on white", async () => {
  process.env.BACKGROUND_REMOVAL_URL = "http://background-removal:7000";
  delete process.env.REMOVE_BG_API_KEY;

  const transparentPixels = Buffer.alloc(8 * 8 * 4);
  for (let y = 2; y < 6; y += 1) {
    for (let x = 2; x < 6; x += 1) {
      const offset = (y * 8 + x) * 4;
      transparentPixels[offset] = 20;
      transparentPixels[offset + 1] = 60;
      transparentPixels[offset + 2] = 220;
      transparentPixels[offset + 3] = 255;
    }
  }
  const removedBackground = await sharp(transparentPixels, {
    raw: { channels: 4, height: 8, width: 8 },
  }).png().toBuffer();

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://background-removal:7000/api/remove");
    assert.equal(init?.method, "POST");
    assert.ok(init?.body instanceof FormData);
    assert.ok(init.body.get("file") instanceof Blob);
    return new Response(removedBackground, {
      headers: { "content-type": "image/png" },
      status: 200,
    });
  };

  const input = await sharp({
    create: {
      background: { b: 240, g: 240, r: 240 },
      channels: 3,
      height: 8,
      width: 8,
    },
  }).jpeg().toBuffer();
  const result = await processProductImage({
    buffer: input,
    fileName: "produto.jpg",
    mimeType: "image/jpeg",
    removeBackground: true,
  });
  const decoded = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });

  assert.equal(decoded.info.width, 8);
  assert.equal(decoded.info.height, 8);
  assert.ok(decoded.data[0] >= 245);
  assert.ok(decoded.data[1] >= 245);
  assert.ok(decoded.data[2] >= 245);
  const center = (4 * 8 + 4) * decoded.info.channels;
  assert.ok(decoded.data[center + 2] > decoded.data[center]);
});

test("fails clearly when no background-removal provider is configured", async () => {
  delete process.env.BACKGROUND_REMOVAL_URL;
  delete process.env.REMOVE_BG_API_KEY;
  const input = await sharp({
    create: {
      background: "white",
      channels: 3,
      height: 8,
      width: 8,
    },
  }).png().toBuffer();

  await assert.rejects(
    processProductImage({
      buffer: input,
      fileName: "produto.png",
      mimeType: "image/png",
      removeBackground: true,
    }),
    (error) => error instanceof ProductImageError && error.status === 503,
  );
});

test("does not advertise an invalid local provider URL", () => {
  process.env.BACKGROUND_REMOVAL_URL = "file:///tmp/background-removal";
  delete process.env.REMOVE_BG_API_KEY;

  assert.equal(isBackgroundRemovalAvailable(), false);
});

test("bounds working resolution before sending an image to the local AI", async () => {
  process.env.BACKGROUND_REMOVAL_URL = "http://background-removal:7000";
  const input = await sharp({ create: { width: 3400, height: 2400, channels: 3, background: "blue" } }).jpeg().toBuffer();
  globalThis.fetch = async (_url, init) => {
    const file = (init?.body as FormData).get("file") as Blob;
    const meta = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
    assert.ok((meta.width ?? 0) <= 1600);
    assert.ok((meta.height ?? 0) <= 1600);
    const output = await sharp({ create: { width: 30, height: 30, channels: 4, background: { r: 0, g: 0, b: 200, alpha: 1 } } }).extend({ top: 5, bottom: 5, left: 5, right: 5, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return new Response(output, { headers: { "content-type": "image/png" } });
  };
  await processProductImage({ buffer: input, fileName: "large.jpg", mimeType: "image/jpeg", removeBackground: true });
});

test("rejects an empty AI mask instead of silently saving a blank product", async () => {
  process.env.BACKGROUND_REMOVAL_URL = "http://background-removal:7000";
  const input = await sharp({ create: { width: 32, height: 32, channels: 3, background: "blue" } }).png().toBuffer();
  const blank = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  globalThis.fetch = async () => new Response(blank, { headers: { "content-type": "image/png" } });
  await assert.rejects(processProductImage({ buffer: input, fileName: "test.png", mimeType: "image/png", removeBackground: true }), ProductImageError);
});

test("optimizes large photos without enlarging small originals or keeping metadata", async () => {
  const input = await sharp({ create: { width: 2600, height: 2400, channels: 3, background: "green" } }).jpeg().toBuffer();
  const result = await processProductImage({ buffer: input, fileName: "big.jpg", mimeType: "image/jpeg", removeBackground: false });
  assert.ok(result.width <= 1600);
  assert.ok(result.sizeBytes <= 350_000);
  assert.equal((await sharp(result.buffer).metadata()).exif, undefined);
});
