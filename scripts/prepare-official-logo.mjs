import { mkdir } from "node:fs/promises";
import sharp from "sharp";

// Render the existing official artwork without tracing or redrawing its lettering.
await mkdir("artifacts/brand-qa", { recursive: true });
const source = "public/brand/logo-wimifarma.svg";
const logo = await sharp(source).resize({ width: 724 }).png().toBuffer();
const result = await sharp(logo).resize({ width: 640 }).webp({ quality: 90, alphaQuality: 95, effort: 6 }).toFile("public/brand/logo-wimifarma-compact.webp");
await sharp(logo).flatten({ background: "#c8102e" }).png().toFile("artifacts/brand-qa/logo-reference.png");
console.log(JSON.stringify({ width: result.width, height: result.height, bytes: result.size }));
