import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const bundle = build({
  stdin: {
    contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {BlackFridayProvider} from './src/components/site/black-friday-provider';
      import {isBlackFridayActive} from './src/features/offers/black-friday';
      import {AnnouncementBar} from './src/components/site/announcement-bar';
      import {CartProvider} from './src/components/site/cart-provider';
      import {CatalogShippingProvider} from './src/components/site/catalog-shipping-preview';
      import {CatalogProductCard} from './src/components/site/catalog-product-card';
      import {PublicProductCard} from './src/components/site/public-product-card';
      const product={id:'synthetic',slug:'sintetico',name:'Produto sintético',imageUrl:null,
        category:'Cuidados',brand:'Marca sintética',activeIngredients:[],searchTerms:[],
        price:'19.90',promotionalPrice:'17.90',isPopularPharmacy:false,requiresPrescription:false,
        prescriptionType:'UNREVIEWED',stock:12,inventorySource:'PHARMACY'};
      const consultation={kind:'CONSULTATION',id:'identity',ean:'0000000000000',name:'Item sob consulta',
        href:'/catalogo/item-sintetico',categoryName:'Cuidados'};
      createRoot(document.getElementById('root')).render(
        <BlackFridayProvider initialActive={isBlackFridayActive()}>
          <AnnouncementBar/><CartProvider><CatalogShippingProvider><div className="cards">
            <PublicProductCard product={product} showShippingEstimate/>
            <PublicProductCard product={{...product,id:'compact'}} variant="medicine-rail"/>
            <CatalogProductCard product={consultation}/>
            <CatalogProductCard topicSearch product={{...product,id:'prescription',requiresPrescription:true,prescriptionType:'ORDINARY'}}/>
          </div></CatalogShippingProvider></CartProvider>
        </BlackFridayProvider>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  outfile: "fixture.js",
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "black-friday-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/navigation": "export const useRouter=()=>({push:()=>{}});",
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({alt,...props})=><img alt={alt} {...props}/>;",
    };
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

let css: Promise<string> | undefined;
async function fixture(time: string, run: (page: Page) => Promise<void>, reducedMotion = false) {
  const files = (await bundle).outputFiles;
  const script = files.find(file => file.path.endsWith(".js"))!.text;
  const styles = await (css ??= postcss([tailwind()]).process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" }).then(result => result.css));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
    await page.clock.install({ time: new Date(time) });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/") return route.fulfill({ contentType: "text/html", body: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}\n${files.find(file => file.path.endsWith(".css"))?.text ?? ""}\n.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px;padding:12px;max-width:1100px;margin:auto}@media(min-width:900px){.cards{grid-template-columns:repeat(4,minmax(0,1fr))}}</style><div id="root"></div><script type="module" src="/fixture.js"></script>` });
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3199/");
    try {
      await run(page);
    } catch (error) {
      if (errors.length) throw new Error(errors.join("\n"), { cause: error });
      throw error;
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

test("selos pequenos aparecem nos quatro cards e faixa mantém altura e rotação", async () => {
  await fixture("2026-11-20T12:00:00-03:00", async page => {
    const bar = page.getByRole("region", { name: "Destaques da Wimifarma" });
    await expect(bar).toHaveAttribute("data-theme", "black-friday");
    await expect(bar.getByRole("link")).toHaveAttribute("href", "/catalogo");
    await expect(page.locator("[data-black-friday-badge]")).toHaveCount(4);
    await expect(page.getByText("Preço e disponibilidade sob consulta")).toBeVisible();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await page.locator("[data-black-friday-badge]").evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        const card = element.closest("article")!.getBoundingClientRect();
        return { height: box.height, contained: box.left >= card.left && box.right <= card.right };
      }));
      assert.ok(geometry.every(item => item.height <= 24 && item.contained), `selo fora do card em ${width}px`);
      assert.equal(await bar.evaluate(element => element.getBoundingClientRect().height), width < 640 ? 52 : 40);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow em ${width}px`);
      const captureRoot = process.env.BLACK_FRIDAY_CAPTURE_ROOT;
      if (captureRoot) {
        mkdirSync(captureRoot, { recursive: true });
        await page.screenshot({ path: join(captureRoot, `cards-${width}.png`), fullPage: true });
      }
    }
    await page.clock.runFor(7_010);
    await expect(bar).toHaveAttribute("data-theme", "delivery");
    await bar.getByRole("link").focus();
    await page.clock.runFor(7_010);
    await expect(bar).toHaveAttribute("data-theme", "delivery");
  });
});

test("selos e destaque saem juntos na meia-noite de Brasília mesmo com a aba aberta", async () => {
  await fixture("2026-11-30T23:59:38-03:00", async page => {
    await expect(page.locator("[data-black-friday-badge]")).toHaveCount(4);
    await page.clock.runFor(21_100);
    await expect(page.getByRole("region", { name: "Destaques da Wimifarma" })).toHaveAttribute("data-theme", "cashback");
    await page.clock.runFor(1_000);
    await expect(page.locator("[data-black-friday-badge]")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Destaques da Wimifarma" })).toHaveAttribute("data-theme", "delivery");
    await expect(page.getByText("Black Friday Wimifarma")).toHaveCount(0);
    const emptySlots = await page.locator("span[data-product-badges]").evaluateAll(elements => elements.map(element => ({
      height: element.getBoundingClientRect().height,
      marginBottom: getComputedStyle(element).marginBottom,
    })));
    assert.ok(emptySlots.every(slot => slot.height === 0 && slot.marginBottom === "0px"), "retirada não deixa espaço adicional nos cards");
  });
});

test("acesso após a campanha retorna a faixa original e movimento reduzido não gira", async () => {
  await fixture("2026-12-01T00:00:00-03:00", async page => {
    await expect(page.locator("[data-black-friday-badge]")).toHaveCount(0);
    const bar = page.getByRole("region", { name: "Destaques da Wimifarma" });
    await expect(bar).toHaveAttribute("data-theme", "delivery");
    await page.clock.runFor(14_010);
    await expect(bar).toHaveAttribute("data-theme", "delivery");
  }, true);
});
