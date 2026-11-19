import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { chromium, expect, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3196";
const lane = "[data-header-cat-lane]";
const runner = "[data-header-cat-runner]";
const bubble = "[data-header-cat-bubble]";
let browserPromise: ReturnType<typeof chromium.launch> | undefined;
after(async () => { if (browserPromise) await (await browserPromise).close(); });
const cssPath = path.resolve("src/app/globals.css");
const css = fs.readFile(cssPath, "utf8").then(source => postcss([tailwindcss()]).process(source, { from: cssPath })).then(result => result.css);
const bundle = build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {HeaderCatRunner} from './src/components/site/header-cat-runner';const root=createRoot(document.getElementById('root'));window.renderCat=(compact=false)=>flushSync(()=>root.render(<HeaderCatRunner compact={compact}/>));window.unmountCat=()=>root.unmount();window.renderCat();`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});

async function fixture(width: number, reduced: boolean, run: (page: Page, gifRequests: string[]) => Promise<void>) {
  const browser = await (browserPromise ??= chromium.launch());
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    const gifRequests: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const [styles, script] = await Promise.all([css, bundle]);
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<meta charset="utf-8"><style>${styles}body{margin:0}[data-mock-controls]{display:flex;gap:8px;height:64px;align-items:center}nav{height:48px}</style><header><div data-mock-controls><button>Busca sintética</button><button>Conta sintética</button><button>Carrinho sintético</button></div><div id="root"></div><nav><a href="#catalogo">Catálogo sintético</a></nav></header><script type="module" src="/fixture.js"></script>` });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script.outputFiles[0].text });
      if (url.pathname.endsWith(".gif")) {
        gifRequests.push(url.pathname);
        return route.fulfill({ path: path.join(process.cwd(), "public", url.pathname) });
      }
      return route.abort();
    });
    await page.goto(origin);
    await expect(page.locator(lane)).toHaveCount(1);
    await run(page, gifRequests);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

async function expectRunning(page: Page) {
  await expect.poll(() => page.locator(runner).evaluate(el => el.getAnimations().filter(animation => animation.playState === "running").length)).toBe(1);
  await expect(page.locator(`${runner} img`)).toHaveCount(1);
}

async function expectSuspended(page: Page) {
  await expect.poll(() => page.locator(runner).evaluate(el => el.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  await expect(page.locator(bubble)).not.toHaveAttribute("data-visible", "true");
  await expect(page.locator(`${runner} img[src$='.gif']`)).toHaveCount(0);
}

async function seek(page: Page, fraction: number) {
  await page.locator(runner).evaluate((el, progress) => {
    const animation = el.getAnimations()[0];
    if (!animation) throw new Error("O gatinho precisa de uma animação ativa");
    animation.currentTime = Number(animation.effect!.getTiming().duration) * progress;
  }, fraction);
}

async function expectInsideLane(page: Page) {
  const track = await page.locator(runner).evaluate(el => {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement!.getBoundingClientRect();
    return { left: rect.left, right: rect.right, min: parent.left, max: parent.right };
  });
  assert.ok(track.left >= track.min - 1 && track.right <= track.max + 1, JSON.stringify(track));
  const balloon = await page.locator(bubble).boundingBox();
  assert.ok(balloon && balloon.x >= -1 && balloon.x + balloon.width <= page.viewportSize()!.width + 1, "balão permanece dentro da viewport");
}

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`gatinho reserva faixa sem sobrepor controles ou transbordar em ${width}px`, async () => {
    await fixture(width, false, async page => {
      await expectRunning(page);
      const box = await page.locator(lane).boundingBox();
      const controls = await page.locator("[data-mock-controls]").boundingBox();
      const navigation = await page.locator("nav").boundingBox();
      assert.ok(box && controls && navigation);
      assert.ok(box.height >= 56 && box.height <= 80, `altura da faixa: ${box.height}`);
      assert.ok(box.y >= controls.y + controls.height && box.y + box.height <= navigation.y + 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator(bubble).evaluate(el => getComputedStyle(el).pointerEvents), "none");
      assert.equal(await page.locator(runner).evaluate(el => getComputedStyle(el).mixBlendMode), "multiply");
      for (const progress of [0, 0.5, 0.999]) {
        await seek(page, progress);
        await expectInsideLane(page);
      }
      for (const name of ["Busca sintética", "Conta sintética", "Carrinho sintético"]) await page.getByRole("button", { name }).click({ trial: true });
      await page.getByRole("link", { name: "Catálogo sintético" }).click({ trial: true });
    });
  });
}

test("gatinho inverte com clique, Enter e Espaço e retorna sozinho na borda", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    const cat = page.getByRole("button", { name: "Mudar a direção do gatinho" });
    for (const action of ["click", "Enter", "Space"] as const) {
      await seek(page, 0.5);
      const before = await page.locator(runner).getAttribute("data-direction");
      if (action === "click") await cat.click({ force: true });
      else { await cat.focus(); await cat.press(action); }
      await expect(page.locator(runner)).toHaveAttribute("data-direction", before === "right" ? "left" : "right");
    }
    const before = await page.locator(runner).getAttribute("data-direction");
    await seek(page, 1);
    await expect(page.locator(runner)).toHaveAttribute("data-direction", before === "right" ? "left" : "right");
    await expectInsideLane(page);
  });
});

test("resize mantém o gatinho e seu balão dentro da faixa", async () => {
  await fixture(1920, false, async page => {
    await expectRunning(page);
    await seek(page, 0.95);
    for (const width of [320, 768, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.locator(runner).evaluate(el => el.getBoundingClientRect().right <= el.parentElement!.getBoundingClientRect().right + 1)).toBe(true);
      await expectInsideLane(page);
    }
  });
});

test("balões mostram dez frases únicas por 3s e permanecem ocultos por 5s", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate("window.renderCat(true)");
    await expectSuspended(page);
    await page.evaluate("window.renderCat(false)");
    const phrases: string[] = [];
    for (let index = 0; index < 10; index++) {
      await expect(page.locator(bubble)).toHaveAttribute("data-visible", "true");
      phrases.push((await page.locator(bubble).textContent())!.trim());
      await page.clock.runFor(2999);
      await expect(page.locator(bubble)).toHaveAttribute("data-visible", "true");
      await page.clock.runFor(1);
      await expect(page.locator(bubble)).toHaveAttribute("data-visible", "false");
      await page.clock.runFor(4999);
      await expect(page.locator(bubble)).toHaveAttribute("data-visible", "false");
      await page.clock.runFor(1);
    }
    assert.equal(new Set(phrases).size, 10);
    assert.ok(phrases.every(Boolean));
    await expect(page.locator(bubble)).toHaveText(phrases[0]);
  });
});

test("compactação e aba oculta suspendem e restauram a animação", async () => {
  await fixture(768, false, async page => {
    await expectRunning(page);
    await page.evaluate("window.renderCat(true)");
    await expectSuspended(page);
    await page.evaluate("window.renderCat(false)");
    await expectRunning(page);
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await expectSuspended(page);
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
    await expectRunning(page);
  });
});

test("diálogo nativo e modal acessível suspendem o gatinho até fechar", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    for (const native of [true, false]) {
      await page.evaluate(isNative => {
        const modal = document.createElement(isNative ? "dialog" : "div");
        modal.id = "synthetic-modal";
        if (isNative) modal.setAttribute("open", "");
        else { modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); }
        document.body.append(modal);
      }, native);
      await expectSuspended(page);
      await page.locator("#synthetic-modal").evaluate(el => el.remove());
      await expectRunning(page);
    }
  });
});

test("movimento reduzido oculta faixa sem solicitar GIF, inclusive após mudança de preferência", async () => {
  await fixture(390, true, async (page, requests) => {
    await expect(page.locator(lane)).toBeHidden();
    assert.deepEqual(requests, []);
    await expectSuspended(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expectRunning(page);
    assert.equal(requests.length, 1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(lane)).toBeHidden();
    await expectSuspended(page);
  });
});

test("desmontar remove animações e temporizadores sem erros tardios", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await page.clock.install();
    await page.evaluate("window.unmountCat()");
    await expect(page.locator(lane)).toHaveCount(0);
    await page.clock.runFor(16000);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
  });
});

test("capturas sintéticas do gatinho em celular e desktop", async () => {
  const output = "D:/Codex-outputs/wimifarma-br/gato-cabecalho-20261119";
  await fs.mkdir(output, { recursive: true });
  for (const width of [320, 390, 1536]) {
    await fixture(width, false, async page => {
      await expectRunning(page);
      await expect.poll(() => page.locator(`${runner} img`).evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await seek(page, 0.5);
      await page.locator("header").screenshot({ path: path.join(output, `header-cat-${width}.png`) });
    });
  }
});
