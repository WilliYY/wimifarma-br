import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

test("Ofertas usa seus filtros disponíveis e os atalhos não conservam o filtro de promoções", async () => {
  const bundle = await build({
    stdin: { contents: "import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {CatalogPage} from './src/components/site/catalog-page';export async function render(){return renderToStaticMarkup(await CatalogPage({title:'Ofertas',description:'Ofertas disponíveis.',path:'/ofertas',page:1,offers:true}))}", loader: "tsx", resolveDir: process.cwd() },
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "offer-navigation", setup(builder) {
      builder.onResolve({ filter: /features\/products\/storefront$|catalog-product-card$|catalog-shipping-preview$|^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path === "next/link" ? "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}" :
        args.path === "next/navigation" ? "export const notFound=()=>{throw Error('404')};" :
        args.path.endsWith("catalog-product-card") ? "import React from 'react';export const CatalogProductCard=({product})=><article>{product.name}</article>;" :
        args.path.endsWith("catalog-shipping-preview") ? "export const CatalogShippingProvider=({children})=>children;" :
        "export const PAGE_SIZE=24;export const getPublicCategories=async()=>{throw Error('global categories queried')};export const getPublicCatalogSections=async()=>{throw Error('global sections queried')};export const catalogPageHref=(path)=>path;export const getPublicStorefrontProducts=async()=>({products:[{id:'soap',slug:'soap',name:'Sabonete sintético'}],count:1,offerNavigation:{categories:[{name:'Higiene',slug:'higiene',names:['Higiene']}],sections:['bath'],browseLinks:[{label:'Higiene e beleza',href:'/catalogo?grupo=beauty'},{label:'Fraldas adultas',href:'/categorias/fraldas-adultas'}]}});",
        loader: "tsx", resolveDir: process.cwd(),
      }));
    } }],
  });
  const loaded = { exports: {} as { render(): Promise<string> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, URLSearchParams, console, process });
  const html = await loaded.exports.render();
  const categories = html.match(/<nav aria-label="Categorias de produtos"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(categories);
  assert.match(categories, /Banho/);
  assert.doesNotMatch(categories, /Fraldas adultas|Infantil|Cabelos/);
  assert.match(html, /aria-label="Outras seleções disponíveis"/);
  assert.match(html, /href="\/catalogo\?grupo=beauty"/);
  assert.match(html, /href="\/categorias\/fraldas-adultas"/);
  assert.doesNotMatch(html, /fraldas-adultas\?[^"<]*ofertas/);
});
