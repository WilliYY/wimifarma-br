import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after } from "node:test";
import { build } from "esbuild";
import { chromium, expect, type BrowserContextOptions } from "@playwright/test";
import { buildHomeShortcuts } from "./home-shortcuts";

const items = buildHomeShortcuts().map(item => ({ ...item, imageUrl: `/uploads/products/${item.id}.webp` }));
const captureRoot = process.env.SHORTCUTS_CAPTURE_ROOT;
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
    html: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--line:#e1e5ec;--surface:#fff;--surface-subtle:#f6f7f9;--ink:#111827;--muted:#64748b;--brand:#cf0a2c;--brand-strong:#b50825;--brand-soft:#fff1f3}*{box-sizing:border-box}body{margin:0;font:16px Arial}a{color:inherit;text-decoration:none}button{font:inherit}main{width:100%;padding:20px 0}${css}</style><main><div id="root"></div></main><div style="height:1600px"></div><script src="/fixture.js"></script>`,
  };
})();

async function fixture(options: BrowserContextOptions = {}) {
  const context = await (await browser).newContext(options);
  const page = await context.newPage();
  const data = await content;
  const navigations: string[] = [];
  const photoRequests: string[] = [];
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: data.script });
    if (url.pathname.startsWith("/uploads/products/")) { photoRequests.push(url.pathname); return route.fulfill({ status: 404, body: "Photos are not part of category navigation" }); }
    if (url.pathname === "/catalogo" || url.pathname === "/ofertas") { navigations.push(url.pathname + url.search); return route.fulfill({ body: "Categoria selecionada" }); }
    return route.fulfill({ contentType: "text/html", body: data.html });
  });
  await page.goto("http://127.0.0.1:3197");
  return { page, context, navigations, photoRequests };
}

test("oito categorias circulares compactas ocupam a largura sem caixa ou overflow", async () => {
  const { page, context } = await fixture();
  try {
    for (const width of [320, 390, 768, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 844 });
      const list = page.locator("#home-shortcuts");
      await expect(list.getByRole("link")).toHaveCount(8);
      await expect(list.locator(".symbol > svg")).toHaveCount(8);
      await expect(list.locator("[data-category-ring]")).toHaveCount(24);
      const panel = page.getByRole("navigation", { name: "Categorias de produtos" });
      const geometry = await panel.evaluate(element => ({ width: element.getBoundingClientRect().width, x: element.getBoundingClientRect().x, viewport: document.documentElement.clientWidth, border: getComputedStyle(element).borderTopWidth, background: getComputedStyle(element).backgroundColor, shadow: getComputedStyle(element).boxShadow }));
      assert.ok(Math.abs(geometry.width - geometry.viewport) <= 1);
      assert.ok(Math.abs(geometry.x) <= 1);
      assert.equal(geometry.border, "0px");
      assert.equal(geometry.background, "rgba(0, 0, 0, 0)");
      assert.equal(geometry.shadow, "none");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await list.evaluate(element => element.scrollWidth > element.clientWidth), width < 1024);
      assert.ok((await panel.boundingBox())!.height <= 180, `altura em ${width}px`);
      const circle = await list.locator(".symbol").first().evaluate(element => ({ width: element.getBoundingClientRect().width, radius: getComputedStyle(element).borderRadius, border: getComputedStyle(element).borderTopWidth }));
      assert.ok(circle.width >= 52 && circle.width <= 76);
      assert.equal(circle.radius, "50%");
      assert.equal(circle.border, "0px");
      await expect(list.locator("img")).toHaveCount(0);
      for (const item of items) assert.equal(await list.getByRole("link", { name: item.label, exact: true }).getAttribute("href"), item.href);
      if (captureRoot) { await mkdir(captureRoot, { recursive: true }); await panel.screenshot({ path: join(captureRoot, `categories-${width}.png`), animations: "disabled" }); }
    }
  } finally { await context.close(); }
});

test("arraste não navega; setas, teclado e clique abrem a categoria correta", async () => {
  const { page, context, navigations } = await fixture({ viewport: { width: 780, height: 844 }, reducedMotion: "reduce" });
  try {
    const list = page.locator("#home-shortcuts");
    const image = await list.locator(".symbol").first().boundingBox();
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

test("ícones ignoram fotos recebidas e mantêm foco, destino e movimento reduzido", async () => {
  const { page, context, photoRequests } = await fixture({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  try {
    const list = page.locator("#home-shortcuts");
    await expect(list.locator("img")).toHaveCount(0);
    const offers = list.getByRole("link", { name: "Ofertas", exact: true });
    await expect(offers.locator(".symbol svg")).toHaveCount(1);
    assert.deepEqual(photoRequests, []);
    assert.equal(await offers.getAttribute("href"), "/ofertas");
    await offers.focus();
    await expect(offers).toBeFocused();
    assert.equal(await list.evaluate(element => getComputedStyle(element).scrollBehavior), "auto");
    assert.equal(await offers.locator(".symbol").evaluate(element => getComputedStyle(element).animationName), "none");
    assert.equal(await offers.locator(".symbol > svg").evaluate(element => getComputedStyle(element).animationName), "none");
    assert.equal(await offers.locator(".symbol").evaluate(element => element.getAnimations({ subtree: true }).length), 0);
  } finally { await context.close(); }
});

test("anéis giram apenas nas categorias visíveis e pausam fora da tela e em aba oculta", async () => {
  const { page, context } = await fixture({ viewport: { width: 1280, height: 844 }, reducedMotion: "no-preference" });
  try {
    const list = page.locator("#home-shortcuts");
    await expect(list).toHaveAttribute("data-motion", "active");
    await expect(list.locator('li[data-visible="true"]')).toHaveCount(8);
    const animations = await list.locator("[data-category-ring]").evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { duration: style.animationDuration, delay: style.animationDelay, state: style.animationPlayState };
    }));
    assert.equal(animations.length, 24);
    assert.equal(new Set(animations.map(item => item.duration)).size, 3);
    assert.equal(new Set(animations.map(item => item.delay)).size, 8);
    assert.ok(animations.every(item => item.state === "running"));
    const firstRing = list.locator("[data-category-ring]").first();
    const initialTransform = await firstRing.evaluate(element => getComputedStyle(element).transform);
    await expect.poll(() => firstRing.evaluate(element => getComputedStyle(element).transform)).not.toBe(initialTransform);
    assert.equal(await list.locator(".symbol > svg").first().evaluate(element => getComputedStyle(element).transform), "none");
    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(list).toHaveAttribute("data-motion", "paused");
    assert.equal(await list.locator("[data-category-ring]").first().evaluate(element => getComputedStyle(element).animationPlayState), "paused");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(list).toHaveAttribute("data-motion", "active");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(list).toHaveAttribute("data-motion", "paused");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(list).toHaveAttribute("data-motion", "active");
    await expect.poll(() => list.locator('li[data-visible="true"]').count()).toBeLessThan(8);
    await expect.poll(() => list.locator('li[data-visible="false"] [data-category-ring]').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationPlayState === "paused"))).toBe(true);
    const styles = await list.locator("[data-category-ring]").first().evaluate(element => ({ filter: getComputedStyle(element).filter, shadow: getComputedStyle(element).boxShadow, width: getComputedStyle(element).borderTopWidth }));
    assert.equal(styles.filter, "none"); assert.equal(styles.shadow, "none"); assert.ok(Number.parseFloat(styles.width) >= 1 && Number.parseFloat(styles.width) <= 1.5);
  } finally { await context.close(); }
});

test("anéis destacam mouse, foco e toque sem mudar a espessura", async () => {
  const desktop = await fixture({ viewport: { width: 1280, height: 844 }, reducedMotion: "reduce" });
  try {
    const link = desktop.page.getByRole("link", { name: "Infantil", exact: true });
    const ring = link.locator("[data-category-ring]").first();
    const width = await ring.evaluate(element => getComputedStyle(element).borderTopWidth);
    assert.equal(await ring.evaluate(element => getComputedStyle(element).opacity), "0.64");
    await link.hover();
    await expect.poll(() => ring.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
    assert.equal(await link.locator(".symbol").evaluate(element => getComputedStyle(element, "::after").opacity), "1");
    assert.equal(await ring.evaluate(element => getComputedStyle(element).borderTopWidth), width);
    if (captureRoot) await desktop.page.getByRole("navigation", { name: "Categorias de produtos" }).screenshot({ path: join(captureRoot, "categories-hover.png") });
    await desktop.page.mouse.move(0, 500);
    await link.focus();
    await expect.poll(() => ring.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
  } finally { await desktop.context.close(); }

  const mobile = await fixture({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  try {
    const link = mobile.page.getByRole("link", { name: "Infantil", exact: true });
    const box = await link.locator(".symbol").boundingBox();
    assert.ok(box);
    const session = await mobile.context.newCDPSession(mobile.page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect.poll(() => link.locator("[data-category-ring]").first().evaluate(element => getComputedStyle(element).opacity)).toBe("1");
    if (captureRoot) await mobile.page.getByRole("navigation", { name: "Categorias de produtos" }).screenshot({ path: join(captureRoot, "categories-touch.png") });
    await mobile.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    assert.equal(await link.evaluate(element => element.hasAttribute("data-pressed")), false);
    await mobile.page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => mobile.navigations).toEqual([items.find(item => item.id === "baby")!.href]);
  } finally { await mobile.context.close(); }
});

test("rotação dos 24 anéis não provoca layout por frame na amostra isolada", async () => {
  const { page, context } = await fixture({ viewport: { width: 1440, height: 844 }, reducedMotion: "no-preference" });
  try {
    await expect(page.locator('#home-shortcuts > li[data-visible="true"]')).toHaveCount(8);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const session = await context.newCDPSession(page);
    await session.send("Performance.enable");
    const before = new Map<string, number>((await session.send("Performance.getMetrics")).metrics.map(metric => [metric.name, metric.value]));
    const longTasks = await page.evaluate(async () => {
      const tasks: number[] = [];
      const observer = new PerformanceObserver(entries => tasks.push(...entries.getEntries().map(entry => entry.duration)));
      observer.observe({ entryTypes: ["longtask"] });
      await new Promise(resolve => setTimeout(resolve, 1200));
      observer.disconnect();
      return tasks;
    });
    const after = new Map<string, number>((await session.send("Performance.getMetrics")).metrics.map(metric => [metric.name, metric.value]));
    const evidence = { sampleMs: 1200, layoutCount: after.get("LayoutCount")! - before.get("LayoutCount")!, recalcStyleCount: after.get("RecalcStyleCount")! - before.get("RecalcStyleCount")!, taskDurationMs: (after.get("TaskDuration")! - before.get("TaskDuration")!) * 1000, longTasks };
    assert.equal(evidence.layoutCount, 0);
    if (captureRoot) await writeFile(join(captureRoot, "motion-performance.json"), JSON.stringify(evidence, null, 2));
  } finally { await context.close(); }
});
