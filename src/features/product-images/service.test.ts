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
    assert.equal(init.body.get("model"), "u2net");
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
