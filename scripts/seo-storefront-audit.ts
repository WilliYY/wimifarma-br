import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

// Compile actual server components with an in-memory catalog. No database or writes.
async function main() {
  const source = `import { createElement } from 'react'; import { renderToString } from 'react-dom/server'; import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'; import { CatalogPage } from './src/components/site/catalog-page'; import { CartProvider } from './src/components/site/cart-provider'; const router={push(){},replace(){},refresh(){},back(){},forward(){},prefetch:async()=>{}}; export async function render(page,offers=false){return renderToString(createElement(AppRouterContext.Provider,{value:router},createElement(CartProvider,null,await CatalogPage({title:'Catálogo de teste',description:'Produtos sintéticos para validar o catálogo.',path:'/catalogo',page,offers}))));}`;
  const calls: unknown[] = [];
  const products = Array.from({ length: 26 }, (_, i) => ({ id: String(i), slug: `fixture-${i}`, name: `Produto de higiene para teste ${i}`, brand: "Marca teste", category: "Higiene", price: { toString: () => "10.90" }, promotionalPrice: { toString: () => "9.99" }, stock: 2, imageUrl: null, requiresPrescription: false, isPopularPharmacy: false, activeIngredients: [], searchTerms: [], cashbackEnabled: false, cashbackRateBps: 200 }));
  const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "isolated-db", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export function getPrisma(){return globalThis.fixturePrisma}" }));
  } }] });
  const loaded = { exports: {} as { render: (page: number, offers?: boolean) => Promise<string> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), process, console, URL, Buffer, fixturePrisma: { product: { fields: { price: "fixture-price-field" }, count: async () => 26, findMany: async (query: { distinct?: string[]; skip?: number; take?: number }) => { calls.push(query); return query.distinct ? [{ category: "Higiene" }] : products.slice(query.skip || 0, (query.skip || 0) + (query.take || 24)); } } } });
  const first = await loaded.exports.render(1);
  const second = await loaded.exports.render(2, true);
  assert.match(first, /fixture-23/); assert.doesNotMatch(first, /fixture-24/);
  assert.match(second, /fixture-25/); assert.doesNotMatch(second, /fixture-0\b/);
  assert.ok(calls.some(query => JSON.stringify(query).includes('"promotionalPrice":{"lt":"fixture-price-field"}')));
  assert.ok(calls.every(query => JSON.stringify(query).includes('"status":"ACTIVE"')));
  const css = (await Promise.all((await fs.readdir(".next/static/css")).filter(file => file.endsWith(".css")).map(file => fs.readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
  await fs.mkdir("artifacts/assistant-qa", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try { for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${first}</body></html>`);
    assert.equal(await page.locator('a[href^="/produto/"]').count(), 24);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.match(await page.locator('script[type="application/ld+json"]').textContent() || "", /CollectionPage/);
    await page.screenshot({ path: `artifacts/assistant-qa/catalog-${width}.png` });
    await page.close();
  } } finally { await browser.close(); }
  console.log(JSON.stringify({ serverRenderedProductLinks: 24, pagination: true, promotionsUseRealPrice: true, activeOnly: true, responsive: [320,390,1440], databaseWrites: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
