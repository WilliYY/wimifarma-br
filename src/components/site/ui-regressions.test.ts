import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";

async function fixture(kind: "search" | "checkout" | "header", run: (page: Page) => Promise<void>) {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props}) => <a {...props}>{children}</a>",
    "next/image": "import React from 'react';export default ({fill,unoptimized,priority,...props}) => <img {...props}/>",
    "next/navigation": "export const useRouter=()=>({push:path=>window.navigations.push(path)});export const redirect=()=>{throw new Error('Unexpected fixture redirect');};",
    "next/server": "export const NextResponse={json:()=>{throw new Error('Unexpected server response');}};",
    "@/features/auth/auth": "export const auth=async()=>window.session;export const signOut=async()=>{};",
    "@/components/site/site-nav": "export const SiteNav=()=>null;",
    "@/components/site/cart-header-button": "export const CartHeaderButton=()=>null;",
    "@/components/site/announcement-bar": "export const AnnouncementBar=()=>null;",
    "./checkout-delivery-step": "export const CheckoutDeliveryStep=()=>null;",
    "./online-payment": "export const OnlinePayment=()=>null;",
    "./cart-provider": `import {useState} from 'react';export function useCart(){const [subtotal,setSubtotal]=useState(1000);window.changeCart=setSubtotal;return {hydrated:true,items:[{id:'synthetic',name:'Produto sintético',slug:'synthetic',quantity:1,unitPriceCents:subtotal}],itemCount:1,subtotalCents:subtotal,clearCart:()=>{}};}`,
    "@/hooks/use-checkout-session": `import {useState} from 'react';export function useCheckoutSession(initial){const [draft,setDraft]=useState({...initial,fulfillmentMethod:'PICKUP',paymentMethod:'CASH'});return {draft,setDraft,ready:true,clearDraft:()=>{}};}`,
  };
  const entry = kind === "header"
    ? "import {SiteHeader} from './src/components/site/site-header';window.renderHeader=async()=>root.render(await SiteHeader());await window.renderHeader();"
    : kind === "checkout"
      ? "import {CheckoutPage} from './src/components/site/checkout-page';root.render(<CheckoutPage isCustomer initialCustomer={{name:'Cliente Sintético',phone:'44999999999',email:'test@example.invalid',street:'',neighborhood:''}}/>);"
      : "import {SiteSearch} from './src/components/site/site-search';root.render(<SiteSearch/>);";
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';const root=createRoot(document.getElementById('root'));window.unmount=()=>root.unmount();${entry}`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "synthetic-ui", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }] });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const origin = "http://127.0.0.1:3198";
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script>window.navigations=[];window.session={user:{id:"synthetic",name:"Cliente",role:"CUSTOMER"}};</script><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      return route.abort();
    });
    try { await run(page); } catch (error) { if (errors.length) throw new Error(errors.join("; "), { cause: error }); throw error; }
  } finally { await browser.close(); }
}

const product = (name: string) => ({ id: name, name, slug: name.toLowerCase(), activeIngredients: [], price: "10.00", imageUrl: null });

test("search never submits stale results during debounce; keyboard selects the completed current query", async () => {
  await fixture("search", async page => {
    await page.route("**/api/produtos/busca?*", route => {
      const query = new URL(route.request().url()).searchParams.get("q");
      return route.fulfill({ json: { data: { products: [product(query === "Dove" ? "Dove" : "Nivea"), product("Segundo")], relatedProducts: [] } } });
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:3198");
    const input = page.getByRole("combobox");
    await input.fill("Dove"); await page.clock.runFor(250);
    await expect(page.getByRole("option", { name: /Dove/ })).toBeVisible();
    await input.fill("Nivea"); await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), []);
    await expect(page.getByRole("option", { name: /Dove/ })).toHaveCount(0);
    await page.clock.runFor(250);
    await expect(page.getByRole("option", { name: /Nivea/ })).toBeVisible();
    await input.press("ArrowDown"); await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/produto/segundo"]);
  });
});

test("cashback label, summary and order request retain the explicitly selected amount when the cart grows", async () => {
  await fixture("checkout", async page => {
    await page.route("**/api/minha-conta/cashback", route => route.fulfill({ json: { data: { balance: "30.00" } } }));
    let posted: { cashbackRedeemCents: number } | undefined;
    await page.route("**/api/pedidos", route => { posted = route.request().postDataJSON(); return route.fulfill({ status: 422, json: { error: "Pedido sintético interceptado" } }); });
    await page.goto("http://127.0.0.1:3198");
    await page.getByRole("checkbox", { name: "Usar saldo de cashback" }).check();
    await page.evaluate("window.changeCart(2000)");
    await expect(page.getByText(/Usar R\$\s*10,00 neste pedido/)).toBeVisible();
    await expect(page.locator("dl dd").filter({ hasText: /10,00/ })).toHaveText(/− R\$\s*10,00/);
    await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Pedido sintético interceptado");
    assert.equal(posted?.cashbackRedeemCents, 1000);
    await page.evaluate("window.changeCart(500)");
    await expect(page.getByText(/Usar R\$\s*5,00 neste pedido/)).toBeVisible();
    await page.getByRole("button", { name: "Atualizar saldo de cashback" }).click();
    await expect(page.getByRole("checkbox", { name: "Usar saldo de cashback" })).not.toBeChecked();
  });
});

test("search ignores an abandoned delayed response after the current query completes", async () => {
  await fixture("search", async page => {
    let releasePrevious!: () => void;
    let finishPrevious!: () => void;
    const previousPending = new Promise<void>(resolve => { releasePrevious = resolve; });
    const previousFinished = new Promise<void>(resolve => { finishPrevious = resolve; });
    let previousStarted = false;
    await page.route("**/api/produtos/busca?*", async route => {
      const query = new URL(route.request().url()).searchParams.get("q");
      if (query === "Dove") {
        previousStarted = true;
        await previousPending;
      }
      try {
        await route.fulfill({ json: { data: { products: [product(query === "Dove" ? "Dove" : "Nivea")], relatedProducts: [] } } });
      } finally {
        if (query === "Dove") finishPrevious();
      }
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:3198");
    const input = page.getByRole("combobox");
    await input.fill("Dove"); await page.clock.runFor(250);
    await expect.poll(() => previousStarted).toBe(true);
    await input.fill("Nivea"); await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), []);
    await page.clock.runFor(250);
    await expect(page.getByRole("option", { name: /Nivea/ })).toBeVisible();
    releasePrevious(); await previousFinished;
    await expect(page.getByRole("option", { name: /Dove/ })).toHaveCount(0);
    await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/produto/nivea"]);
  });
});

test("both header balances share refresh resources, reset per customer and dispose on unmount", async () => {
  await fixture("header", async page => {
    let calls = 0;
    let releaseCustomer!: () => void;
    const customerPending = new Promise<void>(resolve => { releaseCustomer = resolve; });
    await page.route("**/api/minha-conta/cashback", async route => {
      calls += 1;
      if (calls === 6) await customerPending;
      return route.fulfill({ json: { data: { balance: `${calls}.00` } } });
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:3198");
    const balances = page.getByTitle("Cashback liberado");
    await expect(balances).toHaveCount(2);
    await expect(balances).toHaveText([/1,00/, /1,00/]);
    assert.equal(calls, 1);
    await page.evaluate("window.dispatchEvent(new Event('focus'))");
    await expect(balances).toHaveText([/2,00/, /2,00/]); assert.equal(calls, 2);
    await page.evaluate("window.dispatchEvent(new Event('wimifarma:cashback-updated'))");
    await expect(balances).toHaveText([/3,00/, /3,00/]);
    await page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
    await expect(balances).toHaveText([/4,00/, /4,00/]);
    await page.clock.runFor(60_000);
    await expect(balances).toHaveText([/5,00/, /5,00/]); assert.equal(calls, 5);
    await page.evaluate("window.session={user:{id:'another-synthetic',name:'Outro cliente',role:'CUSTOMER'}};window.renderHeader()");
    await expect(balances).toHaveText(["Cashback ...", "Cashback ..."]);
    await expect.poll(() => calls).toBe(6);
    releaseCustomer();
    await expect(balances).toHaveText([/6,00/, /6,00/]);
    await page.evaluate("window.session=null;window.renderHeader()");
    await expect(balances).toHaveCount(0);
    await page.evaluate("window.dispatchEvent(new Event('focus'))");
    await page.clock.runFor(60_000); assert.equal(calls, 6);
    await page.evaluate("window.unmount();window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('wimifarma:cashback-updated'));document.dispatchEvent(new Event('visibilitychange'))");
    await page.clock.runFor(60_000); assert.equal(calls, 6);
  });
});
