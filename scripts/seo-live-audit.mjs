import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Public, read-only checks. No registration, purchases or account changes.
const base = "https://wimifarma.com.br";
const browser = await chromium.launch();
const errors = [];
await mkdir("artifacts/seo-live", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  const sitemap = await (await page.request.get(`${base}/sitemap.xml`)).text();
  assert.match(sitemap, /\/catalogo/); assert.match(sitemap, /\/categorias\//); assert.doesNotMatch(sitemap, /<loc>[^<]*\/login<\/loc>/);
  assert.match(sitemap, /image:loc/);
  const robots = await (await page.request.get(`${base}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/admin/);
  assert.equal((await page.request.get(`${base}/api/admin/marketing/google-feed`)).status(), 401);
  assert.equal((await page.request.get(`${base}/api/health`)).status(), 200);
  const paths = ["/catalogo", "/ofertas"];
  const category = sitemap.match(/<loc>https:\/\/wimifarma\.com\.br(\/categorias\/[^<]+)<\/loc>/)?.[1];
  assert.ok(category); paths.push(category);
  let product;
  for (const path of paths) {
    const raw = await page.request.get(`${base}${path}`); assert.equal(raw.status(), 200);
    assert.match(await raw.text(), /application\/ld\+json/);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal((await page.goto(`${base}${path}`, { waitUntil: "networkidle" })).status(), 200);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${base}${path}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} overflow at ${width}`);
      const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.flatMap(element => JSON.parse(element.textContent || "{}")));
      assert.ok(schema.some(item => item["@type"] === "CollectionPage"));
      assert.ok(schema.some(item => item["@graph"]?.some(node => node["@type"] === "Pharmacy")));
      product ||= await page.locator('a[href^="/produto/"]').first().getAttribute("href");
      await page.screenshot({ path: `artifacts/seo-live/${path.replaceAll("/", "-")}-${width}.png` });
    }
  }
  assert.ok(product);
  await page.goto(`${base}${product}`, { waitUntil: "domcontentloaded" });
  const structured = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.flatMap(element => JSON.parse(element.textContent || "{}")));
  assert.ok(structured.some(item => item["@type"] === "Product"));
  assert.ok(structured.some(item => item["@type"] === "BreadcrumbList"));
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  assert.match(await page.locator('meta[name="robots"]').getAttribute("content") || "", /noindex/);
  const googlebot = page.locator('meta[name="googlebot"]');
  if (await googlebot.count()) assert.doesNotMatch(await googlebot.getAttribute("content") || "", /(^|,\s*)index(,|$)/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, paths, responsive: [320, 390, 1440], productSchema: true, sitemapImages: true, loginNoindex: true, feedRequiresLogin: true, browserErrors: errors.length, writes: 0 }));
} finally { await browser.close(); }
