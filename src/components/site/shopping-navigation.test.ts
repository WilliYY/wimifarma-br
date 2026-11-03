import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { SHOPPING_CONTEXT_KEY } from "@/features/products/shopping-context";

test("continuar compras retorna à lista por aba com filtros, página e posição, inclusive após reload", async () => {
  const mocks: Record<string, string> = {
    "next/navigation": `import {useSyncExternalStore} from 'react';const subscribe=f=>{addEventListener('popstate',f);return()=>removeEventListener('popstate',f)};
      export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname,()=>'/');
      export const useSearchParams=()=>new URLSearchParams(useSyncExternalStore(subscribe,()=>location.search,()=>''));
      export const useRouter=()=>({push:path=>window.navigate(path)});`,
    "next/link": `import React from 'react';export default ({href,children,onClick,scroll,...props})=><a {...props} href={href} onClick={e=>{onClick?.(e);if(!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0&&e.currentTarget.target!=='_blank'){e.preventDefault();window.navigate(href,scroll)}}}>{children}</a>;`,
  };
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Link from 'next/link';import {usePathname} from 'next/navigation';import {ShoppingNavigationTracker,ContinueShoppingLink} from './src/components/site/shopping-navigation';
    window.navigate=(path,scroll)=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));if(scroll!==false)window.scrollTo(0,0)};
    function App(){const path=usePathname();return <><ShoppingNavigationTracker/>{path==='/carrinho'?<ContinueShoppingLink>Continuar comprando</ContinueShoppingLink>:path.startsWith('/produto')?<Link href='/carrinho'>Adicionar ao carrinho</Link>:<><div style={{height:4000}}>Lista</div><nav style={{position:'fixed',top:10,left:10,background:'white'}}><Link href='/produto/limpeza-profunda'>Limpeza Profunda</Link><Link href='/produto/limpeza-profunda' target='_blank'>Nova aba</Link><Link href='/busca?q=outra&pagina=1'>Outra busca</Link></nav></>}</>};createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "shopping-fixture", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.route("http://shopping.fixture/**", route => route.fulfill(route.request().url().endsWith("fixture.js") ? { contentType: "text/javascript", body: bundle.outputFiles[0].text } : { contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' }));
    const page = await context.newPage();
    const errors: string[] = [];
    context.on("page", tab => tab.on("pageerror", error => errors.push(error.message)));
    const list = "/busca?q=sabonete%20Rexona&marca=Rexona&ordem=preco-asc&pagina=3";
    await page.goto(`http://shopping.fixture${list}`);
    await page.getByText("Lista", { exact: true }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 850));
    await expect.poll(() => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? "{}").scrollY, SHOPPING_CONTEXT_KEY)).toBe(850);
    await page.getByRole("link", { name: "Limpeza Profunda", exact: true }).click();
    await page.getByRole("link", { name: "Adicionar ao carrinho" }).click();
    await page.reload();
    await expect(page.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", list);
    await page.getByRole("link", { name: "Continuar comprando" }).click();
    await expect(page).toHaveURL(`http://shopping.fixture${list}`);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(850);
    // Normal back/forward remains the browser's responsibility; a fresh search is not restored to the old position.
    await page.getByRole("link", { name: "Outra busca" }).click();
    await expect(page).toHaveURL(/q=outra/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.goBack();
    await expect(page).toHaveURL(`http://shopping.fixture${list}`);
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Nova aba" }).click();
    const popup = await popupPromise;
    await popup.getByRole("link", { name: "Adicionar ao carrinho" }).click();
    await expect(popup.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", list);
    await popup.getByRole("link", { name: "Continuar comprando" }).click();
    await expect(popup).toHaveURL(`http://shopping.fixture${list}`);
    await popup.close();
    for (const record of [null, { href: "//evil.test", scrollY: 10, savedAt: Date.now() }, { href: list, scrollY: 10, savedAt: 1 }]) {
      const fresh = await context.newPage();
      await fresh.addInitScript(({ key, value }) => { if (value) sessionStorage.setItem(key, JSON.stringify(value)); }, { key: SHOPPING_CONTEXT_KEY, value: record });
      await fresh.goto("http://shopping.fixture/produto/limpeza-profunda");
      await fresh.getByRole("link", { name: "Adicionar ao carrinho" }).click();
      await expect(fresh.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/catalogo");
      await fresh.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
