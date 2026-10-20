import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { pixDiscountCents } from "@/features/payments/pix-discount";

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
        price:kind==='soap'?'3.44':kind==='promotion'?'100.00':kind==='tiny'?'0.17':kind==='penny'?'0.01':'6.87',
        promotionalPrice:kind==='promotion'?'80.00':null,isPopularPharmacy:false,requiresPrescription:kind==='restricted',
        prescriptionType:kind==='restricted'?'CONTROLLED':'ORDINARY',stock:kind==='unavailable'?0:kind==='demand'?1:15,
        inventorySource:kind==='demand'?'DISTRIBUTOR':'PHARMACY',supplierDemandAllowed:kind==='demand'};
      const cards=kind==='grid'?[
        {...product,price:'6.90',promotionalPrice:'4.99',cashbackEnabled:true,cashbackRateBps:200},
        {...product,id:'synthetic-demand',slug:'sob-demanda',name:'Produto sintético com nome maior em duas linhas',price:'4.85',inventorySource:'DISTRIBUTOR',supplierDemandAllowed:true},
        {...product,id:'synthetic-generic',slug:'generico-sintetico',name:'Genérico sintético',price:'19.90',requiresPrescription:true,prescriptionType:'ORDINARY',cashbackEnabled:true,cashbackRateBps:100,
          catalogClassification:{kind:'MEDICINE',medicineClass:'GENERIC',ethical:true,otc:false}},
        {...product,id:'synthetic-similar',slug:'similar-sintetico',name:'Similar sintético',price:'12.90',requiresPrescription:true,prescriptionType:'ORDINARY',cashbackEnabled:true,cashbackRateBps:100,
          catalogClassification:{kind:'MEDICINE',medicineClass:'SIMILAR',ethical:true,otc:false}}
      ]:[product];
      createRoot(document.getElementById('root')).render(<CartProvider>{cards.map(item=><PublicProductCard key={item.id} product={item}/>)}</CartProvider>);`,
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

let css: Promise<string> | undefined;

function fixtureStyles(enabled: boolean) {
  if (!enabled) return Promise.resolve("");
  return css ??= postcss([tailwind()]).process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" }).then(result => result.css);
}

async function fixture(run: (page: Page) => Promise<void>, kind = "physical") {
  const script = (await bundle).outputFiles[0].text;
  const styles = await fixtureStyles(Boolean(process.env.PRODUCT_CARD_CAPTURE_ROOT) || kind === "grid");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>${kind === "grid" ? '#root{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:960px;margin:16px auto;padding:0 12px}@media(min-width:900px){#root{grid-template-columns:repeat(3,minmax(0,1fr))}}' : '#root{width:min(280px,calc(50vw - 24px));margin:24px}'}</style><div id="root"></div><script type="module" src="/fixture.js"></script>` });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: styles });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script });
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

test("cards alinham preços e ações com promoção, cashback, fornecedor e genérico", async () => {
  await fixture(async page => {
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(4);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      if (process.env.PRODUCT_CARD_CAPTURE_ROOT) {
        mkdirSync(process.env.PRODUCT_CARD_CAPTURE_ROOT, { recursive: true });
        await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `cards-padrao-${width}.png`), fullPage: true });
      }
      const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
      const firstPrice = await prices.nth(0).boundingBox();
      const secondPrice = await prices.nth(1).boundingBox();
      assert.ok(firstPrice && secondPrice);
      assert.ok(Math.abs(firstPrice.y - secondPrice.y) < 1, `preços desalinhados em ${width}px: ${firstPrice.y} / ${secondPrice.y}`);
      const firstBuy = await cards.nth(0).getByRole("button", { name: "Comprar", exact: true }).boundingBox();
      const secondBuy = await cards.nth(1).getByRole("button", { name: "Comprar", exact: true }).boundingBox();
      assert.ok(firstBuy && secondBuy);
      assert.ok(Math.abs(firstBuy.y - secondBuy.y) < 1, `botões desalinhados em ${width}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await expect(cards.nth(1).getByText("Frete grátis", { exact: true })).toBeVisible();
      for (const index of [2, 3]) {
        await expect(cards.nth(index).getByText("Frete grátis", { exact: true })).toBeVisible();
        await expect(cards.nth(index).getByText(/cashback/)).toHaveCount(0);
        await expect(cards.nth(index).getByText(/Consulte o CEP/)).toBeVisible();
      }
    }
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1") ?? "[]")), []);
    await cards.nth(0).getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(cards.nth(0).getByRole("textbox", { name: quantityLabel })).toHaveValue("1");
    await expect(cards.nth(1).getByRole("button", { name: "Adicionar", exact: true })).toBeVisible();
  }, "grid");
});

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
      await expect(page.getByText("3% no Pix", { exact: true })).toHaveCount(0);
      await expect(page.getByText("no Pix", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Frete grátis", { exact: true })).toHaveCount(0);
    }, kind);
  }
});

test("card compara preço normal com Pix real sem descontar antecipadamente o carrinho", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.locator("s")).toHaveText(/3,44/);
    await expect(prices.getByText(/R\$\s*3,34/, { exact: true })).toBeVisible();
    await expect(prices.getByText("no Pix", { exact: true })).toBeVisible();
    await expect(prices.getByText("Para 1 unidade.", { exact: true })).toBeVisible();
    await expect(page.getByText("3% no Pix", { exact: true })).toBeVisible();
    if (process.env.PRODUCT_CARD_CAPTURE_ROOT) {
      mkdirSync(process.env.PRODUCT_CARD_CAPTURE_ROOT, { recursive: true });
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 760 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `preco-pix-${width}.png`), fullPage: true });
      }
    }
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expectCartQuantity(page, 1);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 344);
    assert.equal(item.originalPriceCents, null);
  }, "soap");
});

test("promoção cadastrada mantém referência real e não soma percentuais ao Pix", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.locator("s")).toHaveText(/100,00/);
    await expect(prices.getByText(/R\$\s*77,60/, { exact: true })).toBeVisible();
    await expect(prices.getByText(/80,00 sem desconto Pix/)).toBeVisible();
    await expect(page.getByText("20% OFF", { exact: true })).toBeVisible();
    await expect(page.getByText("23% OFF", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expectCartQuantity(page, 1);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 8000);
    assert.equal(item.originalPriceCents, 10000);
  }, "promotion");
});

test("preço Pix unitário informa sua condição e preserva arredondamento no subtotal", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.getByText(/R\$\s*0,16/, { exact: true })).toBeVisible();
    await expect(prices.getByText("Para 1 unidade.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await page.getByRole("textbox", { name: quantityLabel }).fill("3");
    await expectCartQuantity(page, 3);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 17);
    const subtotal = item.unitPriceCents * item.quantity;
    assert.equal(subtotal - pixDiscountCents(subtotal), 49);
  }, "tiny");
  await fixture(async page => {
    await expect(page.getByText("3% no Pix", { exact: true })).toHaveCount(0);
    await expect(page.locator("s")).toHaveCount(0);
  }, "penny");
});
