import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import type { PublicBrand } from "./brands";

async function fixture(brands: PublicBrand[] = Array.from({ length: 14 }, (_, i) => ({ key: i ? `marca ${i}` : "nivea", name: i ? `Marca ${i}` : "Nivea", href: `/catalogo?marca=${i || "Nivea"}` }))) {
  const css = await readFile("src/components/site/brand-carousel.module.css", "utf8");
  const classes = Object.fromEntries([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => [match[1], match[1]]));
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {BrandCarousel} from './src/components/site/brand-carousel';createRoot(document.getElementById('root')).render(<BrandCarousel brands={${JSON.stringify(brands)}}/>);`, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "navigation-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/(link|image)$|brand-carousel\.module\.css$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith(".css") ? `export default ${JSON.stringify(classes)}` : args.path.endsWith("link") ? "import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props)}" : "import React from 'react';export default function Image({onError,sizes,...props}){return React.createElement('img',{...props,onError})}", resolveDir: process.cwd() }));
  } }] });
  return { html: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--ink:#111827;--surface:#fff;--surface-subtle:#f5f6f8;--line:#e1e5eb;--brand:#cb0733;--brand-strong:#b9002b;--brand-soft:#fff1f4;--muted:#64748b}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}button{font:inherit}${css}</style><div id="root"></div><script src="/fixture.js"></script>`, script: bundle.outputFiles[0].text };
}

test("brands drag from a logo without navigating and retain clicks and keyboard without arrow buttons", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 800 } });
    const navigations: string[] = [];
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: content.script });
      if (url.pathname.startsWith("/brands/")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><circle cx="45" cy="45" r="40" fill="blue"/></svg>' });
      if (url.pathname === "/catalogo") { navigations.push(url.search); return route.fulfill({ body: "Marca selecionada" }); }
      return route.fulfill({ contentType: "text/html", body: content.html });
    });
    await page.goto("http://127.0.0.1:3194");
    const list = page.locator("#home-brands-list");
    const logo = await list.locator('li[data-copy="original"] img').first().boundingBox();
    assert.ok(logo);
    await page.mouse.move(logo.x + logo.width / 2, logo.y + logo.height / 2);
    await page.mouse.down();
    await page.mouse.move(logo.x - 35, logo.y + logo.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(60);
    assert.deepEqual(navigations, []);
    assert.equal(await list.getAttribute("data-dragging"), null);
    await expect(page.getByRole("button")).toHaveCount(0);
    await list.focus();
    const beforeKeyboard = await list.evaluate(element => element.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(beforeKeyboard + 100);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeLessThan(beforeKeyboard + 20);
    await page.getByRole("link", { name: "Ver produtos de Nivea", exact: true }).click();
    await expect.poll(() => navigations.length).toBe(1);
    assert.equal(navigations[0], "?marca=Nivea");
    await page.goto("http://127.0.0.1:3194");
    await page.getByRole("link", { name: "Ver produtos de Nivea", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => navigations.length).toBe(2);
  } finally { await browser.close(); }
});

test("brands use names without product photos and retain names after logo errors", async () => {
  const content = await fixture([
    { key: "nivea", name: "Nivea", href: "/catalogo?marca=Nivea", imageUrl: "/uploads/products/package.webp" },
    { key: "sem logo", name: "Sem logo", href: "/catalogo?marca=Sem%20logo", imageUrl: "/uploads/products/another-package.webp" },
  ]);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const productRequests: string[] = [];
    await page.route("**/*", route => {
      const path = new URL(route.request().url()).pathname;
      if (path.startsWith("/uploads/products/")) productRequests.push(path);
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: content.script });
      if (path.startsWith("/brands/")) return route.fulfill({ status: 404, body: "Missing logo" });
      return route.fulfill({ contentType: "text/html", body: content.html });
    });
    await page.goto("http://127.0.0.1:3195");
    const missingLogo = page.getByRole("link", { name: "Ver produtos de Sem logo", exact: true });
    await expect(missingLogo).toHaveText("Sem logo");
    await expect(missingLogo.locator("img")).toHaveCount(0);
    const failedLogo = page.getByRole("link", { name: "Ver produtos de Nivea", exact: true });
    await expect(failedLogo).toHaveText("Nivea");
    await expect(failedLogo.locator("img")).toHaveCount(0);
    assert.equal(await failedLogo.getAttribute("href"), "/catalogo?marca=Nivea");
    assert.deepEqual(productRequests, []);
  } finally { await browser.close(); }
});

test("brands support a trusted touch swipe while the page remains vertically scrollable", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: content.html.replace('<script src="/fixture.js"></script>', '<div style="height:1600px"></div>') }));
    await page.goto("http://127.0.0.1:3193");
    await page.addScriptTag({ content: content.script });
    const list = page.locator("#home-brands-list");
    const box = await list.boundingBox();
    assert.ok(box);
    const session = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) => session.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const y = box.y + 70;
    await touch("touchStart", 320, y);
    for (let x = 300; x >= 80; x -= 20) await touch("touchMove", x, y);
    await touch("touchEnd", 80, y);
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
    await touch("touchStart", 230, y);
    for (let step = 1; step <= 12; step++) await touch("touchMove", 230, y - step * 12);
    await touch("touchEnd", 230, y - 144);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  } finally { await browser.close(); }
});

test("brands show only a centered title and move slowly in a continuous loop", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 800 } });
    await page.route("**/*", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: content.script });
      if (path.startsWith("/brands/")) return route.fulfill({ status: 404 });
      return route.fulfill({ contentType: "text/html", body: content.html });
    });
    await page.goto("http://127.0.0.1:3196");
    await expect(page.getByText("Explore por marca", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Perfumaria, medicamentos e mais para a sua rotina.", { exact: true })).toHaveCount(0);
    const list = page.locator("#home-brands-list");
    await expect(list).toHaveAttribute("data-looping", "true");
    assert.equal(await page.locator("#home-brands-title").evaluate(el => getComputedStyle(el).textAlign), "center");
    const firstBrand = list.locator('li[data-copy="original"]').first();
    const start = await firstBrand.evaluate(el => el.getBoundingClientRect().x);
    await expect.poll(() => firstBrand.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(start - 10);
    await list.hover();
    const stopped = await list.evaluate(el => el.scrollLeft);
    await page.waitForTimeout(300);
    assert.equal(await list.evaluate(el => el.scrollLeft), stopped);
    await expect(page.getByRole("link", { name: /^Ver produtos de / })).toHaveCount(14);
    const cycle = await list.locator('li[data-copy="original"]').first().evaluate(el => (el as HTMLElement).offsetLeft - (el.parentElement!.firstElementChild as HTMLElement).offsetLeft);
    const rightSeam = await list.evaluate((el, value) => {
      el.scrollLeft = value * 2 + 30;
      return el.querySelector('li[data-copy="after"]')!.getBoundingClientRect().x;
    }, cycle);
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBe(cycle + 30);
    assert.equal(await list.locator('li[data-copy="original"]').first().evaluate(el => el.getBoundingClientRect().x), rightSeam);
    const leftSeam = await list.evaluate((el, value) => {
      el.scrollLeft = value - 30;
      return [...el.querySelectorAll('li[data-copy="before"]')].at(-1)!.getBoundingClientRect().x;
    }, cycle);
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBe(cycle * 2 - 30);
    assert.equal(await list.locator('li[data-copy="original"]').last().evaluate(el => el.getBoundingClientRect().x), leftSeam);
  } finally { await browser.close(); }
});

test("automatic brand motion has fractional steps without scrolling every frame or a pause button", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 800 } });
    await page.route("**/*", route => new URL(route.request().url()).pathname === "/fixture.js" ? route.fulfill({ contentType: "text/javascript", body: content.script }) : route.fulfill({ contentType: "text/html", body: content.html }));
    await page.goto("http://127.0.0.1:3201");
    const list = page.locator("#home-brands-list");
    await expect(list).toHaveAttribute("data-looping", "true");
    await expect(page.getByRole("button", { name: /movimento das marcas/ })).toHaveCount(0);
    const motion = await list.evaluate(async element => {
      let scrolls = 0;
      const controller = new AbortController();
      element.addEventListener("scroll", () => { scrolls++; }, { signal: controller.signal });
      const positions: number[] = [];
      for (let frame = 0; frame < 30; frame++) {
        await new Promise(requestAnimationFrame);
        positions.push(element.querySelector('li[data-copy="original"]')!.getBoundingClientRect().x);
      }
      controller.abort();
      return { scrolls, positions };
    });
    assert.ok(motion.positions.at(-1)! < motion.positions[0] - 2, "brands keep advancing");
    assert.ok(motion.positions.some(x => Math.abs(x - Math.round(x)) > 0.05), "motion retains fractional pixels");
    assert.ok(motion.scrolls < 3, `automatic motion emitted ${motion.scrolls} scroll events`);
    for (const width of [390, 1440, 320]) {
      await page.setViewportSize({ width, height: 800 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const first = list.locator('li[data-copy="original"]').first();
      const x = await first.evaluate(el => el.getBoundingClientRect().x);
      await expect.poll(() => first.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(x - 3);
    }
  } finally { await browser.close(); }
});

test("brand motion pauses for hover, focus and offscreen, then resumes without taking focus", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 800 } });
    await page.route("**/*", route => new URL(route.request().url()).pathname === "/fixture.js" ? route.fulfill({ contentType: "text/javascript", body: content.script }) : route.fulfill({ contentType: "text/html", body: content.html.replace('<div id="root"></div>', '<div id="root"></div><div style="height:1600px"></div>') }));
    await page.goto("http://127.0.0.1:3199");
    const list = page.locator("#home-brands-list");
    await expect(list).toHaveAttribute("data-looping", "true");
    await list.hover();
    const hoverPosition = await list.evaluate(el => el.scrollLeft);
    const firstBrand = list.locator('li[data-copy="original"]').first();
    const hoverX = await firstBrand.evaluate(el => el.getBoundingClientRect().x);
    await page.waitForTimeout(300);
    assert.equal(await list.evaluate(el => el.scrollLeft), hoverPosition);
    await page.mouse.move(779, 700);
    await expect.poll(() => firstBrand.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(hoverX - 5);
    const original = page.getByRole("link", { name: "Ver produtos de Nivea", exact: true });
    await original.focus();
    const focusPosition = await list.evaluate(el => el.scrollLeft);
    const focusX = await firstBrand.evaluate(el => el.getBoundingClientRect().x);
    await page.waitForTimeout(300);
    assert.equal(await list.evaluate(el => el.scrollLeft), focusPosition);
    await expect(original).toBeFocused();
    await page.locator("#home-brands-title").click();
    await expect.poll(() => firstBrand.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(focusX - 5);
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
    await page.waitForTimeout(100);
    const offscreen = await list.evaluate(el => el.scrollLeft);
    const offscreenX = await firstBrand.evaluate(el => el.getBoundingClientRect().x);
    await page.waitForTimeout(300);
    assert.equal(await list.evaluate(el => el.scrollLeft), offscreen);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => firstBrand.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(offscreenX - 5);
  } finally { await browser.close(); }
});

test("visible loop copies remain clickable without receiving focus", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 800 }, reducedMotion: "reduce" });
    const navigations: string[] = [];
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: content.script });
      if (url.pathname === "/catalogo") { navigations.push(url.search); return route.fulfill({ body: "Marca selecionada" }); }
      return route.fulfill({ contentType: "text/html", body: content.html });
    });
    await page.goto("http://127.0.0.1:3200");
    const list = page.locator("#home-brands-list");
    await expect(list).toHaveAttribute("data-looping", "true");
    await list.evaluate(el => {
      const first = el.querySelector<HTMLElement>('li[data-copy="original"]')!;
      const before = el.querySelector<HTMLElement>('li[data-copy="before"]')!;
      el.scrollLeft = (first.offsetLeft - before.offsetLeft) * 2 - 50;
    });
    const copy = list.locator('li[data-copy="after"] a').first();
    const box = await copy.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    assert.equal(await page.evaluate(() => document.activeElement?.closest('li[aria-hidden="true"]') !== null), false);
    await page.mouse.up();
    await expect.poll(() => navigations.length).toBe(1);
    assert.equal(navigations[0], "?marca=Nivea");
  } finally { await browser.close(); }
});

test("brands keep full width, one keyboard sequence and manual navigation with reduced motion", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.route("**/*", route => {
      if (new URL(route.request().url()).pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: content.script });
      return route.fulfill({ contentType: "text/html", body: content.html });
    });
    await page.goto("http://127.0.0.1:3197");
    for (const width of [320, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      const layout = await page.locator("#marcas").evaluate(el => ({ width: el.getBoundingClientRect().width, pageWidth: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, centered: getComputedStyle(el.querySelector("h2")!).textAlign }));
      assert.equal(layout.width, layout.pageWidth);
      assert.equal(layout.overflow, false);
      assert.equal(layout.centered, "center");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: /movimento das marcas/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Ver produtos de / })).toHaveCount(14);
    const list = page.locator("#home-brands-list");
    await expect(list).toHaveAttribute("data-looping", "true");
    const before = await list.evaluate(el => el.scrollLeft);
    await page.waitForTimeout(300);
    assert.equal(await list.evaluate(el => el.scrollLeft), before);
    await list.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBeGreaterThan(before + 100);
    assert.equal(await list.locator('li[aria-hidden="true"] a').evaluateAll(links => links.every(link => (link as HTMLAnchorElement).tabIndex === -1)), true);
  } finally { await browser.close(); }
});

test("short brand lists remain static without duplicate cards or empty controls", async () => {
  const content = await fixture([{ key: "nivea", name: "Nivea", href: "/catalogo?marca=Nivea" }]);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*", route => new URL(route.request().url()).pathname === "/fixture.js" ? route.fulfill({ contentType: "text/javascript", body: content.script }) : route.fulfill({ contentType: "text/html", body: content.html }));
    await page.goto("http://127.0.0.1:3198");
    await expect(page.locator("#home-brands-list")).toHaveAttribute("data-looping", "false");
    await expect(page.locator("#home-brands-list li")).toHaveCount(1);
    await expect(page.getByRole("button")).toHaveCount(0);
  } finally { await browser.close(); }
});
