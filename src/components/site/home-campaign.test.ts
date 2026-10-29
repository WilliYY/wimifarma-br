import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type BrowserContextOptions } from "@playwright/test";

const origin = "http://127.0.0.1:3194";
const captureRoot = process.env.HOME_CAMPAIGN_CAPTURE_ROOT;
const browser = chromium.launch();
after(async () => (await browser).close());
const fixtureFiles = (async () => {
  const globalCss = await readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css);
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default function Link({prefetch,children,...props}){return <a {...props}>{children}</a>}",
    "next/image": "import React from 'react';export default function Image({fill,priority,quality,unoptimized,sizes,style,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>}",
    "@/components/site/brand-carousel": "export const BrandCarousel=()=>null;",
    "@/components/site/club-banner": "export const ClubBanner=()=>null;",
    "@/components/site/pix-discount-banner": "export const PixDiscountBanner=()=>null;",
    "@/components/site/home-product-carousel": "import React from 'react';export const HomeProductCarousel=()=> <section data-products><h2>Produtos</h2></section>;",
  };
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {HomePage} from './src/components/site/home-page';import {buildHomeShortcuts} from './src/features/products/home-shortcuts';
    createRoot(document.getElementById('root')).render(<HomePage collections={{care:[],otc:[],affordable:[]}} customerReviews={[]} shortcuts={buildHomeShortcuts()}/>);`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, outfile: "fixture.js", platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "campaign-isolated-fixture", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  return { js: bundle.outputFiles.find(file => file.path.endsWith(".js"))!.text, css: globalCss + "\n" + bundle.outputFiles.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n") };
})();
async function fixture(options: BrowserContextOptions = {}, installClock = false) {
  const context = await (await browser).newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", ...options });
  const page = await context.newPage(); const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await fixtureFiles).js });
    if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: (await fixtureFiles).css });
    if (url.pathname.startsWith("/banners/") || url.pathname.startsWith("/brand/")) {
      const file = resolve("public", "." + url.pathname);
      if (!file.startsWith(resolve("public") + "/") && !file.startsWith(resolve("public") + "\\")) return route.abort();
      return route.fulfill({ contentType: file.endsWith(".svg") ? "image/svg+xml" : "image/webp", body: await readFile(file) });
    }
    if (url.pathname !== "/") return route.abort();
    return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0}#root>section:first-child{padding-top:16px!important}#root>section:not(:first-child){display:none}#root{padding-bottom:1400px}</style><div id="root"></div><script>window.clicked=[];document.addEventListener('click',event=>{const link=event.target.closest('a');if(link&&!event.defaultPrevented){window.clicked.push(link.getAttribute('href'));event.preventDefault()}})</script><script src="/fixture.js"></script></html>` });
  });
  await fixtureFiles;
  if (installClock) await page.clock.install();
  await page.goto(origin, { waitUntil: "domcontentloaded" }); const campaign = page.getByRole("region", { name: "Campanhas da Wimifarma" }); await expect(campaign).toBeVisible();
  await expect.poll(() => campaign.locator('[data-active="true"] img:visible').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  return { page, context, campaign, errors };
}

test("banner compacto não exibe controles e conserva imagens, marca e texto em seis larguras", async () => {
  const { page, context, campaign, errors } = await fixture();
  try {
    await expect(campaign.getByRole("button")).toHaveCount(0);
    for (const width of [320, 390, 768, 1024, 1280, 1920]) {
      await page.setViewportSize({ width, height: 950 });
      const rect = await campaign.boundingBox(); assert(rect && rect.height <= 305);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await expect(campaign.getByRole("heading", { name: "Seu cuidado, todo dia." })).toBeVisible();
      await expect(campaign.getByRole("img", { name: "Wimifarma", exact: true })).toBeVisible();
      assert.equal(await campaign.getByRole("link", { name: /Ver produtos/ }).evaluate(element => element.scrollWidth <= element.clientWidth), true);
      if (captureRoot && [320, 390, 1280].includes(width)) {
        await mkdir(captureRoot, { recursive: true });
        await campaign.screenshot({ path: join(captureRoot, `banner-care-${width}.png`) });
        await page.locator("#root>section:first-child").screenshot({ path: join(captureRoot, `atalhos-banner-${width}.png`) });
      }
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("mouse arrasta inclusive sobre CTA sem navegação acidental; clique e teclado continuam funcionais", async () => {
  const { page, context, campaign, errors } = await fixture();
  try {
    const cta = campaign.getByRole("link", { name: /Ver produtos/ }); const box = await cta.boundingBox(); assert(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 110, box.y + box.height / 2, { steps: 8 }); await page.mouse.up();
    await expect(campaign.getByRole("heading", { name: "Carinho em cada cuidado." })).toBeVisible();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { clicked: string[] }).clicked), []);
    await campaign.focus(); await page.keyboard.press("ArrowRight");
    await expect(campaign.getByRole("heading", { name: "Seu cuidado, todo dia." })).toBeVisible();
    await campaign.getByRole("link", { name: /Ver produtos/ }).click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { clicked: string[] }).clicked), ["/catalogo"]);
    await cta.focus(); await page.keyboard.press("ArrowRight");
    await expect(campaign).toBeFocused();
    await expect(campaign.getByRole("link", { name: /Ver perfumaria/ })).toBeVisible();
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("toque horizontal troca o banner e gesto vertical preserva a rolagem da página", async () => {
  const { page, context, campaign, errors } = await fixture({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true });
  try {
    const box = await campaign.boundingBox(); assert(box); const client = await context.newCDPSession(page);
    const y = box.y + 90;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 330, y }] });
    for (const x of [305, 270, 230, 180]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(campaign.getByRole("heading", { name: "Beleza no seu momento." })).toBeVisible();
    if (captureRoot) await campaign.screenshot({ path: join(captureRoot, "banner-beauty-390.png") });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 330, y: box.y + 210 }] });
    for (const dy of [30, 70, 120]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 330, y: box.y + 210 - dy }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
    await expect(campaign.getByRole("heading", { name: "Beleza no seu momento." })).toHaveCount(1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("troca automática respeita foco, movimento reduzido e visibilidade", async () => {
  const { page, context, campaign, errors } = await fixture({ reducedMotion: "no-preference" }, true);
  try {
    await page.mouse.move(0, 0);
    await expect(campaign).toHaveAttribute("data-auto-rotate", "true");
    const box = await campaign.boundingBox(); assert(box);
    await page.mouse.move(box.x + box.width - 4, box.y + box.height - 4); await page.mouse.down();
    await page.mouse.move(box.x + box.width + 1, box.y + box.height + 6); await page.mouse.up();
    await campaign.evaluate(element => (element as HTMLElement).blur());
    await page.mouse.move(0, 0);
    await expect(campaign).toHaveAttribute("data-auto-rotate", "true");
    await page.clock.runFor(6700);
    await expect(campaign.getByRole("heading", { name: "Beleza no seu momento." })).toBeVisible();
    await campaign.focus();
    await expect(campaign).toHaveAttribute("data-auto-rotate", "false");
    await page.clock.runFor(15000);
    await expect(campaign.getByRole("heading", { name: "Beleza no seu momento." })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" }); await campaign.evaluate(element => (element as HTMLElement).blur());
    await expect(campaign).toHaveAttribute("data-auto-rotate", "false");
    await page.clock.runFor(15000);
    await expect(campaign.getByRole("heading", { name: "Beleza no seu momento." })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(campaign).toHaveAttribute("data-auto-rotate", "true");
    await page.clock.runFor(6700);
    await expect(campaign.getByRole("heading", { name: "Carinho em cada cuidado." })).toBeVisible();
    if (captureRoot) await campaign.screenshot({ path: join(captureRoot, "banner-baby-1280.png") });
    await page.evaluate(() => scrollTo(0, 1800));
    await expect(campaign).toHaveAttribute("data-auto-rotate", "false");
    await page.clock.runFor(15000);
    await expect(campaign.getByRole("heading", { name: "Carinho em cada cuidado." })).toHaveCount(1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
