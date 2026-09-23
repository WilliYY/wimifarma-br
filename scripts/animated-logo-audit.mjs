import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/animated-logo-audit.mjs "original.svg"');
const original = (await readFile(sourcePath, "utf8"))
  .replace(/<defs>\s*<linearGradient id="wimifarma-blue-background"[\s\S]*?<\/defs>/, "")
  .replace(/<rect\b[^>]*fill="url\(#wimifarma-blue-background\)"[^>]*\/>/, "");
const optimized = await readFile("public/brand/logo-wimifarma-animated.svg", "utf8");
const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "image/svg+xml" });
  response.end(request.url === "/original.svg" ? original : optimized);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const browser = await chromium.launch();
try {
  await mkdir("artifacts/animated-logo-qa", { recursive: true });
  const pages = await Promise.all(["original", "optimized"].map(async name => {
    const page = await browser.newPage({ viewport: { width: 1024, height: 400 }, reducedMotion: "no-preference" });
    await page.goto(`http://127.0.0.1:${port}/${name}.svg`);
    await page.evaluate(() => { for (const animation of document.getAnimations()) animation.pause(); });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 5);
    return page;
  }));
  for (const time of [0, 500, 1000, 1700, 2200, 2800, 3300, 3700, 3990]) {
    const frames = [];
    for (const page of pages) {
      await page.evaluate(time => { for (const animation of document.getAnimations()) animation.currentTime = time; }, time);
      frames.push(await page.screenshot({ omitBackground: true, animations: "allow" }));
    }
    const pixels = await Promise.all(frames.map(frame => sharp(frame).ensureAlpha().raw().toBuffer()));
    assert.ok(pixels[1].equals(pixels[0]), `Original rendering changed at ${time}ms`);
    if (time === 1000 || time === 2800 || time === 3300) await writeFile(`artifacts/animated-logo-qa/frame-${time}.png`, frames[1]);
  }
  await pages[1].emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await pages[1].evaluate(() => document.getAnimations().length), 0);
  const still = await pages[1].screenshot({ omitBackground: true });
  const pixels = await sharp(still).ensureAlpha().raw().toBuffer();
  assert.equal(pixels[3], 0, "Canvas corner must be transparent");
  assert.ok(pixels.filter((value, index) => index % 4 === 3 && value > 0).length > 15000, "Reduced motion must show complete artwork, not a blank first frame");
  await writeFile("artifacts/animated-logo-qa/reduced-motion.png", still);
  console.log(JSON.stringify({ framesCompared: 9, pixels: "identical to original without background", animations: 5, cycleSeconds: 4, background: "transparent", reducedMotion: "complete static logo", bytes: Buffer.byteLength(optimized) }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
