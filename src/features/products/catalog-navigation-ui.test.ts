import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { catalogFilters, catalogFiltersPath } from "./catalog-navigation";

const output = "outputs/catalogo-lateral-2026-10-22";
const base = "http://127.0.0.1:3197";
const rows = Array.from({ length: 600 }, (_, index) => ({ id: `qa-${index}`, slug: `qa-${index}`, name: `Shampoo sintético ${String(index).padStart(3, "0")} 200ml`, brand: "Marca QA", category: "Higiene", activeIngredients: [], searchTerms: [], imageUrl: null, price: String(index + 1), promotionalPrice: null, stock: 3, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, cashbackEnabled: false, catalogClassification: { kind: "HYGIENE" } }));
const medicine = { ...rows[0], id: "rx", slug: "rx", name: "Metformina sintética 500mg", category: "Medicamentos", activeIngredients: ["cloridrato de metformina"], requiresPrescription: true, prescriptionType: "COMMON", catalogClassification: { kind: "MEDICINE" } };

test("catálogo responsivo mantém filtros, paginação, teclado e Rx neutro", async () => {
  const server = await build({ stdin: { contents: "import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {CatalogPage} from './src/components/site/catalog-page';import {CartProvider} from './src/components/site/cart-provider';export async function render(props){return renderToStaticMarkup(<CartProvider>{await CatalogPage(props)}</CartProvider>)}", loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "catalog-navigation-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/products\/storefront$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => {
      const contents = args.path === "next/link" ? "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}"
        : args.path === "next/image" ? "import React from 'react';export default function Image({priority,unoptimized,fill,...props}){return <img {...props}/>}"
        : args.path === "next/navigation" ? "export const useRouter=()=>({push(){}});export const notFound=()=>{throw Error('404')};"
        : "export const PAGE_SIZE=24;export const getPublicCategories=async()=>[{name:'Higiene',slug:'higiene',names:['Higiene']},{name:'Higiene pessoal',slug:'higiene-pessoal',names:['Higiene pessoal']},{name:'Medicamentos',slug:'medicamentos',names:['Medicamentos']}];export const getPublicCatalogSections=async()=>['hair','diabetes'];export const getStorefrontProducts=async({page,section})=>({count:section==='diabetes'?1:600,products:section==='diabetes'?[fixture.medicine]:fixture.rows.slice((page-1)*24,page*24)});export function catalogPageHref(path,page){const url=new URL(path,'http://fixture');if(page>1)url.searchParams.set('pagina',String(page));else url.searchParams.delete('pagina');return url.pathname+url.search}";
      return { contents, loader: "tsx", resolveDir: process.cwd() };
    });
  } }] });
  const loaded = { exports: {} as { render: (props: unknown) => Promise<string> } };
  vm.runInNewContext(server.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: { rows, medicine }, URL, URLSearchParams, process, console });
  const client = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {CatalogFilterPanel} from './src/components/site/catalog-filter-panel';const aside=document.querySelector('aside');const children=aside.lastElementChild.innerHTML;const host=document.createElement('div');aside.replaceWith(host);createRoot(host).render(<CatalogFilterPanel><div dangerouslySetInnerHTML={{__html:children}}/></CatalogFilterPanel>);", loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const require = createRequire(import.meta.url);
  const { compile } = require("@tailwindcss/node");
  const { Scanner } = require("@tailwindcss/oxide");
  const compiler = await compile(readFileSync("src/app/globals.css", "utf8"), { base: path.resolve("src/app"), onDependency() {} });
  const scanner = new Scanner({ sources: [{ base: process.cwd(), pattern: "src/**/*.{ts,tsx}", negated: false }] });
  const css = compiler.build(scanner.scan());
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base || route.request().method() !== "GET") return route.abort();
        if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: client.outputFiles[0].text });
        if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
        if (url.pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(path.join("public", url.pathname)), contentType: url.pathname.endsWith("svg") ? "image/svg+xml" : "image/webp" });
        const filters = catalogFilters(Object.fromEntries(url.searchParams));
        const html = await loaded.exports.render({ ...filters, path: catalogFiltersPath("/catalogo", filters), title: filters.section === "diabetes" ? "Diabetes" : "Produtos", description: "Encontre o que você precisa." });
        return route.fulfill({ contentType: "text/html", body: `<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body>${html}<script src="/fixture.js"></script></body></html>` });
      });
      await page.goto(`${base}/catalogo?marca=Marca+QA&q=shampoo&ordem=preco-desc&pagina=2`);
      const toggle = page.getByRole("button", { name: "Categorias e filtros" });
      const categories = page.getByRole("navigation", { name: "Categorias de produtos" });
      if (width <= 390) {
        await expect(categories).toBeHidden();
        await toggle.focus();
        await page.keyboard.press("Enter");
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
      }
      await expect(categories).toBeVisible();
      await expect(categories.getByRole("link", { name: "Higiene e beleza", exact: true })).toHaveCount(1);
      await expect(categories.getByRole("link", { name: "Higiene pessoal", exact: true })).toHaveCount(0);
      await expect(categories.getByRole("link", { name: "Cabelos", exact: true })).toHaveAttribute("href", /marca=Marca\+QA.*q=shampoo.*ordem=preco-desc.*grupo=beauty.*assunto=hair/);
      await expect(page.getByRole("link", { name: "Página 2", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("link", { name: "Última página", exact: true })).toHaveAttribute("href", /pagina=25/);
      await page.getByLabel("Ordenar por").selectOption("nome-asc");
      await page.getByRole("button", { name: "Aplicar", exact: true }).click();
      await page.waitForURL(/ordem=nome-asc/);
      assert.equal(new URL(page.url()).searchParams.has("pagina"), false);
      assert.equal(new URL(page.url()).searchParams.get("marca"), "Marca QA");
      assert.equal(new URL(page.url()).searchParams.get("q"), "shampoo");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/catalogo-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${output}/catalogo-topo-${width}.png` });
      await page.goto(`${base}/catalogo?grupo=medicines&assunto=diabetes`);
      await expect(page.locator("[data-prescription-search]")).toHaveCount(1);
      await expect(page.locator("article, [data-product-controls], img, s")).toHaveCount(0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/diabetes-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
