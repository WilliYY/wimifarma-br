import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const product = { id: "synthetic-cart", name: "Produto sintético", slug: "produto-sintetico", imageUrl: null, category: null, unitPriceCents: 208, originalPriceCents: null, stock: 10, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };

test("carrinho recarregado não propõe no-op; alterações reais e consulta concorrente permanecem explícitas", async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CartProvider,useCart} from './src/components/site/cart-provider';import {CartPage} from './src/components/site/cart-page';function CartState(){const cart=useCart();return <output hidden data-testid="cart-state">{JSON.stringify(cart.items)}</output>};createRoot(document.getElementById('root')).render(<CartProvider><CartState/><CartPage/></CartProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", platform: "browser", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "next-fixture", setup(builder) {
      builder.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "next/navigation" ? "export const useRouter=()=>({push(){},refresh(){}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);" : args.path === "next/link" ? "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>" : "import React from 'react';export default ({fill,...props})=><img {...props}/>", loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let current = { ...product };
    let release: (() => void) | null = null;
    let delay = false;
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/carrinho/revisao") {
        if (delay) await new Promise<void>(resolve => { release = resolve; });
        return route.fulfill({ json: { data: { products: [current] } } });
      }
      if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: {} });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/carrinho") return route.fulfill({ contentType: "text/html", body: '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/fixture.js"></script>' });
      return route.abort();
    });
    await page.addInitScript(item => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([item])), { ...product, quantity: 2 });
    await page.goto("http://127.0.0.1:3198/carrinho");
    await page.reload();
    await expect(page.getByText("R$ 4,16", { exact: true })).toHaveCount(2);
    const consult = page.getByRole("button", { name: "Consultar dados atuais" });
    await consult.click();
    await expect(page.getByRole("status")).toContainText("Seu carrinho já está atualizado");
    await expect(page.getByRole("button", { name: "Aplicar atualização" })).toHaveCount(0);
    assert.equal(await page.evaluate(() => JSON.parse(document.querySelector('[data-testid="cart-state"]')!.textContent!)[0].quantity), 2);

    current = { ...product, stock: 1, unitPriceCents: 309 };
    await consult.click();
    await expect(page.getByText("Quantidade: 2 → 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Aplicar atualização" }).click();
    await expect(page.getByRole("status")).toContainText("Atualização aplicada");
    assert.equal(await page.evaluate(() => JSON.parse(document.querySelector('[data-testid="cart-state"]')!.textContent!)[0].unitPriceCents), 309);

    current = { ...product, stock: 0 };
    await consult.click();
    await expect(page.getByText("Remover: produto sem estoque.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Manter meu carrinho" }).click();

    current = { ...product };
    delay = true;
    await consult.click();
    await expect.poll(() => release !== null).toBe(true);
    await page.getByRole("button", { name: "Diminuir quantidade de Produto sintético" }).click();
    release!();
    await expect(page.getByRole("status")).toContainText("O carrinho mudou durante a consulta");
    await expect(page.getByRole("button", { name: "Aplicar atualização" })).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
