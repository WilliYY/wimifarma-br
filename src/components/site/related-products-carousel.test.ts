import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type Locator, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3194";
const bundle = build({
  stdin: {
    contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {CartProvider} from './src/components/site/cart-provider';
      import {RelatedProductsCarousel} from './src/components/site/related-products-carousel';
      const products=Array.from({length:8},(_,index)=>({
        id:'synthetic-related-'+index,slug:'correlato-sintetico-'+index,
        name:'Correlato sintético '+index,brand:'Marca sintética',category:'Higiene',
        imageUrl:'/synthetic-product.svg',activeIngredients:[],searchTerms:[],
        price:'12.90',promotionalPrice:null,isPopularPharmacy:false,
        requiresPrescription:false,prescriptionType:'UNREVIEWED',stock:15,
        inventorySource:'PHARMACY',supplierDemandAllowed:false
      }));
      window.fixtureNavigations=[];
      document.addEventListener('click',event=>{
        const link=event.target instanceof Element?event.target.closest('a'):null;
        if(link&&!event.defaultPrevented){
          event.preventDefault();window.fixtureNavigations.push(link.getAttribute('href'));
        }
      });
      createRoot(document.getElementById('root')).render(
        <CartProvider><RelatedProductsCarousel products={products}/></CartProvider>
      );`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "related-products-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/navigation": "export const useRouter=()=>({push:path=>{window.fixtureNavigations.push(path)}});",
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({alt,...props})=><img alt={alt} {...props}/>;",
    };
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});
const css = postcss([tailwind()])
  .process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })
  .then(result => result.css);

async function fixture(run: (page: Page) => Promise<void>, touch = false) {
  const [script, styles] = await Promise.all([bundle, css]);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, hasTouch: touch, isMobile: touch });
    const errors: string[] = [];
    const unexpectedRequests: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) {
        if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0}#root{max-width:1400px;margin:auto;padding:12px}footer{height:1600px}</style><main id="root"></main><footer></footer><script type="module" src="/fixture.js"></script>` });
        if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: styles });
        if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script.outputFiles[0].text });
        if (url.pathname === "/synthetic-product.svg") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect x="30" y="10" width="60" height="100" fill="#bbc"/></svg>' });
        if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: {} });
      }
      unexpectedRequests.push(`${route.request().method()} ${url.pathname}`);
      return route.abort();
    });
    await page.goto(origin);
    await expect(page.getByRole("article")).toHaveCount(8);
    await expect(page.getByRole("button", { name: "Ver proximos produtos", exact: true })).toBeEnabled();
    await run(page);
    assert.deepEqual(errors, [], "fixture não deve gerar erros JavaScript");
    assert.deepEqual(unexpectedRequests, [], "toda requisição deve estar prevista e interceptada");
  } finally {
    await browser.close();
  }
}

function carousel(page: Page) {
  return page.getByRole("region", { name: "Produtos correlatos", exact: true });
}

function scrollLeft(page: Page) {
  return carousel(page).evaluate(element => element.scrollLeft);
}

async function navigations(page: Page) {
  return page.evaluate(() => (window as unknown as { fixtureNavigations: string[] }).fixtureNavigations);
}

async function dragMouse(page: Page, target: Locator) {
  const box = await target.boundingBox();
  assert.ok(box);
  const x = box.x + box.width * 0.8;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 190, y, { steps: 14 });
  await page.mouse.up();
}

test("correlatos permitem arrastar imagem e link pelo mouse sem abrir produto ou alterar carrinho", async () => {
  await fixture(async page => {
    for (const target of ["img", "a"]) {
      const before = await scrollLeft(page);
      const card = page.getByRole("article").nth(target === "img" ? 0 : 1);
      await dragMouse(page, card.locator(target));
      await expect.poll(() => scrollLeft(page)).toBeGreaterThan(before + 40);
      assert.deepEqual(await navigations(page), [], `arraste de ${target} abriu produto`);
    }
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1") ?? "[]")), []);
    await expect(page.getByRole("button", { name: "Ver produtos anteriores", exact: true })).toBeEnabled();
  });
});

test("clique e Enter abrem produto; adicionar e quantidade continuam interativos depois do arraste", async () => {
  await fixture(async page => {
    const first = page.getByRole("article").first();
    await dragMouse(page, first.locator("img"));
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(40);
    await page.getByRole("button", { name: "Ver produtos anteriores", exact: true }).click();
    await expect.poll(() => scrollLeft(page)).toBeLessThan(2);

    // A imagem usa o link expandido do card; coordenadas preservam o hit-test real.
    const imageBox = await first.locator("img").boundingBox();
    assert.ok(imageBox);
    await page.mouse.click(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2);
    await expect.poll(() => navigations(page)).toEqual(["/produto/correlato-sintetico-0"]);
    const link = first.getByRole("link");
    await link.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => navigations(page)).toEqual(["/produto/correlato-sintetico-0", "/produto/correlato-sintetico-0"]);

    await first.getByRole("button", { name: "Adicionar", exact: true }).click();
    const quantity = first.getByRole("textbox", { name: "Quantidade de caixas de Correlato sintético 0", exact: true });
    await quantity.fill("3");
    await first.getByRole("button", { name: "Aumentar Correlato sintético 0", exact: true }).click();
    await expect(quantity).toHaveValue("4");
    await first.getByRole("button", { name: "Diminuir Correlato sintético 0", exact: true }).click();
    await expect(quantity).toHaveValue("3");
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1") ?? "[]")[0]?.quantity)).toBe(3);
    assert.equal((await navigations(page)).length, 2, "ações do carrinho não devem abrir produto");

    // Sair antes do primeiro movimento interno não pode deixar um arraste pendente.
    const pendingImage = await first.locator("img").boundingBox();
    const region = await carousel(page).boundingBox();
    assert.ok(pendingImage && region);
    await page.mouse.move(pendingImage.x + pendingImage.width / 2, pendingImage.y + pendingImage.height / 2);
    await page.mouse.down();
    await page.mouse.move(region.x - 5, region.y + 10);
    await page.mouse.up();
    await expect.poll(() => scrollLeft(page)).toBeLessThan(2);

    const inputBox = await quantity.boundingBox();
    assert.ok(inputBox);
    // Um novo press pode chegar sem hover/move intermediário (eventos coalescidos).
    const mouseSession = await page.context().newCDPSession(page);
    const inputY = inputBox.y + inputBox.height / 2;
    await mouseSession.send("Input.dispatchMouseEvent", { type: "mousePressed", x: inputBox.x + inputBox.width * 0.8, y: inputY, button: "left", buttons: 1, clickCount: 1 });
    await mouseSession.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: inputBox.x + inputBox.width * 0.2, y: inputY, button: "left", buttons: 1 });
    assert.ok(await scrollLeft(page) < 2, "gesto abandonado não pode arrastar ao selecionar quantidade");
    await mouseSession.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: inputBox.x + inputBox.width * 0.2, y: inputY, button: "left", buttons: 0, clickCount: 1 });
    await mouseSession.detach();
    await expect.poll(() => scrollLeft(page)).toBeLessThan(2);
    await expect(quantity).toHaveValue("3");
    assert.equal((await navigations(page)).length, 2, "gesto abandonado não deve contaminar controles ou abrir produto");
  });
});

test("toque real rola os correlatos horizontalmente e preserva a rolagem vertical da página", async () => {
  await fixture(async page => {
    const session = await page.context().newCDPSession(page);
    await page.evaluate(() => {
      (window as unknown as { trustedTouches: number }).trustedTouches = 0;
      document.addEventListener("touchstart", event => {
        if (event.isTrusted) (window as unknown as { trustedTouches: number }).trustedTouches++;
      }, { passive: true });
    });
    async function swipe(deltaX: number, deltaY: number) {
      const box = await carousel(page).boundingBox();
      assert.ok(box);
      const x = box.x + box.width * 0.8;
      const y = box.y + 160;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let step = 1; step <= 14; step++) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: x + deltaX * step / 14, y: y + deltaY * step / 14 }],
        });
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await swipe(-210, 0);
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(50);
    assert.deepEqual(await navigations(page), []);
    await swipe(0, -150);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50);
    assert.equal(await page.evaluate(() => (window as unknown as { trustedTouches: number }).trustedTouches), 2);
    assert.deepEqual(await navigations(page), []);
    await session.detach();
  }, true);
});

test("setas e teclado funcionam em 320/390/1280/1440 px com movimento reduzido sem overflow da página", async () => {
  await fixture(async page => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const next = page.getByRole("button", { name: "Ver proximos produtos", exact: true });
    const previous = page.getByRole("button", { name: "Ver produtos anteriores", exact: true });
    for (const width of [320, 390, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload();
      await expect(next).toBeEnabled();
      await expect(previous).toBeDisabled();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow horizontal em ${width}px`);
      await expect(carousel(page)).toHaveAttribute("tabindex", "0");
      await expect.poll(() => carousel(page).evaluate(element => getComputedStyle(element).scrollBehavior)).toBe("auto");
      await carousel(page).focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => scrollLeft(page)).toBeGreaterThan(30);
      await expect(previous).toBeEnabled();
      await page.keyboard.press("ArrowLeft");
      await expect.poll(() => scrollLeft(page)).toBeLessThan(2);
      await next.click();
      await expect.poll(() => scrollLeft(page)).toBeGreaterThan(30);
      await previous.click();
      await expect.poll(() => scrollLeft(page)).toBeLessThan(2);
      assert.deepEqual(await navigations(page), []);
    }
  });
});
