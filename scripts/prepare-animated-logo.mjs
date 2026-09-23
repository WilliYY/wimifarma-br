import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import sharp from "sharp";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/prepare-animated-logo.mjs "original.svg"');
const source = await readFile(sourcePath, "utf8");
assert.ok(!/<script\b|<foreignObject\b|\bon\w+=/i.test(source), "Unexpected active content in source SVG");
const encoded = source.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1];
assert.ok(encoded, "Expected original embedded PNG");
assert.ok(source.includes('id="wimifarma-blue-background"'), "Expected original blue background");
const originalPng = Buffer.from(encoded, "base64");
// Re-encode at the original 1024px resolution, without resizing or quantization.
const optimizedRaster = await sharp(originalPng).webp({ lossless: true, effort: 6 }).toBuffer();
assert.ok((await sharp(optimizedRaster).ensureAlpha().raw().toBuffer()).equals(await sharp(originalPng).ensureAlpha().raw().toBuffer()), "Decoded image pixels must remain identical");
let svg = source.replace(`data:image/png;base64,${encoded}`, `data:image/webp;base64,${optimizedRaster.toString("base64")}`)
  .replace(/<defs>\s*<linearGradient id="wimifarma-blue-background"[\s\S]*?<\/defs>/, "")
  .replace(/<rect\b[^>]*fill="url\(#wimifarma-blue-background\)"[^>]*\/>/, "")
  .replace(/<clipPath id="(?:writing-text-clip|global-liquid-clip)"[\s\S]*?<\/clipPath>/g, "")
  .replace(/<!--([\s\S]*?)-->/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace("transform-box: transform-box;", "")
  .replace("</style>", "@media(prefers-reduced-motion:reduce){#wimifarma-svg-logo *{animation:none!important;transform:none!important;opacity:1!important}}</style>")
  .replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
assert.ok(!svg.includes("wimifarma-blue-background"));
assert.equal((svg.match(/@keyframes/g) ?? []).length, 5, "Keep all five original animations");
assert.ok(Buffer.byteLength(svg) < 80000, "Animated SVG budget: 80KB");
svg += "\n";
const output = "public/brand/logo-wimifarma-animated.svg";
await writeFile(output, svg);
console.log(JSON.stringify({ output, sourceSha256: createHash("sha256").update(source).digest("hex"), originalBytes: Buffer.byteLength(source), optimizedBytes: Buffer.byteLength(svg), gzipBytes: gzipSync(svg).length, reductionPercent: Number(((1 - Buffer.byteLength(svg) / Buffer.byteLength(source)) * 100).toFixed(1)), rasterPixels: "identical", cycleSeconds: 4 }));
