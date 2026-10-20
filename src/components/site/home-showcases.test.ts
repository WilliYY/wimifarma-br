import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("Club separa as vitrines, com ou sem MIP, sem produtos repetidos no celular e desktop", async () => {
  const captureRoot = process.env.HOME_SHOWCASES_CAPTURE_ROOT;
  const cssDirectory = join(process.cwd(), ".next/static/css");
  const css = captureRoot && existsSync(cssDirectory) ? readdirSync(cssDirectory).filter(file => file.endsWith(".css")).map(file => readFileSync(join(cssDirectory, file), "utf8")).join("\n") : "";
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
    "next/image": "import React from 'react';export default ({alt,priority,fill,sizes,...props})=><img alt={alt} {...props}/>;",
    "next/navigation": "export const useRouter=()=>({push:()=>{}});",
    "@/hooks/use-club-summary": "export const useClubSummary=()=>({guest:true,loading:false,joining:false,error:null,summary:null});",
    "@/components/site/brand-carousel": "export const BrandCarousel=()=>null;",
    "@/components/site/hero-product-stage": "export const HeroProductStage=()=>null;",
    "./home-campaign.module.css": "export default {};",
  };
  const bundle = await build({ stdin: { contents: `import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {CartProvider} from './src/components/site/cart-provider';
    import {HomePage} from './src/components/site/home-page';
    import {buildHomeCollections} from './src/features/products/home-collections';
    const withOtc=location.search.includes('otc');
    const products=Array.from({length:60},(_,i)=>({id:'synthetic-'+i,name:'Produto sintético '+i,slug:'synthetic-'+i,
      imageUrl:'/uploads/products/synthetic-'+i+'.webp',price:String(i+1),promotionalPrice:null,brand:'Marca sintética',
      category:withOtc&&i%3===0?'Medicamentos':'Perfumaria',stock:20,requiresPrescription:false,prescriptionType:'UNREVIEWED',
      isPopularPharmacy:false,activeIngredients:[],searchTerms:[],
      catalogClassification:withOtc&&i%3===0?{kind:'MEDICINE',medicineClass:'OTHER',ethical:false,otc:true}:undefined}));
    const collections=buildHomeCollections(products,new Set(products.map(p=>p.imageUrl)),new Date('2026-10-19T12:00:00Z'));
    createRoot(document.getElementById('root')).render(<CartProvider><HomePage collections={collections} shortcuts={[]} customerReviews={[]}/></CartProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "home-showcases-fixture", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }] });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:3195") return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>#root>section:first-child,#root>section[aria-labelledby="customer-reviews-title"],#root>section:last-child{display:none}</style><div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/brand/logo-wimifarma.svg") return route.fulfill({ contentType: "image/svg+xml", body: readFileSync(join(process.cwd(), "public/brand/logo-wimifarma.svg")) });
      if (url.pathname.startsWith("/uploads/products/synthetic-")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect x="55" y="10" width="130" height="140" rx="12" fill="#f1f5f9"/><text x="120" y="70" text-anchor="middle" font-size="14">Produto</text><text x="120" y="90" text-anchor="middle" font-size="14">sintético</text></svg>' });
      if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: {} });
      return route.abort();
    });
    for (const withOtc of [false, true]) {
      await page.goto(`http://127.0.0.1:3195/${withOtc ? "?otc" : ""}`);
      await expect(page.locator("#home-care")).toBeVisible();
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        const order = await page.locator("#root>section").evaluateAll(sections => sections.flatMap(section => {
          const carousel = section.querySelector("#home-care,#home-otc,#home-affordable");
          return carousel ? [carousel.id] : section.querySelector("#club-banner-title") ? ["club"] : [];
        }));
        assert.deepEqual(order, ["home-care", ...(withOtc ? ["home-otc"] : []), "club", "home-affordable"]);
        const products = await page.locator("[data-home-product-card] a[href^='/produto/']").evaluateAll(links => links.map(link => link.getAttribute("href")));
        assert.equal(new Set(products).size, products.length);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (captureRoot && !withOtc) {
          mkdirSync(captureRoot, { recursive: true });
          await page.screenshot({ path: join(captureRoot, `banner-entre-vitrines-${width}.png`), fullPage: true });
        }
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
