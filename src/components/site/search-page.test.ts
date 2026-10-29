import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { build } from "esbuild";

test("busca renderiza simples e associações em uma grade sem reagrupar a ordem vendável", async () => {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default p=>React.createElement('a',{href:p.href},p.children);",
    "next/image": "export default ()=>null;",
    "next/navigation": "export function notFound(){throw new Error('Unexpected notFound')}",
    "@/features/products/search-catalog": "export const SEARCH_PAGE_SIZE=24;export const getSearchCatalog=async()=>fixture.result;export const getSearchSidebar=async()=>({title:'Explore o catálogo',products:[]});",
    "@/features/products/storefront": "export const catalogPageNumber=()=>1;",
    "@/components/site/catalog-product-card": "import React from 'react';export const CatalogProductCard=({product})=>React.createElement('article',{'data-product':product.id},product.name);",
  };
  const bundle = await build({ entryPoints: ["src/app/(site)/busca/page.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "search-page-presentation", setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx" }));
    } }],
  });
  const fixture = { result: { products: [
    { id: "single", name: "Losartana 50mg", activeIngredients: ["losartana"] },
    { id: "association", name: "Losartana + hidroclorotiazida 50mg", activeIngredients: ["losartana", "hidroclorotiazida"] },
    { id: "unavailable", name: "Losartana indisponível 50mg", activeIngredients: ["losartana"] },
  ], relatedProducts: [], count: 27, correctedQuery: null } };
  const loaded = { exports: {} as { default(props: { searchParams: Promise<{ q: string }> }): Promise<ReactElement> } };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, URLSearchParams,
  });
  const html = renderToStaticMarkup(await loaded.exports.default({ searchParams: Promise.resolve({ q: "losartana" }) }));
  assert.match(html, /Você buscou <span[^>]*>“losartana”<\/span>/);
  assert.doesNotMatch(html, /Produtos encontrados|Associações|Seções da busca/);
  assert.doesNotMatch(html, /27 produtos encontrados|Catálogo Wimifarma/);
  assert.ok(html.indexOf('data-product="single"') < html.indexOf('data-product="association"'));
  assert.ok(html.indexOf('data-product="association"') < html.indexOf('data-product="unavailable"'));
  assert.match(html, /Página 1 de 2/);
  assert.match(html, /q=losartana&amp;pagina=2/);
  assert.match(html, /orientação do profissional de saúde/);
});
