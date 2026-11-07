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
    stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {renderToString} from 'react-dom/server.browser';import {HomeMediaGallery} from './src/components/site/home-media-gallery';import {homeMediaItems} from './src/features/home-media/items';globalThis.renderGalleryMarkup=()=>renderToString(<HomeMediaGallery/>);const items=location.search.includes('gif')?[{...homeMediaItems[0],id:'gif-fixture',kind:'gif',continuousPreview:false,src:'/media/home/fixture.gif'}]:undefined;createRoot(document.getElementById('root')).render(<HomeMediaGallery items={items}/>);", loader: "tsx", resolveDir: process.cwd() },
    bundle: true, write: false, outfile: "fixture.js", platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "media-gallery-image", setup(builder) {
      builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default function Image({fill,priority,quality,unoptimized,sizes,style,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>}", loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  return { js: bundle.outputFiles.find(file => file.path.endsWith(".js"))!.text, css: css + "\n" + bundle.outputFiles.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n") };
})();

async function fixture(options: BrowserContextOptions = {}, configuration: { saveData?: boolean; gif?: boolean; clock?: boolean; markup?: string } = {}) {
  const context = await (await browser).newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", ...options });
  if (configuration.saveData) await context.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) }));
  const page = await context.newPage();
  if (configuration.clock) {
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    // Freeze before rendering so I/O and CPU delays cannot advance preview rounds.
    await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
  }
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
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0}#root{padding-bottom:1400px}</style><div id="root">' + (configuration.markup ?? "") + '</div><script src="/fixture.js"></script></html>' });
  });
  await files;
  await page.goto(origin + (configuration.gif ? "/?gif" : ""), { waitUntil: "domcontentloaded" });
  const gallery = page.getByRole("region", { name: "Vídeos e novidades da Wimifarma" });
  await expect(gallery).toBeVisible();
  return { page, context, gallery, errors, videoRequests };
}

test("mídias mantêm quadros 3:4 e enquadramento inteiro, sem overflow em seis larguras", async () => {
  const { page, context, gallery, errors, videoRequests } = await fixture();
  try {
    await expect(gallery.locator("[data-media-card]")).toHaveCount(homeMediaItems.length);
    assert.equal(homeMediaItems[2].id, "wimifarma-institucional");
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
      assert.equal(await gallery.locator("img, video").evaluateAll(media => media.every(element => getComputedStyle(element).objectFit === "contain")), true);
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

test("institucional permanece contínuo enquanto as outras prévias alternam a cada três segundos", async () => {
  const { page, context, gallery, errors } = await fixture({ reducedMotion: "no-preference" }, { clock: true });
  try {
    await expect.poll(() => gallery.locator('video[data-playing="true"]').count()).toBeGreaterThan(0);
    assert((await gallery.locator('video[data-playing="true"]').count()) <= 2);
    const firstRotatingItem = homeMediaItems.find(item => item.kind === "video" && item.id !== "wimifarma-institucional")!;
    const firstVideo = gallery.locator(`[data-media-id="${firstRotatingItem.id}"] video`);
    await expect(firstVideo).toHaveAttribute("data-playing", "true");
    const visibleIds = await gallery.locator("[data-media-frame]").evaluateAll(elements => elements.filter(element => {
      const box = element.getBoundingClientRect();
      return Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0)) / box.width >= 0.45;
    }).map(element => (element as HTMLElement).dataset.mediaId!));
    const institutionalId = "wimifarma-institucional";
    assert(visibleIds.includes(institutionalId));
    const continuousIds = homeMediaItems.filter(item => item.kind === "gif" && item.continuousPreview).slice(0, 2).map(item => item.id);
    const videoIds = visibleIds.filter(id => !continuousIds.includes(id));
    const rotatingIds = videoIds.filter(id => id !== institutionalId);
    const institutional = gallery.locator(`[data-media-id="${institutionalId}"] video`);
    await expect(institutional).toHaveAttribute("data-playing", "true");
    const metadata = await institutional.evaluate(element => {
      const video = element as HTMLVideoElement;
      return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    });
    assert(Math.abs(metadata.duration - 6) < 0.05, "as seis cenas duram um segundo cada");
    assert.deepEqual([metadata.width, metadata.height], [540, 720], "o arquivo preenche o card 3:4 sem recorte");
    await institutional.evaluate(element => {
      const counters = window as Window & { institutionalPauses?: number; excessPlayback?: number };
      counters.institutionalPauses = 0;
      counters.excessPlayback = 0;
      element.addEventListener("pause", () => { counters.institutionalPauses = (counters.institutionalPauses ?? 0) + 1; });
      document.querySelectorAll("video").forEach(video => video.addEventListener("play", () => {
        if (Array.from(document.querySelectorAll("video")).filter(media => !media.paused).length > 2) counters.excessPlayback = (counters.excessPlayback ?? 0) + 1;
      }));
    });
    const seen = new Set<string>();
    for (let turn = 0; turn <= rotatingIds.length; turn++) {
      const expected = videoIds.filter(id => id === institutionalId || id === rotatingIds[turn % rotatingIds.length]);
      await expect.poll(() => gallery.locator('video[data-playing="true"]').evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!))).toEqual(expected);
      const active = await gallery.locator('video[data-playing="true"]').evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!));
      assert(active.length <= 2);
      active.forEach(id => seen.add(id));
      await page.clock.runFor(3100);
      const next = videoIds.filter(id => id === institutionalId || id === rotatingIds[(turn + 1) % rotatingIds.length]);
      await expect.poll(() => gallery.locator('video[data-playing="true"]').evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!))).toEqual(next);
      if (turn === 0) {
        await expect(firstVideo).toHaveAttribute("src", firstRotatingItem.src);
        await expect(firstVideo).toHaveAttribute("data-ready", "true");
        const position = await firstVideo.evaluate(element => (element as HTMLVideoElement).currentTime);
        await page.clock.runFor(100);
        assert.equal(await firstVideo.evaluate(element => (element as HTMLVideoElement).currentTime), position, "a prévia inativa preserva sua posição");
      }
    }
    assert(videoIds.every(id => seen.has(id)), "todas as prévias de vídeo visíveis recebem sua vez");
    assert.equal(await page.evaluate(() => (window as Window & { institutionalPauses?: number }).institutionalPauses), 0, "o institucional não pausa entre rodadas");
    assert.equal(await page.evaluate(() => (window as Window & { excessPlayback?: number }).excessPlayback), 0, "nenhuma transição reproduz mais de dois vídeos");
    const hoveredFrame = gallery.locator(`[data-media-id="${rotatingIds[1]}"]`);
    await hoveredFrame.hover();
    await expect(hoveredFrame.locator("video")).toHaveAttribute("data-playing", "true");
    await expect(institutional).toHaveAttribute("data-playing", "true");
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(2);
    const pinned = await gallery.locator('video[data-playing="true"]').evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!).join(","));
    await page.clock.runFor(6200);
    assert.equal(await gallery.locator('video[data-playing="true"]').evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!).join(",")), pinned);
    assert((await gallery.locator('video[data-playing="true"]').count()) <= 2);
    await institutional.hover();
    await expect(hoveredFrame.locator("video")).toHaveAttribute("data-playing", "true");
    await expect(institutional).toHaveAttribute("data-playing", "true");
    await page.mouse.move(0, 850);
    await gallery.getByRole("link").first().focus();
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    await rail.focus();
    await page.keyboard.press("Escape");
    await rail.evaluate(element => element.blur());
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    assert((await gallery.locator("video[src]").count()) > 0);
    await rail.focus();
    await page.keyboard.press("Escape");
    await rail.evaluate(element => element.blur());
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(2);
    await page.evaluate(() => scrollTo(0, 1800));
    await expect(gallery.locator("video[src]")).toHaveCount(0);
    await expect(gallery.locator('video[data-ready="true"]')).toHaveCount(0);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(gallery.locator("video[src]")).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(gallery.locator("video[src]")).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("prévia visível pausa em quadro real e retoma da posição conservada", async () => {
  const { page, context, gallery, errors } = await fixture({ reducedMotion: "no-preference" });
  try {
    const rotatingItems = homeMediaItems.filter(item => item.kind === "video" && item.id !== "wimifarma-institucional");
    const firstFrame = gallery.locator(`[data-media-id="${rotatingItems[0].id}"]`);
    const firstVideo = firstFrame.locator("video");
    await firstFrame.hover();
    await expect.poll(() => firstVideo.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.15);
    await gallery.locator(`[data-media-id="${rotatingItems[1].id}"]`).hover();
    await expect(firstVideo).toHaveAttribute("data-playing", "false");
    await expect(firstVideo).toHaveAttribute("data-ready", "true");
    const position = await firstVideo.evaluate(element => (element as HTMLVideoElement).currentTime);
    assert(position > 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await firstVideo.evaluate(element => (element as HTMLVideoElement).currentTime), position);
    await firstFrame.hover();
    await expect(firstVideo).toHaveAttribute("data-playing", "true");
    assert((await firstVideo.evaluate(element => (element as HTMLVideoElement).currentTime)) >= position);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("os dois primeiros cards animam sem hover e sem consumir vagas de vídeo", async () => {
  const { context, gallery, errors } = await fixture({ reducedMotion: "no-preference" });
  try {
    for (const index of [0, 1]) {
      const frame = gallery.locator("[data-media-frame]").nth(index);
      const animation = frame.locator('img[aria-hidden="true"]');
      await expect(animation).toBeVisible();
      await expect(animation).toHaveAttribute("src", homeMediaItems[index].src);
      await expect.poll(() => animation.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
      await expect(frame.locator("video")).toHaveCount(0);
      await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(2);
      const snapshot = await animation.screenshot();
      await expect.poll(async () => !(await animation.screenshot()).equals(snapshot)).toBe(true);
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("animações contínuas conservam o mesmo elemento e fonte durante as rodadas", async () => {
  const { page, context, gallery, errors } = await fixture({ reducedMotion: "no-preference" }, { clock: true });
  try {
    const animations = gallery.locator('img[aria-hidden="true"]');
    await expect(animations).toHaveCount(2);
    await animations.evaluateAll(elements => elements.forEach(element => element.setAttribute("data-fixture-retained", "true")));
    for (let turn = 0; turn < 4; turn++) {
      await page.clock.runFor(3100);
      await expect(animations).toHaveCount(2);
      for (const [index, item] of homeMediaItems.slice(0, 2).entries()) {
        await expect(animations.nth(index)).toHaveAttribute("src", item.src);
        await expect(animations.nth(index)).toHaveAttribute("data-fixture-retained", "true");
      }
      assert((await gallery.locator('video[data-playing="true"]').count()) <= 2);
    }
    await gallery.locator("h2").hover();
    await page.clock.runFor(6200);
    await expect(animations).toHaveCount(2);
    await gallery.getByRole("link").first().focus();
    await expect(animations).toHaveCount(0);
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    await rail.focus();
    await page.keyboard.press("Escape");
    await rail.evaluate(element => element.blur());
    await expect(animations).toHaveCount(0);
    await rail.focus();
    await page.keyboard.press("Escape");
    await rail.evaluate(element => element.blur());
    await expect(animations).toHaveCount(2);
    await page.evaluate(() => scrollTo(0, 1800));
    await expect(animations).toHaveCount(0);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(animations).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(animations).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("institucional fora da tela preserva alternância de pares", async () => {
  const { page, context, gallery, errors } = await fixture({ reducedMotion: "no-preference" }, { clock: true });
  try {
    const institutional = gallery.locator('[data-media-id="wimifarma-institucional"]');
    await institutional.evaluate(element => { element.style.visibility = "hidden"; element.style.position = "absolute"; element.style.left = "-10000px"; });
    await expect(institutional.locator("video")).not.toHaveAttribute("src");
    const visibleIds = await gallery.locator("[data-media-frame]").evaluateAll(elements => elements.filter(element => {
      const box = element.getBoundingClientRect();
      return Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0)) / box.width >= 0.45;
    }).map(element => (element as HTMLElement).dataset.mediaId!));
    const continuousIds = homeMediaItems.filter(item => item.kind === "gif" && item.continuousPreview).slice(0, 2).map(item => item.id);
    const rotatingIds = visibleIds.filter(id => !continuousIds.includes(id));
    assert(!visibleIds.includes("wimifarma-institucional"));
    assert(rotatingIds.length > 2);
    for (let turn = 0; turn < rotatingIds.length; turn++) {
      const pair = [rotatingIds[(turn * 2) % rotatingIds.length], rotatingIds[(turn * 2 + 1) % rotatingIds.length]];
      await expect.poll(() => gallery.locator('video[data-playing="true"]').evaluateAll(elements => elements.map(element => element.closest<HTMLElement>("[data-media-id]")!.dataset.mediaId!))).toEqual(rotatingIds.filter(id => pair.includes(id)));
      await page.clock.runFor(3100);
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("economia de dados, aba oculta e movimento reduzido conservam pôsteres, inclusive GIF", async () => {
  const first = await fixture({ reducedMotion: "no-preference" }, { saveData: true });
  try {
    await expect(first.gallery.locator("video[src]")).toHaveCount(0);
    await expect(first.gallery.locator('img[aria-hidden="true"]')).toHaveCount(0);
    assert.deepEqual(first.videoRequests, []);
    await first.page.evaluate(() => {
      const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
      connection.saveData = false; connection.dispatchEvent(new Event("change"));
    });
    await expect(first.gallery.locator('video[data-playing="true"]')).toHaveCount(2);
    await expect(first.gallery.locator('img[aria-hidden="true"]')).toHaveCount(2);
    await expect(first.gallery.locator('[data-media-id="wimifarma-institucional"] video')).toHaveAttribute("data-playing", "true");
    await first.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(first.gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    await expect(first.gallery.locator("video[src]")).toHaveCount(0);
    await expect(first.gallery.locator('img[aria-hidden="true"]')).toHaveCount(0);
    await first.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(first.gallery.locator('video[data-playing="true"]')).toHaveCount(2);
    await expect(first.gallery.locator('img[aria-hidden="true"]')).toHaveCount(2);
    await first.page.evaluate(() => {
      const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
      connection.saveData = true; connection.dispatchEvent(new Event("change"));
    });
    await expect(first.gallery.locator("video[src]")).toHaveCount(0);
    await expect(first.gallery.locator('video[data-ready="true"]')).toHaveCount(0);
    await expect(first.gallery.locator('img[aria-hidden="true"]')).toHaveCount(0);
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
    await rail.evaluate(element => {
      const card = element.querySelector<HTMLElement>("[data-media-card]")!;
      const cycle = (card.offsetWidth + 14) * element.querySelectorAll("[data-media-card]").length;
      element.scrollLeft = cycle * 2 - element.clientWidth / 2 - 30;
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const beforeSeam = await rail.evaluate(element => element.scrollLeft);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y }] });
    for (const x of [275, 240, 195, 140]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeLessThan(beforeSeam);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 280, y: y + 40 }] });
    for (const dy of [25, 60, 105]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 280, y: y + 40 - dy }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("arraste mantém as prévias visíveis e libera a pausa de teclado sem clicar fora", async () => {
  const { page, context, gallery, errors } = await fixture({ reducedMotion: "no-preference" });
  try {
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    const animations = gallery.locator('img[aria-hidden="true"]');
    await expect(animations).toHaveCount(2);
    await animations.evaluateAll(elements => elements.forEach(element => element.setAttribute("data-retained", "true")));
    await rail.focus();
    await page.keyboard.press("ArrowRight");
    await expect(gallery.locator('video[data-playing="true"]')).toHaveCount(0);
    // Return to the first cards before testing the pointer modality.
    await rail.evaluate(element => element.scrollBy({ left: -element.clientWidth * .75, behavior: "instant" }));
    const box = await rail.boundingBox(); assert(box);
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 85, box.y + 100, { steps: 5 });
    await page.mouse.up();
    await expect(animations).toHaveCount(2);
    await expect.poll(() => gallery.locator('video[data-playing="true"]').count()).toBeGreaterThan(0);
    await animations.evaluateAll(elements => elements.forEach(element => element.setAttribute("data-retained", "true")));
    await page.mouse.down();
    await page.mouse.move(box.x + 75, box.y + 100, { steps: 5 });
    await page.mouse.up();
    await expect(gallery.locator('img[data-retained="true"]')).toHaveCount(2);
    assert.equal(new URL(page.url()).pathname, "/");
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("trilho circular atravessa os dois limites sem clones ou saltos dos cards visíveis", async () => {
  const { page, context, gallery, errors } = await fixture({ viewport: { width: 390, height: 850 } });
  try {
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    await gallery.locator("[data-media-card]").evaluateAll(elements => elements.forEach(element => element.setAttribute("data-retained", "true")));
    for (const direction of [1, -1]) {
      for (let step = 0; step < homeMediaItems.length * 5; step++) {
        const reference = await rail.evaluate((element, direction) => {
          const cards = [...element.querySelectorAll<HTMLElement>("[data-media-card]")];
          const bounds = element.getBoundingClientRect();
          const card = cards.find(card => { const rect = card.getBoundingClientRect(); return rect.left > bounds.left + 40 && rect.left < bounds.right - 40; })!;
          const before = card.getBoundingClientRect().left;
          element.scrollBy({ left: direction * 35, behavior: "instant" });
          return { id: card.querySelector<HTMLElement>("[data-media-id]")!.dataset.mediaId!, before };
        }, direction);
        await expect.poll(async () => Math.abs(await gallery.locator(`[data-media-id="${reference.id}"]`).evaluate(element => element.getBoundingClientRect().left) - reference.before + direction * 35)).toBeLessThan(2);
      }
    }
    await expect(gallery.locator('[data-media-card][data-retained="true"]')).toHaveCount(homeMediaItems.length);
    await expect(gallery.getByRole("link")).toHaveCount(homeMediaItems.length);
    await rail.focus();
    for (let index = 0; index < homeMediaItems.length; index++) {
      await page.keyboard.press("Tab");
      const link = gallery.getByRole("link").nth(index);
      await expect(link).toBeFocused();
      await expect.poll(() => link.evaluate(element => {
        const bounds = element.closest('[role="region"]')!.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        return { visible: rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1, left: rect.left, right: rect.right, width: bounds.width };
      })).toMatchObject({ visible: true });
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("passagem circular preserva fontes e elementos das duas animações ainda visíveis", async () => {
  const { context, gallery, errors } = await fixture({ reducedMotion: "no-preference" });
  try {
    const rail = gallery.getByRole("region", { name: "Explorar vídeos e animações" });
    await rail.evaluate(element => {
      const card = element.querySelector<HTMLElement>("[data-media-card]")!;
      const cycle = (card.offsetWidth + 14) * element.querySelectorAll("[data-media-card]").length;
      element.scrollLeft = cycle * 2 - element.clientWidth / 2 - 20;
    });
    const animations = gallery.locator('img[aria-hidden="true"]');
    await expect(animations).toHaveCount(2);
    await animations.evaluateAll(elements => elements.forEach(element => element.setAttribute("data-seam-retained", element.getAttribute("src")!)));
    const before = await rail.evaluate(element => element.scrollLeft);
    await rail.evaluate(element => element.scrollBy({ left: 40, behavior: "instant" }));
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeLessThan(before);
    await expect(gallery.locator('img[data-seam-retained]')).toHaveCount(2);
    assert(await animations.evaluateAll(elements => elements.every(element => element.getAttribute("data-seam-retained") === element.getAttribute("src"))));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("HTML renderizado no servidor mantém os cards lado a lado sem JavaScript", async () => {
  const renderer = await fixture();
  let markup: string;
  try {
    // The fixture bundle installs this bridge before mounting the gallery.
    markup = await renderer.page.evaluate(() => (window as unknown as { renderGalleryMarkup: () => string }).renderGalleryMarkup());
  } finally { await renderer.context.close(); }
  const { context, gallery, videoRequests, errors } = await fixture({ javaScriptEnabled: false, viewport: { width: 390, height: 850 } }, { markup });
  try {
    const cards = gallery.locator("[data-media-card]");
    await expect(cards).toHaveCount(homeMediaItems.length);
    const positions = await cards.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }));
    assert(positions.every((rect, index) => rect.width > 0 && (index === 0 || rect.left > positions[index - 1].right)), "o HTML sem hidratação precisa manter todos os cards em fluxo horizontal legível");
    await expect(gallery.getByRole("link")).toHaveCount(homeMediaItems.length);
    assert.deepEqual(videoRequests, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
