import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3196";
const quantityLabel = "Quantidade de caixas de Produto sintético";

const bundle = build({
  stdin: {
    contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {CartProvider} from './src/components/site/cart-provider';
      import {PublicProductCard} from './src/components/site/public-product-card';
      const kind=new URLSearchParams(location.search).get('kind');
      const product={id:'synthetic-product',slug:'produto-sintetico',name:'Produto sintético',
        imageUrl:null,category:'Produto',brand:'Marca sintética',activeIngredients:[],searchTerms:[],
        price:'6.87',promotionalPrice:null,isPopularPharmacy:false,requiresPrescription:kind==='restricted',
        prescriptionType:kind==='restricted'?'CONTROLLED':'ORDINARY',stock:kind==='unavailable'?0:kind==='demand'?1:15,
        inventorySource:kind==='demand'?'DISTRIBUTOR':'PHARMACY',supplierDemandAllowed:kind==='demand'};
      createRoot(document.getElementById('root')).render(<CartProvider><PublicProductCard product={product}/></CartProvider>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "product-card-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/navigation": "export const useRouter=()=>({push:path=>{window.lastNavigation=path;}});",
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({alt,...props})=><img alt={alt} {...props}/>;",
    };
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

async function fixture(run: (page: Page) => Promise<void>, kind = "physical") {
  const cssDirectory = join(process.cwd(), ".next/static/css");
  const css = process.env.PRODUCT_CARD_CAPTURE_ROOT && existsSync(cssDirectory)
    ? readdirSync(cssDirectory).filter(file => file.endsWith(".css")).map(file => readFileSync(join(cssDirectory, file), "utf8")).join("\n") : "";
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<link rel="stylesheet" href="/fixture.css"><div id="root" style="width:280px;margin:24px"></div><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: {} });
      return route.abort();
    });
    await page.goto(`${origin}/?kind=${kind}`);
    await run(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

async function expectCartQuantity(page: Page, quantity: number) {
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1") ?? "[]")[0]?.quantity)).toBe(quantity);
}

test("card permite digitar caixas e mantém a quantidade ao comprar e usar mais/menos", async () => {
  await fixture(async page => {
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    const input = page.getByRole("textbox", { name: quantityLabel });
    await expect(input).toHaveAttribute("inputmode", "numeric");
    await input.fill("12");
    await expectCartQuantity(page, 12);
    if (process.env.PRODUCT_CARD_CAPTURE_ROOT) {
      mkdirSync(process.env.PRODUCT_CARD_CAPTURE_ROOT, { recursive: true });
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 700 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `quantidade-${width}.png`) });
      }
    }
    await page.getByRole("button", { name: "Aumentar Produto sintético", exact: true }).click();
    await expect(input).toHaveValue("13");
    await page.getByRole("button", { name: "Diminuir Produto sintético", exact: true }).click();
    await expect(input).toHaveValue("12");
    await page.getByRole("button", { name: "Comprar", exact: true }).click();
    await expectCartQuantity(page, 12);
    assert.equal(await page.evaluate(() => (window as unknown as { lastNavigation: string }).lastNavigation), "/checkout");
  });
});

test("card rejeita letras, sinais e frações; normaliza vazio, zero e limite físico", async () => {
  await fixture(async page => {
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    const input = page.getByRole("textbox", { name: quantityLabel });
    await input.fill("3");
    for (const invalid of ["1e2", "-2", "+2", "2.5", "3,5", "abc", "1 2"]) {
      await input.fill(invalid);
      await expect(input).toHaveValue("3");
      await expectCartQuantity(page, 3);
    }
    await input.fill("");
    await expect(input).toHaveValue("");
    await input.press("Tab");
    await expect(input).toHaveValue("3");
    await expectCartQuantity(page, 3);
    await input.fill("");
    await input.pressSequentially("12");
    await expectCartQuantity(page, 12);
    await input.fill("999999999999999999999999999");
    await expect(input).toHaveValue("15");
    await expectCartQuantity(page, 15);
    await expect(page.getByRole("button", { name: "Aumentar Produto sintético", exact: true })).toBeDisabled();
    await input.fill("0");
    await expect(input).toHaveValue("1");
    await expectCartQuantity(page, 1);
    await input.fill("");
    await page.getByRole("button", { name: "Comprar", exact: true }).click();
    await expect(input).toHaveValue("1");
    await expectCartQuantity(page, 1);
    await page.getByRole("button", { name: "Diminuir Produto sintético", exact: true }).click();
    await expect(page.getByRole("button", { name: "Adicionar", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(input).toHaveValue("1");
  });
});

test("card respeita compra sob demanda e seu limite de protocolo", async () => {
  await fixture(async page => {
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    const input = page.getByRole("textbox", { name: quantityLabel });
    await input.fill("25");
    await expectCartQuantity(page, 25);
    await input.fill("1000");
    await expect(input).toHaveValue("999");
    await expectCartQuantity(page, 999);
  }, "demand");
});

test("itens assistidos ou indisponíveis não recebem campo de compra", async () => {
  for (const kind of ["restricted", "unavailable"]) {
    await fixture(async page => {
      await expect(page.getByRole("textbox", { name: quantityLabel })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Comprar", exact: true })).toHaveCount(0);
      if (kind === "restricted") await expect(page.getByRole("link", { name: "Consultar no WhatsApp" })).toBeVisible();
      else await expect(page.getByRole("button", { name: "Avise-me quando chegar" })).toBeVisible();
    }, kind);
  }
});
