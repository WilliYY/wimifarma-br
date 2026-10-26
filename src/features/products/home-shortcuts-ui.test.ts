import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { build } from "esbuild";
import { chromium, expect, type BrowserContextOptions } from "@playwright/test";
import { buildHomeShortcuts } from "./home-shortcuts";

const items = buildHomeShortcuts().map(item => ({ ...item, imageUrl: `/uploads/products/${item.id}.webp` }));
const browser = chromium.launch();
after(async () => (await browser).close());
const content = (async () => {
  const css = await readFile("src/components/site/home-shortcuts.module.css", "utf8");
  const classes = Object.fromEntries([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => [match[1], match[1]]));
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {HomeShortcuts} from './src/components/site/home-shortcuts';createRoot(document.getElementById('root')).render(<HomeShortcuts items={${JSON.stringify(items)}}/>);`, loader: "tsx", resolveDir: process.cwd() },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "shortcuts-fixture", setup(builder) {
      builder.onResolve({ filter: /^next\/(link|image)$|home-shortcuts\.module\.css$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith(".css") ? `export default ${JSON.stringify(classes)}` : args.path.endsWith("link") ? "import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props)}" : "import React from 'react';export default function Image({sizes,quality,unoptimized,...props}){return React.createElement('img',props)}", resolveDir: process.cwd() }));
    } }],
  });
  return {
    script: bundle.outputFiles[0].text,
    html: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--line:#e1e5ec;--surface:#fff;--surface-subtle:#f6f7f9;--ink:#111827;--muted:#64748b;--brand:#cf0a2c;--brand-strong:#b50825;--brand-soft:#fff1f3}*{box-sizing:border-box}body{margin:0;font:16px Arial}a{color:inherit;text-decoration:none}button{font:inherit}main{max-width:1280px;margin:auto;padding:20px 16px}${css}</style><main><div id="root"></div></main><div style="height:1600px"></div><script src="/fixture.js"></script>`,
  };
})();

async function fixture(options: BrowserContextOptions = {}, failImages = false) {
  const context = await (await browser).newContext(options);
  const page = await context.newPage();
  const data = await content;
  const navigations: string[] = [];
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: data.script });
    if (url.pathname.startsWith("/uploads/products/")) return failImages ? route.fulfill({ status: 404, body: "Missing" }) : route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect x="10" y="10" width="60" height="100" fill="#eab308"/></svg>' });
    if (url.pathname === "/catalogo" || url.pathname === "/ofertas") { navigations.push(url.pathname + url.search); return route.fulfill({ body: "Categoria selecionada" }); }
    return route.fulfill({ contentType: "text/html", body: data.html });
  });
  await page.goto("http://127.0.0.1:3197");
  return { page, context, navigations };
}

test("categorias circulares usam fotos e rolagem contida de 320 a 1440 px", async () => {
  const { page, context } = await fixture();
  try {
    for (const width of [320, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const list = page.locator("#home-shortcuts");
      await expect(list.getByRole("link")).toHaveCount(6);
      const circle = list.locator(".circle").first();
      await expect(circle).toBeVisible();
      const geometry = await circle.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight, radius: getComputedStyle(element).borderRadius }));
      assert.equal(geometry.width, geometry.height);
      assert.equal(geometry.radius, "50%");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await list.evaluate(element => element.scrollWidth > element.clientWidth), true);
      await expect(list.locator("img")).toHaveCount(6);
      for (const item of items) assert.equal(await list.getByRole("link", { name: item.label, exact: true }).getAttribute("href"), item.href);
    }
  } finally { await context.close(); }
});

test("arraste não navega; setas, teclado e clique abrem a categoria correta", async () => {
  const { page, context, navigations } = await fixture({ viewport: { width: 780, height: 844 }, reducedMotion: "reduce" });
  try {
    const list = page.locator("#home-shortcuts");
    const image = await list.locator("img").first().boundingBox();
    assert.ok(image);
    await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2);
    await page.mouse.down();
    await page.mouse.move(image.x - 70, image.y + image.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(60);
    assert.deepEqual(navigations, []);
    assert.equal(await list.getAttribute("data-dragging"), null);
    const before = await list.evaluate(element => element.scrollLeft);
    await page.getByRole("button", { name: "Ver próximas categorias" }).click();
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(before + 100);
    await list.focus();
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeLessThan(before + 100);
    await list.getByRole("link", { name: "Infantil", exact: true }).click();
    await expect.poll(() => navigations.length).toBe(1);
    assert.equal(navigations[0], "/catalogo?grupo=baby&ordem=preco-asc");
    await page.goto("http://127.0.0.1:3197");
    await page.getByRole("link", { name: "Ofertas", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => navigations.length).toBe(2);
    assert.equal(navigations[1], "/ofertas");
  } finally { await context.close(); }
});

test("toque rola categorias sem impedir a rolagem vertical da página", async () => {
  const { page, context, navigations } = await fixture({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const list = page.locator("#home-shortcuts");
    const box = await list.boundingBox();
    assert.ok(box);
    const session = await context.newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) => session.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const y = box.y + box.height / 2;
    await touch("touchStart", 310, y);
    for (let x = 290; x >= 90; x -= 20) await touch("touchMove", x, y);
    await touch("touchEnd", 90, y);
    await expect.poll(() => list.evaluate(element => element.scrollLeft)).toBeGreaterThan(60);
    assert.deepEqual(navigations, []);
    await touch("touchStart", 200, y);
    for (let delta = 20; delta <= 160; delta += 20) await touch("touchMove", 200, y - delta);
    await touch("touchEnd", 200, y - 160);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50);
  } finally { await context.close(); }
});

test("falha da imagem mantém ícone, nome, foco e destino; movimento reduzido é respeitado", async () => {
  const { page, context } = await fixture({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } }, true);
  try {
    const list = page.locator("#home-shortcuts");
    await expect(list.locator("img")).toHaveCount(0);
    const offers = list.getByRole("link", { name: "Ofertas", exact: true });
    await expect(offers.locator(".circle svg")).toHaveCount(1);
    assert.equal(await offers.getAttribute("href"), "/ofertas");
    await offers.focus();
    await expect(offers).toBeFocused();
    assert.equal(await list.evaluate(element => getComputedStyle(element).scrollBehavior), "auto");
  } finally { await context.close(); }
});
