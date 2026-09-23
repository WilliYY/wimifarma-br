import assert from "node:assert/strict";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3017";
const browser = await chromium.launch();
const errors = [];
const local = base.includes("127.0.0.1");
// Home needs PostgreSQL. Locally render its actual client component with empty
// catalog fixtures, while all other pages use the running Next server.
const fixture = local ? await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime'; import {CartProvider} from './src/components/site/cart-provider'; import {HomePage} from './src/components/site/home-page'; const router={push(){},replace(){},refresh(){},back(){},forward(){},prefetch:async()=>{}}; createRoot(document.getElementById('root')).render(<AppRouterContext.Provider value={router}><CartProvider><HomePage featuredProducts={[]} catalogProducts={[]} customerReviews={[]}/></CartProvider></AppRouterContext.Provider>);`, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, outfile: "qa.js", platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } }) : null;
await mkdir("artifacts/brand-qa", { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 204 }));
    if (fixture) {
      await page.route(`${base}/`, route => route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa-brand.css"></head><body><main id="root"></main><script src="/qa-brand.js"></script></body></html>' }));
      await page.route(`${base}/qa-brand.js`, route => route.fulfill({ contentType: "text/javascript", body: fixture.outputFiles.find(file => file.path.endsWith(".js")).text }));
      await page.route(`${base}/qa-brand.css`, async route => {
        const files = (await readdir(".next/static/css", { recursive: true })).filter(file => file.endsWith(".css"));
        const css = (await Promise.all(files.map(file => readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
        await route.fulfill({ contentType: "text/css", body: css + (fixture.outputFiles.find(file => file.path.endsWith(".css"))?.text || "") });
      });
    }
    for (const path of ["/delivery", "/sobre", "/contato", "/farmacia-popular", "/"]) {
      assert.equal((await page.goto(`${base}${path}`, { waitUntil: "networkidle" })).status(), 200);
      const header = page.locator('header picture[data-animated-brand] img');
      if (!local || path !== "/") {
        await expect(header).toHaveCount(1);
        await expect.poll(() => header.evaluate(image => image.complete && image.naturalWidth === 640)).toBe(true);
        assert.ok(await header.evaluate(image => image.currentSrc.includes("logo-wimifarma-compact.webp")));
        assert.equal(await header.evaluate(image => getComputedStyle(image).animationName), "none");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await expect.poll(() => header.evaluate(image => image.complete && image.naturalWidth === 1024 && image.currentSrc.includes("logo-wimifarma-animated.svg"))).toBe(true);
        assert.equal(await header.evaluate(image => getComputedStyle(image).animationName), "none");
        await expect(header).toBeVisible();
        await page.emulateMedia({ reducedMotion: "reduce" });
      }
      assert.equal(await page.locator('img[src*="logo-animada"]').count(), 0);
      const signatures = page.locator("main [data-brand-signature] img");
      assert.ok(await signatures.count() >= (path === "/" ? 2 : 1), `${path}: missing brand signature at ${width}; ${errors.join("; ")}`);
      for (const logo of await signatures.all()) {
        await logo.scrollIntoViewIfNeeded();
        await expect.poll(() => logo.evaluate(image => image.complete && image.naturalWidth === 640)).toBe(true);
        assert.ok(await logo.evaluate(image => image.getBoundingClientRect().width >= 100));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path}: overflow ${width}`);
      if (path === "/") {
        for (let index = 1; index <= 3; index++) {
          await page.getByRole("button", { name: new RegExp(`^Mostrar campanha ${index}:`) }).click();
          await expect(page.locator('[aria-roledescription="slide"] [data-brand-signature]')).toBeVisible();
        }
        const perfumery = page.getByRole("region", { name: "Perfumaria e cuidados pessoais" });
        for (const brand of ["Dove", "Rexona", "NIVEA"]) {
          await perfumery.getByRole("button", { name: `Mostrar ${brand}`, exact: true }).click();
          await expect(perfumery.locator("[data-brand-signature]")).toBeVisible();
          await expect(perfumery.getByRole("heading", { name: brand, exact: true })).toBeVisible();
        }
        if (width === 390 || width === 1440) await perfumery.screenshot({ path: `artifacts/brand-qa/perfumery-${width}.png` });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      if (width === 390 || width === 1440) await page.screenshot({ path: `artifacts/brand-qa/${base.includes("127.0.0.1") ? "local" : "live"}-${path.replaceAll("/", "") || "home"}-${width}.png` });
    }
    console.log(JSON.stringify({ width, pages: 5, reducedMotionFullLogo: true, originalAnimationSelected: true, officialBannerSignatures: true, campaigns: 6, overflow: false, writes: 0 }));
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
