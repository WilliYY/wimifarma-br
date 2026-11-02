import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";

const comment = "Comentário sintético completo. ".repeat(12);
async function fixture(externalCount = 5, purchases = true) {
  const css = await readFile("src/components/site/customer-reviews.module.css", "utf8");
  const classes = Object.fromEntries([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => [match[1], match[1]]));
  const reviews = purchases ? [{ id: "purchase", reviewerName: "Cliente anônimo", rating: 4, comment, productSlug: "produto-teste", productName: "Produto sintético", incentivized: true }] : [];
  const external = Array.from({ length: externalCount }, (_, i) => ({ id: `external-${i}`, source: "whatsapp", reviewerName: `Pessoa ${i}.`, rating: 5, comment: `Relato externo sintético ${i}.` }));
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CustomerReviews} from './src/components/site/customer-reviews';createRoot(document.getElementById('root')).render(<CustomerReviews reviews={${JSON.stringify(reviews)}}/>);`, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "review-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/link$|customer-reviews\.module\.css$|whatsapp-testimonials$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith(".css") ? `export default ${JSON.stringify(classes)}` : args.path.endsWith("link") ? "import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props)}" : `export const whatsappTestimonials=${JSON.stringify(external)}`, resolveDir: process.cwd() }));
  } }] });
  return { html: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--ink:#111827;--surface:#fff;--surface-subtle:#f5f6f8;--line:#e1e5eb;--brand:#cb0733;--brand-soft:#fff1f4;--muted:#64748b;--pharma-green:#237343}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}${css}</style><div id="root"></div><div style="height:1600px"></div><script src="/fixture.js"></script>`, script: bundle.outputFiles[0].text };
}

async function open(page: Page, externalCount = 5, purchases = true) {
  const content = await fixture(externalCount, purchases);
  await page.route("**/*", route => new URL(route.request().url()).pathname === "/fixture.js" ? route.fulfill({ contentType: "text/javascript", body: content.script }) : route.fulfill({ contentType: "text/html", body: content.html }));
  await page.goto("http://127.0.0.1:3211");
  await expect(page.locator("#customer-reviews-carousel")).toBeVisible();
}

test("reviews are compact at desktop/mobile, preserve full content and expose only original cards", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await open(page);
    const list = page.locator("#customer-reviews-carousel");
    await expect(page.getByRole("button", { name: /avaliações/i })).toHaveCount(0);
    await expect(list).toHaveAttribute("data-looping", "true");
    await expect(list.getByRole("group")).toHaveCount(6);
    await expect(page.getByRole("link", { name: "Produto sintético" })).toHaveCount(1);
    await expect(page.getByText("Compra verificada", { exact: true })).toHaveCount(3);
    const card = list.locator('[data-copy="original"] [data-review-card]').first();
    assert.equal(await card.locator("blockquote").textContent(), `“${comment}”`);
    await expect(card).toContainText("Avaliação com incentivo de cashback, independente da nota.");
    await expect(card).toContainText("Cliente anônimo");
    await expect(card.locator('[aria-label="4,0 de 5 estrelas"]')).toHaveCount(1);
    assert.equal(await list.locator('[aria-hidden="true"] a:not([tabindex="-1"])').count(), 0);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await card.evaluate(el => ({ width: el.getBoundingClientRect().width, padding: getComputedStyle(el).paddingLeft, commentHeight: el.querySelector("blockquote")!.scrollHeight, visibleHeight: el.querySelector("blockquote")!.clientHeight }));
      assert.ok(geometry.width >= 280 && geometry.width <= 320, `${width}: card width ${geometry.width}`);
      assert.equal(geometry.padding, "16px");
      assert.equal(geometry.commentHeight, geometry.visibleHeight);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await expect(page.getByRole("link", { name: "Avaliar minhas compras" })).toHaveAttribute("href", "/minha-conta/avaliacoes");
    await expect(page.getByRole("link", { name: "Produto sintético" })).toHaveAttribute("href", "/produto/produto-teste");
    if (process.env.CUSTOMER_REVIEWS_SCREENSHOTS === "1") {
      const preview = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      await open(preview, 8, false);
      await mkdir("outputs/reviews-compact-2026-11-02", { recursive: true });
      for (const width of [1440, 390]) {
        await preview.setViewportSize({ width, height: 1000 });
        await preview.locator("section").screenshot({ path: `outputs/reviews-compact-2026-11-02/fixture-${width}.png` });
      }
    }
  } finally { await browser.close(); }
});

test("reviews move fractionally at 24px/s, cross the seam and pause for hover/focus/visibility/reduced motion", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 1000 } });
    await open(page);
    const list = page.locator("#customer-reviews-carousel");
    const track = list.locator("ul");
    const first = list.locator('[data-copy="original"]').first();
    await expect(track).toHaveAttribute("data-moving", "true");
    const samples = await first.evaluate(async el => {
      const positions: number[] = []; let scrolls = 0;
      const start = performance.now();
      const controller = new AbortController();
      el.parentElement!.parentElement!.addEventListener("scroll", () => { scrolls++; }, { signal: controller.signal });
      for (let i = 0; i < 25; i++) { await new Promise(requestAnimationFrame); positions.push(el.getBoundingClientRect().x); }
      controller.abort();
      return { positions, scrolls, elapsed: performance.now() - start };
    });
    assert.ok(samples.positions[0] - samples.positions.at(-1)! > 3);
    const speed = (samples.positions[0] - samples.positions.at(-1)!) / (samples.elapsed / 1000);
    assert.ok(speed > 18 && speed < 30, `24px/s motion measured ${speed.toFixed(1)}px/s`);
    assert.ok(samples.positions.some(x => Math.abs(x - Math.round(x)) > 0.05));
    assert.ok(samples.scrolls < 3);
    await list.hover();
    await expect(track).not.toHaveAttribute("data-moving", "true");
    const x = await first.evaluate(el => el.getBoundingClientRect().x);
    await page.waitForTimeout(180);
    assert.equal(await first.evaluate(el => el.getBoundingClientRect().x), x);
    const cycle = await first.evaluate(el => (el as HTMLElement).offsetLeft - (el.parentElement!.firstElementChild as HTMLElement).offsetLeft);
    const seam = await list.evaluate((el, value) => { el.scrollLeft = value * 2 + 30; return el.querySelector('[data-copy="after"]')!.getBoundingClientRect().x; }, cycle);
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBe(cycle + 30);
    assert.equal(await first.evaluate(el => el.getBoundingClientRect().x), seam);
    const leftSeam = await list.evaluate((el, value) => { el.scrollLeft = value - 30; return [...el.querySelectorAll('[data-copy="before"]')].at(-1)!.getBoundingClientRect().x; }, cycle);
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBe(cycle * 2 - 30);
    assert.equal(await list.locator('[data-copy="original"]').last().evaluate(el => el.getBoundingClientRect().x), leftSeam);
    await page.mouse.move(779, 990);
    await list.focus();
    await expect(track).not.toHaveAttribute("data-moving", "true");
    await page.locator("#customer-reviews-title").click();
    await expect(track).toHaveAttribute("data-moving", "true");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(track).not.toHaveAttribute("data-moving", "true");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(track).toHaveAttribute("data-moving", "true");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(track).not.toHaveAttribute("data-moving", "true");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(track).toHaveAttribute("data-moving", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(track).not.toHaveAttribute("data-moving", "true");
  } finally { await browser.close(); }
});

test("mouse drag suppresses accidental clicks, while keyboard, product and review links work", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 1000 }, reducedMotion: "reduce" });
    await open(page);
    const list = page.locator("#customer-reviews-carousel");
    const link = page.getByRole("link", { name: "Produto sintético" });
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox(); assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await list.evaluate(el => el.scrollLeft);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    assert.equal(new URL(page.url()).pathname, "/");
    assert.ok(await list.evaluate(el => el.scrollLeft) > before + 70);
    await list.focus();
    const keyboard = await list.evaluate(el => el.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).not.toBe(keyboard);
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/produto\/produto-teste$/);
    await page.goto("http://127.0.0.1:3211");
    await page.getByRole("link", { name: "Avaliar minhas compras" }).click();
    await expect(page).toHaveURL(/\/minha-conta\/avaliacoes$/);
  } finally { await browser.close(); }
});

test("reviews resume when a mouse press leaves vertically before drag capture and ends outside", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 780, height: 1000 } });
    await open(page);
    const list = page.locator("#customer-reviews-carousel");
    await expect(list.locator("ul")).toHaveAttribute("data-moving", "true");
    const box = await list.boundingBox(); assert.ok(box);
    await page.mouse.move(box.x + 10, box.y + box.height - 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 10, box.y + box.height + 20, { steps: 4 });
    await page.mouse.up();
    await page.locator("#customer-reviews-title").click();
    await page.mouse.move(779, 990);
    const first = list.locator('[data-copy="original"]').first();
    const stopped = await first.evaluate(el => el.getBoundingClientRect().x);
    await expect.poll(() => first.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(stopped - 5);
    assert.equal(await list.getAttribute("data-dragging"), null);
  } finally { await browser.close(); }
});

test("reviews retain native horizontal touch and vertical page scrolling", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    await open(page);
    const list = page.locator("#customer-reviews-carousel");
    const box = await list.boundingBox(); assert.ok(box);
    const session = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) => session.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const before = await list.evaluate(el => el.scrollLeft);
    const y = box.y + 80;
    await touch("touchStart", 320, y);
    for (let x = 300; x >= 80; x -= 20) await touch("touchMove", x, y);
    await touch("touchEnd", 80, y);
    await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBeGreaterThan(before + 100);
    await touch("touchStart", 230, y);
    for (let i = 1; i <= 12; i++) await touch("touchMove", 230, y - i * 12);
    await touch("touchEnd", 230, y - 144);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50);
  } finally { await browser.close(); }
});

test("one fitting review has no copies or automatic loop; empty reviews keep the invitation", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await open(page, 1, false);
    await expect(page.locator("#customer-reviews-carousel")).toHaveAttribute("data-looping", "false");
    await expect(page.getByRole("group")).toHaveCount(1);
    await expect(page.locator('[data-copy="before"], [data-copy="after"]')).toHaveCount(0);
    await page.unrouteAll();
    const content = await fixture(0, false);
    await page.route("**/*", route => new URL(route.request().url()).pathname === "/fixture.js" ? route.fulfill({ contentType: "text/javascript", body: content.script }) : route.fulfill({ contentType: "text/html", body: content.html }));
    await page.goto("http://127.0.0.1:3211");
    await expect(page.getByText("Sua experiência tem espaço aqui.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Avaliar minhas compras" })).toBeVisible();
  } finally { await browser.close(); }
});
