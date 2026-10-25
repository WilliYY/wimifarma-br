import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const origin = "http://127.0.0.1:3196";
const quantityLabel = "Quantidade de caixas de Produto sintético";

const bundle = build({
  stdin: {
    contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {CartProvider} from './src/components/site/cart-provider';
      import {PublicProductCard} from './src/components/site/public-product-card';
      import {ProductPmcDetails} from './src/components/site/product-pmc';
      const kind=new URLSearchParams(location.search).get('kind');
      const product={id:'synthetic-product',slug:'produto-sintetico',name:'Produto sintético',
        imageUrl:null,category:'Produto',brand:'Marca sintética',activeIngredients:[],searchTerms:[],
        price:kind==='soap'?'3.44':kind==='promotion'||kind==='pmc-above'?'100.00':kind==='tiny'?'0.17':kind==='penny'?'0.01':'6.87',
        promotionalPrice:kind==='promotion'||kind==='pmc-above'?'80.00':null,isPopularPharmacy:false,requiresPrescription:kind==='restricted',
        prescriptionType:kind==='restricted'?'CONTROLLED':kind.startsWith('pmc')&&kind!=='pmc-rx'?'UNREVIEWED':'ORDINARY',stock:kind==='unavailable'?0:kind==='demand'?1:15,
        ...(kind.startsWith('pmc')?{requiresPrescription:kind==='pmc-rx',catalogClassification:{kind:'MEDICINE',medicineClass:'GENERIC',ethical:false,otc:kind!=='pmc-rx'},
          pmcReference:{amountCents:kind==='pmc-above'?7000:1000,column:'PMC 0 %',publishedOn:'2026-10-09',sourceUrl:'https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file',presentation:'10 MG COM X 10',laboratory:'Laboratório sintético',registration:'1234567890123',rates:[{label:'PMC 0 %',cents:1000},{label:'PMC 19,5 %',cents:1250},{label:'PMC 19,5 %  ALC',cents:1200}]}}:{}),
        inventorySource:kind==='demand'?'DISTRIBUTOR':'PHARMACY',supplierDemandAllowed:kind==='demand'};
      const cards=(kind==='grid'||kind==='large-grid'||kind==='pmc-grid')?[
        {...product,prescriptionType:'UNREVIEWED',price:kind==='large-grid'?'1299.90':'6.90',promotionalPrice:kind==='large-grid'?'999.99':'4.99',cashbackEnabled:true,cashbackRateBps:200},
        {...product,id:'synthetic-demand',slug:'sob-demanda',name:'Tadalafila 20 mg 4 comprimidos revestidos',price:kind==='large-grid'?'0.01':'4.85',inventorySource:'DISTRIBUTOR',supplierDemandAllowed:true,
          brand:'EUROFARMA LABORATÓRIOS S.A',activeIngredients:['Composição sintética longa para conferir a linha de detalhes']},
        {...product,id:'synthetic-generic',slug:'generico-sintetico',name:'Loratadina 10 mg 12 comprimidos',brand:'BIOLAB SANUS FARMACÊUTICA LTDA',price:'19.90',requiresPrescription:true,prescriptionType:'ORDINARY',cashbackEnabled:true,cashbackRateBps:100,
          catalogClassification:{kind:'MEDICINE',medicineClass:'GENERIC',ethical:true,otc:false}},
        {...product,id:'synthetic-similar',slug:'similar-sintetico',name:'Tadalafila 5 mg 30 comprimidos revestidos',brand:'MULTILAB INDUSTRIA E COMERCIO DE PRODUTOS FARMACEUTICOS LTDA',price:'12.90',requiresPrescription:true,prescriptionType:kind==='large-grid'?'CONTROLLED':'ORDINARY',cashbackEnabled:true,cashbackRateBps:100,
          catalogClassification:{kind:'MEDICINE',medicineClass:'SIMILAR',ethical:true,otc:false}}
      ]:[product];
      createRoot(document.getElementById('root')).render(kind==='pmc-details'?<ProductPmcDetails reference={product.pmcReference}/>:<CartProvider>{cards.map(item=><PublicProductCard key={item.id} product={item}/>)}</CartProvider>);`,
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
  const styles = await fixtureStyles(Boolean(process.env.PRODUCT_CARD_CAPTURE_ROOT) || kind.endsWith("grid") || kind === "pmc-details");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>${kind.endsWith("grid") ? '#root{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:960px;margin:16px auto;padding:0 12px}@media(min-width:900px){#root{grid-template-columns:repeat(3,minmax(0,1fr))}}' : '#root{width:min(280px,calc(50vw - 24px));margin:24px}'}${kind === "large-grid" ? '#root{max-width:648px}' : ''}</style><div id="root"></div><script type="module" src="/fixture.js"></script>` });
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

test("cards compactos mantêm benefícios fora do preço e altura uniforme sem espaços excessivos", async () => {
  await fixture(async page => {
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(2).getByText(/cashback/)).toHaveCount(0);
    await expect(cards.nth(3).getByText(/cashback/)).toHaveCount(0);
    const title = cards.first().getByRole("link", { name: "Ver Produto sintético · Marca sintética", exact: true });
    await expect(title).toHaveText("Produto sintético Marca sintética");
    await expect(title.locator(".font-black")).toHaveText("Marca sintética");
    const eurofarma = cards.nth(1).getByRole("link");
    await expect(eurofarma).toHaveText("Tadalafila 20 mg 4 comp. rev. EUROFARMA");
    await expect(eurofarma).toHaveAttribute("title", "Tadalafila 20 mg 4 comprimidos revestidos · EUROFARMA LABORATÓRIOS S.A");
    await expect(eurofarma).toHaveAttribute("aria-label", "Ver Tadalafila 20 mg 4 comprimidos revestidos · EUROFARMA LABORATÓRIOS S.A");
    await expect(cards.nth(2).getByRole("link")).toHaveText("Loratadina 10 mg 12 comp. BIOLAB");
    const multilab = cards.nth(3).getByRole("link");
    await expect(multilab).toHaveText("Tadalafila 5 mg 30 comp. rev. MULTILAB");
    await expect(multilab).toHaveAttribute("title", "Tadalafila 5 mg 30 comprimidos revestidos · MULTILAB INDUSTRIA E COMERCIO DE PRODUTOS FARMACEUTICOS LTDA");
    await expect(title.locator(".line-clamp-3")).toHaveCount(1);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 390) {
        for (const link of [eurofarma, multilab]) {
          const titleBox = await link.boundingBox();
          const brandBox = await link.locator(".font-black").boundingBox();
          assert.ok(titleBox && brandBox);
          assert.ok(brandBox.y >= titleBox.y && brandBox.y + brandBox.height <= titleBox.y + titleBox.height, "marca deve caber no título de três linhas em 390px");
          assert.ok(brandBox.x >= titleBox.x && brandBox.x + brandBox.width <= titleBox.x + titleBox.width, "marca não deve ser cortada horizontalmente");
        }
      }
      const sizes = await cards.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      if (process.env.PRODUCT_CARD_CAPTURE_ROOT) {
        mkdirSync(process.env.PRODUCT_CARD_CAPTURE_ROOT, { recursive: true });
        await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `cards-compactos-${width}.png`), fullPage: true });
      }
      assert.ok(Math.max(...sizes) <= 600, `cards ainda longos em ${width}px: ${sizes.join(", ")}`);
      assert.ok(Math.max(...sizes) - Math.min(...sizes) < 1, `benefícios alteraram altura em ${width}px`);
      const first = cards.nth(0);
      const off = await first.getByText("28% OFF", { exact: true }).boundingBox();
      const cashback = await first.getByText(/cashback/).boundingBox();
      const price = await first.getByRole("group", { name: "Preço do produto", exact: true }).boundingBox();
      const controls = await first.locator("[data-product-controls]").boundingBox();
      assert.ok(off && cashback && price && controls);
      await expect(first.getByText(/Pix/)).toHaveCount(0);
      assert.ok(cashback.y + cashback.height <= price.y, `cashback alongou a área de preço em ${width}px`);
      assert.ok(price.height <= 120 && controls.y - (price.y + price.height) <= 16, `espaço excessivo antes das ações em ${width}px`);
      const note = await first.getByText("Para 1 unidade.", { exact: true }).boundingBox();
      assert.ok(note && note.y + note.height <= controls.y, `condição unitária sobrepôs as ações em ${width}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await expect(first.getByText(/R\$\s*0,10/)).toBeVisible();
    }
  }, "grid");
});

test("preço real maior não sobrepõe condição unitária ou ações em tela estreita", async () => {
  await fixture(async page => {
    const first = page.getByRole("article").first();
    for (const width of [320, 390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      const prices = first.getByRole("group", { name: "Preço do produto", exact: true });
      const regular = await prices.getByText(/R\$\s*999,99/, { exact: true }).boundingBox();
      const unit = await prices.getByText("Para 1 unidade.", { exact: true }).boundingBox();
      const controls = await first.locator("[data-product-controls]").boundingBox();
      assert.ok(regular && unit && controls);
      await expect(first.getByText(/Pix/)).toHaveCount(0);
      assert.ok(regular.y + regular.height <= unit.y, `preço regular sobrepôs unidade em ${width}px`);
      assert.ok(unit.y + unit.height <= controls.y, `unidade sobrepôs ações em ${width}px`);
      assert.ok(await prices.evaluate(element => element.scrollWidth <= element.clientWidth), `preço cortado em ${width}px`);
      const sizes = await page.getByRole("article").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      assert.ok(Math.max(...sizes) - Math.min(...sizes) < 1, `card sem Pix/assistido alterou a altura em ${width}px`);
      if (width === 1024) assert.ok((await prices.boundingBox())!.width <= 176, "fixture deve cobrir a coluna estreita da busca");
    }
  }, "large-grid");
});

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
        await expect(cards.nth(index).getByText(/Consulte seu CEP para frete grátis/)).toBeVisible();
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

test("card mostra somente o preço real do carrinho, sem antecipar Pix ou criar referência riscada", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.locator("s")).toHaveCount(0);
    await expect(prices.locator("strong")).toHaveText(/R\$\s*3,44/);
    await expect(prices.getByText(/R\$\s*3,34/, { exact: true })).toHaveCount(0);
    await expect(prices.getByText("Para 1 unidade.", { exact: true })).toBeVisible();
    await expect(page.getByRole("article").getByText(/Pix/)).toHaveCount(0);
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

test("promoção cadastrada mantém somente referência real e preço atual do carrinho", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.locator("s")).toHaveText(/100,00/);
    await expect(prices.locator("strong")).toHaveText(/R\$\s*80,00/);
    await expect(page.getByRole("article").getByText(/Pix/)).toHaveCount(0);
    await expect(page.getByText("20% OFF", { exact: true })).toBeVisible();
    await expect(page.getByText("23% OFF", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expectCartQuantity(page, 1);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 8000);
    assert.equal(item.originalPriceCents, 10000);
  }, "promotion");
});

test("PMC identificado destaca economia conservadora sem virar preço anterior ou desconto Pix", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.getByText(/PMC CMED/)).toBeVisible();
    await expect(prices.locator("s")).toHaveText(/10,00/);
    await expect(prices.locator("strong")).toHaveText(/6,87/);
    await expect(page.getByText("31% OFF", { exact: true })).toBeVisible();
    await expect(page.getByText(/32%|34%|Pix/)).toHaveCount(0);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 760 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `PMC overflow at ${width}px`);
      if (process.env.PRODUCT_CARD_CAPTURE_ROOT && [390, 1280].includes(width)) {
        mkdirSync(process.env.PRODUCT_CARD_CAPTURE_ROOT, { recursive: true });
        await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `pmc-${width}.png`), fullPage: true });
      }
    }
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expectCartQuantity(page, 1);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 687);
    assert.equal(item.originalPriceCents, null);
  }, "pmc-mip");
});

test("PMC em medicamento com receita permanece informação sem selo promocional", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.getByText(/PMC CMED/)).toBeVisible();
    await expect(prices.locator("s")).toHaveCount(0);
    await expect(prices.locator("strong")).toHaveText(/6,87/);
    await expect(page.getByText(/abaixo do PMC|OFF|Pix/)).toHaveCount(0);
  }, "pmc-rx");
});

test("PMC sem economia não empresta sua base ao percentual da promoção cadastrada", async () => {
  await fixture(async page => {
    await expect(page.getByText(/PMC CMED/)).toHaveText(/70,00/);
    await expect(page.getByRole("group", { name: "Preço do produto", exact: true }).locator("strong")).toHaveText(/80,00/);
    await expect(page.getByText(/OFF|abaixo do PMC/)).toHaveCount(0);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expectCartQuantity(page, 1);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 8000);
    assert.equal(item.originalPriceCents, 10000);
  }, "pmc-above");
});

test("PMC mantém cards mistos alinhados e detalhes oficiais legíveis no celular", async () => {
  await fixture(async page => {
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(4);
    await expect(page.getByTitle(/abaixo do PMC/)).toHaveCount(2);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const sizes = await cards.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      assert.ok(Math.max(...sizes) - Math.min(...sizes) < 1);
      if (process.env.PRODUCT_CARD_CAPTURE_ROOT) await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `pmc-grid-${width}.png`), fullPage: true });
    }
  }, "pmc-grid");
  await fixture(async page => {
    await page.locator("#root").evaluate(element => { element.style.width = "calc(100vw - 32px)"; element.style.margin = "16px"; });
    await page.getByText("Sobre o PMC e a comparação de preços", { exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(4);
    await expect(page.getByRole("link", { name: "Consultar a edição oficial da CMED" })).toHaveAttribute("href", /www\.gov\.br\/anvisa\//);
    await expect(page.getByText(/Não representa um preço anterior/)).toBeVisible();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (process.env.PRODUCT_CARD_CAPTURE_ROOT) await page.screenshot({ path: join(process.env.PRODUCT_CARD_CAPTURE_ROOT, `pmc-details-${width}.png`), fullPage: true });
    }
  }, "pmc-details");
});

test("preço unitário em centavos continua igual ao carrinho em várias unidades", async () => {
  await fixture(async page => {
    const prices = page.getByRole("group", { name: "Preço do produto", exact: true });
    await expect(prices.locator("strong")).toHaveText(/R\$\s*0,17/);
    await expect(prices.getByText("Para 1 unidade.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await page.getByRole("textbox", { name: quantityLabel }).fill("3");
    await expectCartQuantity(page, 3);
    const item = await page.evaluate(() => JSON.parse(localStorage.getItem("wimifarma-cart-v1")!)[0]);
    assert.equal(item.unitPriceCents, 17);
    const subtotal = item.unitPriceCents * item.quantity;
    assert.equal(subtotal, 51);
  }, "tiny");
  await fixture(async page => {
    await expect(page.getByText("3% no Pix", { exact: true })).toHaveCount(0);
    await expect(page.locator("s")).toHaveCount(0);
  }, "penny");
});
