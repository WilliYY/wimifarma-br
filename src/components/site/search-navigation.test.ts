import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createRequire } from "node:module";
import vm from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ComponentType } from "react";

test("busca preserva formulário GET no HTML quando leitura da URL suspende no prerender", async () => {
  const bundle = await build({ entryPoints: ["src/components/site/site-search.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "search-ssr", setup(builder) {
      builder.onResolve({ filter: /^next\/navigation$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({push:()=>{}});export const usePathname=()=>'/';export const useSearchParams=()=>{throw new Promise(()=>{})};" }));
    } }],
  });
  const loaded = { exports: {} as { SiteSearch: ComponentType } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url) });
  const html = renderToStaticMarkup(createElement(loaded.exports.SiteSearch));
  assert.match(html, /<form[^>]*action="\/busca"/);
  assert.match(html, /<input(?=[^>]*name="q")(?=[^>]*placeholder="[^"]*EAN)/);
  assert.match(html, /<button[^>]*type="submit"[\s\S]*Encontrar/);
});

test("URL, cabeçalho e campo real de resultados acompanham navegação e histórico sem apagar rascunho", async () => {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
    "next/image": "export default ()=>null;",
    "next/navigation": `import {useSyncExternalStore} from 'react';
      const subscribe=callback=>{window.addEventListener('popstate',callback);return()=>window.removeEventListener('popstate',callback)};
      export const useSearchParams=()=>new URLSearchParams(useSyncExternalStore(subscribe,()=>location.search,()=>''));
      export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname,()=>'/');
      export const useRouter=()=>({push:path=>window.navigate(path)});
      export function notFound(){throw Error('Unexpected notFound')}`,
    "@/features/products/search-catalog": "export const SEARCH_PAGE_SIZE=24;export const getSearchCatalog=async()=>({products:[],relatedProducts:[],count:0});export const getSearchSidebar=async()=>({title:'Explore o catálogo',products:[]});",
    "@/features/products/storefront": "export const catalogPageNumber=()=>1;",
    "@/components/site/catalog-product-card": "export const CatalogProductCard=()=>null;",
  };
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {SiteSearch} from './src/components/site/site-search';import SearchPage from './src/app/(site)/busca/page';
    const root=createRoot(document.getElementById('root'));
    const render=async()=>{const page=await SearchPage({searchParams:Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)))});root.render(<><SiteSearch/>{page}</>)};
    window.navigate=async path=>{history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));await render()};
    window.addEventListener('popstate',render);
    document.addEventListener('submit',event=>{if(event.defaultPrevented)return;event.preventDefault();window.navigate('/busca?'+new URLSearchParams(new FormData(event.target)))});
    render();`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "search-navigation", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("http://search.fixture/**", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { data: { products: [], relatedProducts: [] } } });
      return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
    });
    await page.goto("http://search.fixture/busca?q=7896523200576");
    const internal = page.getByRole("searchbox", { name: "Pesquisar no catálogo" });
    const header = page.getByRole("combobox", { name: "Buscar produtos" });
    await expect(internal).toHaveValue("7896523200576");
    await header.fill("fralda geriátrica G");
    await header.press("Enter");
    await expect(page).toHaveURL(/q=fralda/);
    await expect(internal).toHaveValue("fralda geriátrica G");
    await expect(header).toHaveValue("fralda geriátrica G");
    await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
    await expect(internal).toHaveValue("fralda geriátrica G");
    await internal.fill("edição ainda não enviada");
    await header.fill("outra digitação");
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate")));
    await expect(internal).toHaveValue("edição ainda não enviada");
    await expect(header).toHaveValue("outra digitação");
    await page.goBack();
    await page.goBack();
    await expect(internal).toHaveValue("7896523200576");
    await expect(header).toHaveValue("7896523200576");
    await page.goForward();
    await expect(internal).toHaveValue("fralda geriátrica G");
    await expect(header).toHaveValue("fralda geriátrica G");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
