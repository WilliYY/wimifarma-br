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
  stdin: { contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {HeaderCatRunner} from './src/components/site/header-cat-runner';const root=createRoot(document.getElementById('root'));function Search({compact,show}){const [query,setQuery]=useState('');const [focused,setFocused]=useState(false);return <div data-search-area><form className="site-search-form" onSubmit={e=>{e.preventDefault();document.body.dataset.submitted=query}}>{show&&<HeaderCatRunner compact={compact} searchActive={focused||query.trim().length>0}/>}<input aria-label="Busca sintética" value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/><button type="submit">Buscar sintético</button><button type="button" onClick={()=>setQuery('')}>Limpar sintético</button></form></div>}window.renderCat=(compact=false,show=true)=>flushSync(()=>root.render(<Search compact={compact} show={show}/>));window.unmountCat=()=>root.unmount();window.renderCat();`, resolveDir: process.cwd(), loader: "tsx" },
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
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<meta charset="utf-8"><style>${styles}body{margin:0}[data-mock-controls]{display:flex;gap:8px;height:64px;align-items:center}[data-search-area]{position:relative;min-height:56px}[data-search-area] form{height:56px;display:flex;position:relative;z-index:1}[data-search-area] input{min-width:0;flex:1}[data-search-area] button{flex:none}nav{height:48px}</style><header class="site-header"><div data-mock-controls><button>Conta sintética</button><button>Carrinho sintético</button></div><div id="root"></div><nav><a href="#catalogo">Catálogo sintético</a></nav></header><script type="module" src="/fixture.js"></script>` });
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
  const figure = await page.locator(".header-cat-figure").boundingBox();
  const submit = await page.locator(".site-search-form button[type='submit']").boundingBox();
  assert.ok(figure && submit && figure.x + figure.width <= submit.x - 3, "desenho permanece antes do botão submit durante o percurso");
}

for (const width of [320, 390, 1280]) {
  test(`gatinho não aumenta cabeçalho nem transborda em ${width}px`, async () => {
    await fixture(width, false, async page => {
      await expectRunning(page);
      const box = await page.locator(lane).boundingBox();
      const decorated = await page.locator("header").boundingBox();
      const search = await page.locator("[data-search-area] form").boundingBox();
      assert.ok(box && decorated && search);
      await page.evaluate("window.renderCat(false,false)");
      const baseline = await page.locator("header").boundingBox();
      assert.equal(decorated.height, baseline!.height, "decoração não cria faixa extra no cabeçalho");
      assert.equal(search.height, 56, "busca mantém altura original");
      assert.ok(box.y >= search.y && box.y + box.height <= search.y + search.height + 1, "gato ocupa somente a busca existente");
      await page.evaluate("window.renderCat(false,true)");
      await expectRunning(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator(bubble).evaluate(el => getComputedStyle(el).pointerEvents), "none");
      assert.equal(await page.locator(runner).evaluate(el => getComputedStyle(el).mixBlendMode), "multiply");
      for (const progress of [0, 0.5, 0.999]) {
        await seek(page, progress);
        await expectInsideLane(page);
      }
      for (const name of ["Buscar sintético", "Conta sintética", "Carrinho sintético"]) await page.getByRole("button", { name }).click({ trial: true });
      await page.getByRole("link", { name: "Catálogo sintético" }).click({ trial: true });
    });
  });
}

test("gatinho decorativo não recebe foco nem captura cliques da busca", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await expect(page.locator(lane)).toHaveAttribute("aria-hidden", "true");
    assert.equal(await page.locator(lane).locator("button,a,input,[tabindex]:not([tabindex='-1'])").count(), 0);
    assert.equal(await page.locator(lane).evaluate(el => getComputedStyle(el).pointerEvents), "none");
    await seek(page, 0);
    const input = page.getByRole("textbox", { name: "Busca sintética" });
    const sprite = await page.locator(".header-cat-sprite").boundingBox();
    assert.ok(sprite);
    const target = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return { tag: element?.tagName, insideSearch: Boolean(element?.closest(".site-search-form")) };
    }, { x: sprite.x + sprite.width / 2, y: sprite.y + sprite.height / 2 });
    assert.ok(target.insideSearch && ["INPUT", "BUTTON"].includes(target.tag ?? ""), "o gato deixa o clique alcançar o campo ou botão que estiver atrás dele");
    await page.mouse.click(sprite.x + sprite.width / 2, sprite.y + sprite.height / 2);
    await expect(page.locator(".site-search-form :focus")).toHaveCount(1);
    await input.focus();
    await expect(input).toBeFocused();
    await input.fill("sintético");
    await page.getByRole("button", { name: "Buscar sintético" }).click();
    assert.equal(await page.locator("body").getAttribute("data-submitted"), "sintético");
    await page.getByRole("button", { name: "Limpar sintético" }).click();
    await expect(input).toHaveValue("");
    await input.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Buscar sintético" })).toBeFocused();
  });
});

test("gatinho chega à esquerda do botão submit e retorna sem sobrepor o botão", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await seek(page, 0.999);
    const figure = await page.locator(".header-cat-figure").boundingBox();
    const submit = await page.locator(".site-search-form button[type='submit']").boundingBox();
    assert.ok(figure && submit);
    const gap = submit.x - figure.x - figure.width;
    assert.ok(gap >= 3 && gap <= 6, `gato volta junto ao botão sem sobreposição; distância ${gap}px`);
    const before = await page.locator(runner).getAttribute("data-direction");
    await seek(page, 1);
    await expect(page.locator(runner)).toHaveAttribute("data-direction", before === "right" ? "left" : "right");
    await expectInsideLane(page);
  });
});

test("balão acompanha o gato acima do desenho e imagem escura conserva opacidade", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await expect(page.locator(bubble)).toHaveAttribute("data-visible", "true");
    await seek(page, 0.5);
    const { figure, balloon } = await page.locator(runner).evaluate(element => {
      const figure = element.querySelector(".header-cat-figure")!.getBoundingClientRect();
      const balloon = element.querySelector("[data-header-cat-bubble]")!.getBoundingClientRect();
      return { figure: { x: figure.x, y: figure.y, width: figure.width }, balloon: { x: balloon.x, y: balloon.y, width: balloon.width, height: balloon.height } };
    });
    assert.ok(balloon.y + balloon.height <= figure.y + 1, "balão permanece acima do desenho");
    assert.ok(figure.x >= balloon.x - 1 && figure.x + figure.width <= balloon.x + balloon.width + 1, "balão acompanha a posição horizontal do gato");
    const styles = await page.locator(`${runner} img`).evaluate(image => {
      const opacity: string[] = [];
      for (let element: Element | null = image; element && !element.matches("form"); element = element.parentElement) opacity.push(getComputedStyle(element).opacity);
      return { opacity, filter: getComputedStyle(image).filter };
    });
    assert.ok(styles.opacity.every(value => Number(value) === 1), "nenhuma camada esmaece o gato com transparência");
    const brightness = styles.filter.match(/brightness\(([^)]+)\)/);
    assert.ok(brightness && Number(brightness[1]) < 1, `desenho escurecido: ${styles.filter}`);
  });
});

test("foco oculta e suspende o gato até a busca vazia perder foco", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    const input = page.getByRole("textbox", { name: "Busca sintética" });
    await input.click();
    await expectSuspended(page);
    await expect(page.locator(lane)).toBeHidden();
    await page.getByRole("button", { name: "Conta sintética" }).click();
    await expectRunning(page);
    await expect(page.locator(lane)).toBeVisible();
  });
});

test("consulta preenchida mantém gato oculto após blur e limpar libera animação", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await page.clock.install();
    const input = page.getByRole("textbox", { name: "Busca sintética" });
    await input.fill("produto sintético");
    await page.getByRole("button", { name: "Conta sintética" }).click();
    await expectSuspended(page);
    await expect(page.locator(lane)).toBeHidden();
    await page.clock.runFor(16000);
    await expectSuspended(page);
    await expect(page.locator(lane)).toBeHidden();
    await input.focus();
    await input.press("Enter");
    assert.equal(await page.locator("body").getAttribute("data-submitted"), "produto sintético");
    await page.getByRole("button", { name: "Limpar sintético" }).click();
    await expect(input).toHaveValue("");
    await page.getByRole("button", { name: "Conta sintética" }).click();
    await expectRunning(page);
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

test("redimensionar botão submit recalcula retorno sem mudar viewport", async () => {
  await fixture(768, false, async page => {
    await expectRunning(page);
    await seek(page, 0.95);
    await page.locator(".site-search-form button[type='submit']").evaluate(button => { (button as HTMLElement).style.width = "200px"; });
    await expect.poll(() => page.locator(".header-cat-figure").evaluate(figure => {
      const submit = figure.closest("form")!.querySelector("button[type='submit']")!;
      return figure.getBoundingClientRect().right <= submit.getBoundingClientRect().left - 3;
    })).toBe(true);
    // Finish the current leg, then inspect the outward leg at its end.
    if (await page.locator(runner).getAttribute("data-direction") === "left") {
      await seek(page, 1);
      await expect(page.locator(runner)).toHaveAttribute("data-direction", "right");
    }
    await seek(page, 0.999);
    const figure = await page.locator(".header-cat-figure").boundingBox();
    const submit = await page.locator(".site-search-form button[type='submit']").boundingBox();
    assert.ok(figure && submit);
    assert.ok(submit.x - figure.x - figure.width >= 3 && submit.x - figure.x - figure.width <= 6, "limite acompanha a nova largura do botão");
  });
});

test("balões mostram dez frases únicas por 3s e permanecem ocultos por 5s", async () => {
  await fixture(390, false, async page => {
    await expectRunning(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByRole("textbox", { name: "Busca sintética" }).focus();
    await expectSuspended(page);
    await page.getByRole("button", { name: "Conta sintética" }).click();
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

test("compactação mantém gato visível e animado; aba oculta suspende e restaura", async () => {
  await fixture(768, false, async page => {
    await expectRunning(page);
    await page.evaluate("window.renderCat(true)");
    await expectRunning(page);
    await expect(page.locator(lane)).toBeVisible();
    await page.evaluate("window.renderCat(false)");
    await expectRunning(page);
    await page.locator("header").evaluate(el => el.setAttribute("data-compact", "true"));
    await expectRunning(page);
    await expect(page.locator(lane)).toBeVisible();
    await page.locator("header").evaluate(el => el.setAttribute("data-compact", "false"));
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
  const output = process.env.HEADER_CAT_CAPTURE_ROOT;
  if (!output) return;
  await fs.mkdir(output, { recursive: true });
  for (const width of [320, 390, 1280]) {
    await fixture(width, false, async page => {
      await expectRunning(page);
      await expect.poll(() => page.locator(`${runner} img`).evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await seek(page, 0.5);
      await page.locator("header").screenshot({ path: path.join(output, `header-cat-${width}.png`) });
    });
  }
});
