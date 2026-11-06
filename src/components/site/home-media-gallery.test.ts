import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type BrowserContextOptions } from "@playwright/test";
import { homeMediaItems } from "@/features/home-media/items";

const origin = "http://127.0.0.1:3195";
const captureRoot = process.env.HOME_MEDIA_CAPTURE_ROOT;
const browser = chromium.launch();
after(async () => (await browser).close());
const files = (async () => {
  const css = await readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css);
  const bundle = await build({
    stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {HomeMediaGallery} from './src/components/site/home-media-gallery';import {homeMediaItems} from './src/features/home-media/items';const items=location.search.includes('gif')?[{...homeMediaItems[0],id:'gif-fixture',kind:'gif',src:'/media/home/fixture.gif'}]:undefined;createRoot(document.getElementById('root')).render(<HomeMediaGallery items={items}/>);", loader: "tsx", resolveDir: process.cwd() },
    bundle: true, write: false, outfile: "fixture.js", platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "media-gallery-image", setup(builder) {
      builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default function Image({fill,priority,quality,unoptimized,sizes,style,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>}", loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  return { js: bundle.outputFiles.find(file => file.path.endsWith(".js"))!.text, css: css + "\n" + bundle.outputFiles.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n") };
})();

async function fixture(options: BrowserContextOptions = {}, configuration: { saveData?: boolean; gif?: boolean; clock?: boolean } = {}) {
  const context = await (await browser).newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", ...options });
  if (configuration.saveData) await context.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) }));
  const page = await context.newPage();
  if (configuration.clock) await page.clock.install();
  const errors: string[] = [];
  const videoRequests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.endsWith(".mp4")) videoRequests.push(request.url()); });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await files).js });
    if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: (await files).css });
    if (url.pathname === "/catalogo") return route.fulfill({ contentType: "text/html", body: "Categoria sintética" });
    if (url.pathname === "/media/home/fixture.gif") return route.fulfill({ contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64") });
    if (url.pathname.startsWith("/media/home/")) {
      const path = resolve("public", "." + url.pathname);
      if (!path.startsWith(resolve("public") + sep)) return route.abort();
      return route.fulfill({ contentType: path.endsWith(".mp4") ? "video/mp4" : "image/webp", body: await readFile(path) });
    }
    if (url.pathname !== "/") return route.abort();
    return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0}#root{padding-bottom:1400px}</style><div id="root"></div><script src="/fixture.js"></script></html>' });
  });
  await files;
  await page.goto(origin + (configuration.gif ? "/?gif" : ""), { waitUntil: "domcontentloaded" });
  const gallery = page.getByRole("region", { name: "Vídeos e novidades da Wimifarma" });
  await expect(gallery).toBeVisible();
  return { page, context, gallery, errors, videoRequests };
}

test("mídias mantêm quadros 3:4 e enquadramento específico, sem overflow em seis larguras", async () => {
  const { page, context, gallery, errors, videoRequests } = await fixture();
  try {
    await expect(gallery.locator("[data-media-card]")).toHaveCount(homeMediaItems.length);
    await expect(gallery.getByRole("button")).toHaveCount(0);
    await expect(gallery.locator("svg")).toHaveCount(0);
    for (const width of [320, 390, 768, 1024, 1280, 1920]) {
      await page.setViewportSize({ width, height: 950 });
      const sizes = await gallery.locator("[data-media-frame]").evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      assert.equal(sizes.length, homeMediaItems.length);
      assert.equal(await gallery.locator("h2").evaluate(element => getComputedStyle(element.parentElement!).textAlign), "center");
      assert(sizes.every(size => Math.abs(size.width / size.height - 0.75) < 0.01));
      assert(sizes.every(size => Math.abs(size.height - sizes[0].height) < 1));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await gallery.locator("img, video").evaluateAll(media => media.every(element => getComputedStyle(element).objectFit === (element.closest("[data-media-id]")?.getAttribute("data-media-id") === "wimifarma-institucional" ? "cover" : "contain"))), true);
      if (captureRoot && [320, 390, 1280].includes(width)) {
        await mkdir(captureRoot, { recursive: true });
        await gallery.screenshot({ path: join(captureRoot, `media-gallery-${width}.png`) });
      }
    }
    assert.deepEqual(videoRequests, [], "movimento reduzido deve manter pôsteres sem baixar vídeos");
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("arraste não navega; clique e teclado seguem diretamente para a categoria", async () => {
  const { page, context, gallery, errors } = await fixture({ viewport: { width: 390, height: 850 } });
  try {
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    const first = gallery.getByRole("link", { name: "Ver vitaminas e suplementos", exact: true });
    await expect(first).toHaveAttribute("href", homeMediaItems[0].href);
    const box = await first.boundingBox(); assert(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assert.equal(new URL(page.url()).pathname, "/");
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(30);
    await rail.focus();
    const before = await rail.evaluate(element => element.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(before);
    await first.focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(origin + homeMediaItems[0].href);
    await page.goto(origin);
    await first.click();
    await expect(page).toHaveURL(origin + homeMediaItems[0].href);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("prévias alternam todos os itens visíveis, limitadas a duas, e pausam por interação e visibilidade", async () => {
  const { page, context, gallery, errors } = await fixture({ reducedMotion: "no-preference" }, { clock: true });
  try {
    await expect.poll(() => gallery.locator('video[data-playing="true"]').count()).toBeGreaterThan(0);
    assert((await gallery.locator('video[data-playing="true"]').count()) <= 2);
    await gallery.hover();
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    await page.mouse.move(0, 850);
    await expect.poll(() => gallery.locator('video[data-playing="true"]').count()).toBeGreaterThan(0);
    const visibleIds = await gallery.locator("[data-media-frame]").evaluateAll(elements => elements.filter(element => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }).map(element => (element as HTMLElement).dataset.mediaId!));
    const seen = new Set<string>();
    for (let pair = 0; pair < Math.ceil(visibleIds.length / 2); pair++) {
      const active = await gallery.locator("video[src]").evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!));
      assert(active.length <= 2);
      active.forEach(id => seen.add(id));
      await page.clock.runFor(5100);
      await expect.poll(() => gallery.locator("video[src]").evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!).join(","))).not.toBe(active.join(","));
    }
    assert(visibleIds.every(id => seen.has(id)), "todas as prévias visíveis recebem sua vez");
    await gallery.getByRole("link").first().focus();
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    await rail.focus();
    await page.keyboard.press("Escape");
    await rail.evaluate(element => element.blur());
    await expect(gallery.locator("video[src]")).toHaveCount(0);
    await rail.focus();
    await page.keyboard.press("Escape");
    await rail.evaluate(element => element.blur());
    await expect(gallery.locator("video[src]")).toHaveCount(2);
    await page.evaluate(() => scrollTo(0, 1800));
    await expect(gallery.locator("video[src]")).toHaveCount(0);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(gallery.locator("video[src]")).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(gallery.locator("video[src]")).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("economia de dados, aba oculta e movimento reduzido conservam pôsteres, inclusive GIF", async () => {
  const first = await fixture({ reducedMotion: "no-preference" }, { saveData: true });
  try {
    await expect(first.gallery.locator("video[src]")).toHaveCount(0);
    assert.deepEqual(first.videoRequests, []);
    await first.page.evaluate(() => {
      const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
      connection.saveData = false; connection.dispatchEvent(new Event("change"));
    });
    await expect.poll(() => first.gallery.locator('video[data-playing="true"]').count()).toBeGreaterThan(0);
    await first.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(first.gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    assert.deepEqual(first.errors, []);
  } finally { await first.context.close(); }
  const second = await fixture({}, { gif: true });
  try {
    await expect(second.gallery.locator('img[src$="fixture.gif"]')).toHaveCount(0);
    await second.page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(second.gallery.locator('img[src$="fixture.gif"]')).toBeVisible();
    await second.page.emulateMedia({ reducedMotion: "reduce" });
    await expect(second.gallery.locator('img[src$="fixture.gif"]')).toHaveCount(0);
    assert.deepEqual(second.errors, []);
  } finally { await second.context.close(); }
});

test("toque horizontal percorre as mídias e gesto vertical conserva a rolagem da página", async () => {
  const { page, context, gallery, errors } = await fixture({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true });
  try {
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    const rect = await rail.boundingBox(); assert(rect);
    const client = await context.newCDPSession(page);
    const y = rect.y + 100;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y }] });
    for (const x of [275, 240, 195, 140]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(30);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 280, y: y + 40 }] });
    for (const dy of [25, 60, 105]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 280, y: y + 40 - dy }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
