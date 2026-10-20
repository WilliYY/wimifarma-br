import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

async function fixture() {
  const brands = Array.from({ length: 14 }, (_, i) => ({ key: i ? `marca ${i}` : "nivea", name: i ? `Marca ${i}` : "Nivea", href: `/catalogo?marca=${i || "Nivea"}` }));
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {BrandCarousel} from './src/components/site/brand-carousel';createRoot(document.getElementById('root')).render(<BrandCarousel brands={${JSON.stringify(brands)}}/>);`, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "navigation-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/(link|image)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("link") ? "import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props)}" : "import React from 'react';export default function Image({onError,sizes,...props}){return React.createElement('img',{...props,src:'/logo.svg',onError})}", resolveDir: process.cwd() }));
  } }] });
  return { html: '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}section{padding:20px}nav{position:relative}ul{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding:0;list-style:none;touch-action:auto}li{flex-shrink:0;scroll-snap-align:start}li a{display:flex;width:140px;height:140px;align-items:center;justify-content:center}img{width:90px;height:90px}ul[data-dragging=true]{scroll-snap-type:none;scroll-behavior:auto}button{min-width:44px;min-height:44px}</style><div id="root"></div><script src="/fixture.js"></script>', script: bundle.outputFiles[0].text };
}

test("brands drag from a logo without navigating and retain clicks, keyboard and arrows", async () => {
  const content = await fixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 800 } });
    const navigations: string[] = [];
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: content.script });
      if (url.pathname === "/logo.svg") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><circle cx="45" cy="45" r="40" fill="blue"/></svg>' });
      if (url.pathname === "/catalogo") { navigations.push(url.search); return route.fulfill({ body: "Marca selecionada" }); }
      return route.fulfill({ contentType: "text/html", body: content.html });
    });
    await page.goto("http://127.0.0.1:3194");
    const list = page.locator("#home-brands-list");
    const logo = await list.locator("img").first().boundingBox();
    assert.ok(logo);
    await page.mouse.move(logo.x + logo.width / 2, logo.y + logo.height / 2);
    await page.mouse.down();
    await page.mouse.move(logo.x - 35, logo.y + logo.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(60);
    assert.deepEqual(navigations, []);
    assert.equal(await list.getAttribute("data-dragging"), null);
    const beforeArrow = await list.evaluate(element => element.scrollLeft);
    await page.getByRole("button", { name: "Ver próximas marcas" }).click();
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(beforeArrow + 100);
    await page.getByRole("link", { name: "Ver produtos de Nivea", exact: true }).click();
    await expect.poll(() => navigations.length).toBe(1);
    assert.equal(navigations[0], "?marca=Nivea");
    await page.goto("http://127.0.0.1:3194");
    await page.getByRole("link", { name: "Ver produtos de Nivea", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => navigations.length).toBe(2);
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
