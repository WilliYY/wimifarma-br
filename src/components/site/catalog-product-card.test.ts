import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

test("catalog cards preserve neutral prescription topics, photos, placeholders and one logo per brand", async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
      import {CartProvider} from './src/components/site/cart-provider';
      import {CatalogProductCard} from './src/components/site/catalog-product-card';
      import {FooterPaymentMethodsContent} from './src/components/site/footer-payment-methods-content';
      const base={id:'synthetic',slug:'sintetico',name:'Produto sintético',brand:'Fabricante sintético',category:'Higiene',imageUrl:null,
        price:'10.00',promotionalPrice:null,activeIngredients:[],searchTerms:[],requiresPrescription:false,prescriptionType:'UNREVIEWED',isPopularPharmacy:false,stock:0};
      const rx={...base,id:'rx',name:'Medicamento sintético 5mg 30 comprimidos',category:'Medicamentos',requiresPrescription:true,prescriptionType:'ORDINARY',
        imageUrl:'/synthetic.svg',promotionalPrice:'8.00',cashbackEnabled:true,cashbackRateBps:200,activeIngredients:['Composição sintética']};
      createRoot(document.getElementById('root')).render(<CartProvider><main className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 gap-4 items-stretch">
        <CatalogProductCard product={rx} topicSearch/><CatalogProductCard product={{...base,id:'photo',name:'Produto com foto',imageUrl:'/synthetic.svg'}} topicSearch/>
        <CatalogProductCard product={{...base,id:'placeholder',name:'Produto sem foto'}} topicSearch/>
      </main><FooterPaymentMethodsContent brands={[{id:'elo',name:'Elo',image:null},{id:'debelo',name:'Elo Débito',image:null},{id:'visa',name:'Visa',image:null}]} fromMercadoPago/></CartProvider>);`,
      resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "catalog-fixture", setup(builder) {
      const mocks: Record<string, string> = {
        "next/navigation": "export const useRouter=()=>({push:()=>{}});",
        "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
        "next/image": "import React from 'react';export default ({unoptimized,priority,...props})=><img {...props}/>;",
      };
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  const css = (await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const browser = await chromium.launch();
  const captureRoot = process.env.CATALOG_CAPTURE_ROOT;
  if (captureRoot) await mkdir(captureRoot, { recursive: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:3197") return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0}#root{max-width:1000px;margin:auto;padding:16px}main{margin-bottom:24px}</style><div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/synthetic.svg") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="25" y="10" width="50" height="80" fill="#b91c1c"/></svg>' });
      if (url.pathname === "/payments/pix-symbol.svg") return route.fulfill({ contentType: "image/svg+xml", body: await readFile("public/payments/pix-symbol.svg") });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3197/");
    const rx = page.locator("article").filter({ hasText: "Medicamento sintético" });
    await expect(rx.locator('[data-prescription-search="true"]')).toBeVisible();
    await expect(rx.locator("img,svg,button,s,[role=img]")).toHaveCount(0);
    assert.doesNotMatch(await rx.innerText(), /cashback|Pix|OFF|frete|comprar/i);
    await expect(page.getByRole("img", { name: "Produto com foto", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Foto indisponível", exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Bandeiras disponibilizadas pelo Mercado Pago" }).getByRole("listitem")).toHaveCount(2);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`);
      const columns = await page.locator("main").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
      assert.equal(columns, width === 320 ? 1 : width === 390 ? 2 : 3);
      if (captureRoot) await page.screenshot({ path: join(captureRoot, `catalogo-bandeiras-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
