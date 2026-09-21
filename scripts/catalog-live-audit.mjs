import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

// Read-only release check. Never create catalog fixtures on this origin.
const base = "https://wimifarma.com.br";
const browser = await chromium.launch();
const errors = [];
const checks = [];
await mkdir("artifacts/catalog-live", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => errors.push(error.message));
  assert.equal((await page.request.get(`${base}/api/health`)).status(), 200);
  assert.equal((await page.request.get(`${base}/api/produtos`)).status(), 401);
  const admin = await page.request.get(`${base}/admin/catalogos`, { maxRedirects: 0 });
  assert.ok([302, 307].includes(admin.status()));
  const response = await page.goto(base, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  const images = page.locator('img[src*="product-"]');
  await expect(images.first()).toBeAttached();
  const urls = [...new Set((await images.evaluateAll(elements => elements.map(element => element.getAttribute("src")))).map(src => {
    const url = new URL(src, base);
    return url.searchParams.get("url") || url.pathname;
  }))];
  assert.ok(urls.length >= 3);
  for (const url of urls) {
    const asset = await page.request.get(`${base}${url}`);
    assert.equal(asset.status(), 200, url);
    assert.equal(asset.headers()["content-type"], "image/webp");
    assert.match(asset.headers()["cache-control"], /immutable/);
    assert.equal((await page.request.get(`${base}${url}`, { headers: { "If-None-Match": asset.headers().etag } })).status(), 304);
    const img = page.locator(`img[src*="${url.split("/").at(-1)}"]`).first();
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  checks.push(`${urls.length} public product photos return WebP 200, ETag 304 and render in Chromium`);
  await images.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/catalog-live/photos-desktop.png" });
  const productUrl = await page.locator('a[href^="/produto/"]').first().getAttribute("href");
  assert.ok(productUrl);
  await page.goto(`${base}${productUrl}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const structured = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(element => JSON.parse(element.textContent || "{}")));
  assert.ok(structured.flat().some(value => value["@type"] === "Product" || value["@graph"]?.some(item => item["@type"] === "Product")));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${base}${productUrl}`);
  checks.push("Public product SSR, canonical and Product JSON-LD valid; admin remains protected");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator('img[src*="product-"]').first().scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${width}`);
    await page.screenshot({ path: `artifacts/catalog-live/home-${width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, checks, browserErrors: errors.length }, null, 2));
} finally {
  await browser.close();
}
