import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type BrowserContextOptions, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3197";
const bundle = build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';
      import {PublicProductCard} from './src/components/site/public-product-card';
      import {CartProvider} from './src/components/site/cart-provider';
      const kind=new URLSearchParams(location.search).get('kind');
      const p={id:'synthetic',slug:'synthetic',name:'Produto sintético',brand:null,category:'Higiene',
        imageUrl:kind==='placeholder'?'/brand/medicamento-sem-foto.webp':'/cover.svg',
        imageUrls:kind==='single'?[]:kind==='duplicate'?['/cover.svg','/brand/medicamento-sem-foto.webp']:['/cover.svg',kind==='broken'?'/broken.svg':'/back.svg','/third.svg'],
        activeIngredients:[],searchTerms:[],stock:3,price:'10.00',promotionalPrice:null,
        requiresPrescription:kind==='rx',isPopularPharmacy:false};
      createRoot(document.getElementById('root')).render(<CartProvider><PublicProductCard product={p} variant={kind==='compact'?'medicine-rail':'default'}/></CartProvider>);`,
    resolveDir: process.cwd(), loader: "tsx",
  },
  bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "card-image-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/navigation": "export const useRouter=()=>({push:p=>window.lastNavigation=p});",
      "next/link": "import React from 'react';export default ({children,...p})=><a {...p}>{children}</a>;",
      "next/image": "import React from 'react';export default ({alt,...p})=><img alt={alt} {...p}/>;",
    };
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

async function fixture(run: (page: Page, requests: string[]) => Promise<void>, kind = "multiple", options: BrowserContextOptions = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(options);
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/") return route.fulfill({ contentType: "text/html", body: '<style>article{width:240px} [data-product-photo]{width:200px;height:140px} [data-product-photo] img{width:100%;height:100%;object-fit:contain}</style><div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (/\.(svg|webp)$/.test(path)) {
        requests.push(path);
        if (path === "/broken.svg") return route.fulfill({ status: 404, body: "missing" });
        return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="${path === "/back.svg" ? "blue" : "red"}"/></svg>` });
      }
      return route.fulfill({ json: {} });
    });
    await page.goto(`${origin}/?kind=${kind}`);
    await expect(page.getByRole("article")).toBeVisible();
    await run(page, requests);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("cartão carrega só a segunda foto no hover, mantém dimensões e volta à capa", async () => {
  for (const kind of ["multiple", "compact"]) await fixture(async (page, requests) => {
    const photo = page.locator("[data-product-photo]");
    const cover = photo.locator('img[src="/cover.svg"]');
    const back = photo.locator('img[src="/back.svg"]');
    await expect(cover).toBeVisible();
    assert.deepEqual(requests, ["/cover.svg"]);
    const before = await photo.boundingBox();
    await page.getByRole("article").hover();
    await expect(back).toBeVisible();
    await expect(cover).toHaveCSS("opacity", "0");
    assert.deepEqual(await photo.boundingBox(), before);
    assert.deepEqual(requests, ["/cover.svg", "/back.svg"]);
    assert.equal(await back.getAttribute("aria-hidden"), "true");
    await page.mouse.move(800, 600);
    await expect(cover).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Comprar", exact: true }).click();
    assert.equal(await page.evaluate(() => (window as unknown as { lastNavigation: string }).lastNavigation), "/checkout");
  }, kind);
});

test("uma foto, duplicatas, ilustrações e receita não solicitam foto alternativa", async () => {
  for (const kind of ["single", "duplicate", "placeholder", "rx"]) await fixture(async (page, requests) => {
    await page.getByRole("article").hover();
    await expect(page.locator('[data-product-photo] img')).toHaveCount(1);
    assert.equal(requests.length, 1);
    assert.ok(!requests.includes("/back.svg"));
  }, kind);
});

test("falha da segunda foto preserva a capa e não tenta a terceira nem repete requisição", async () => {
  await fixture(async (page, requests) => {
    const cover = page.locator('[data-product-photo] img[src="/cover.svg"]');
    await page.getByRole("article").hover();
    await expect.poll(() => requests.includes("/broken.svg")).toBe(true);
    await expect(cover).toHaveCSS("opacity", "1");
    await page.mouse.move(800, 600);
    await page.getByRole("article").hover();
    assert.deepEqual(requests, ["/cover.svg", "/broken.svg"]);
  }, "broken");
});

test("toque não carrega prévia e movimento reduzido troca sem transição", async () => {
  await fixture(async (page, requests) => {
    await page.getByRole("article").dispatchEvent("pointerenter", { pointerType: "touch" });
    assert.deepEqual(requests, ["/cover.svg"]);
    await page.getByRole("button", { name: "Comprar", exact: true }).tap();
    assert.equal(await page.evaluate(() => (window as unknown as { lastNavigation: string }).lastNavigation), "/checkout");
  }, "multiple", { hasTouch: true, isMobile: true });
  await fixture(async page => {
    await page.getByRole("article").hover();
    const back = page.locator('[data-product-photo] img[src="/back.svg"]');
    await expect(back).toBeVisible();
    await expect(back).toHaveCSS("transition-duration", "0s");
  }, "multiple", { reducedMotion: "reduce" });
});
