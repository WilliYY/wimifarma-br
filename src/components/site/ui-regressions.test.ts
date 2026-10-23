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
    "./cart-provider": `import {useState} from 'react';export function useCart(){const [subtotal,setSubtotal]=useState(1000);window.changeCart=setSubtotal;return {hydrated:true,items:[{id:'synthetic',name:'Produto sintético',slug:'synthetic',quantity:1,unitPriceCents:subtotal,requiresPrescription:false,isPopularPharmacy:false}],itemCount:1,subtotalCents:subtotal,clearCart:()=>{}};}`,
    "@/hooks/use-checkout-session": `import {useState} from 'react';export function useCheckoutSession(initial){const [draft,setDraft]=useState({...initial,fulfillmentMethod:'PICKUP',paymentMethod:'CASH'});return {draft,setDraft,ready:true,clearDraft:()=>{}};}`,
  };
  const entry = kind === "header"
    ? "import {SiteHeader} from './src/components/site/site-header';window.renderHeader=async()=>root.render(await SiteHeader());await window.renderHeader();"
    : kind === "checkout"
      ? "import {CheckoutPage} from './src/components/site/checkout-page';function CheckoutFixture(){const [owner,setOwner]=React.useState('synthetic');window.changeOwner=setOwner;return <CheckoutPage isCustomer draftOwner={owner} initialCustomer={{name:'Cliente Sintético',phone:'44999999999',email:'test@example.invalid',street:'',neighborhood:''}}/>;}root.render(<CheckoutFixture/>);"
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
      if (url.pathname === "/api/minha-conta/club") return route.fulfill({ json: { data: { member: false, joinedAt: null, balancePoints: 0, pendingPoints: 0, lifetimeEarnedPoints: 0, lifetimeRedeemedPoints: 0, transactions: [] } } });
      if (url.pathname === "/api/minha-conta/creditos") return route.fulfill({ json: { data: { balanceCents: 0, availableCents: 0, reservedCents: 0, reviewRequired: false, transactions: [] } } });
      return route.abort();
    });
    try { await run(page); } catch (error) { if (errors.length) throw new Error(errors.join("; "), { cause: error }); throw error; }
  } finally { await browser.close(); }
}

const product = (name: string) => ({ id: name, name, slug: name.toLowerCase(), activeIngredients: [], price: "10.00", imageUrl: null });

test("busca por assunto apresenta Rx sem foto/promoção e mantém a navegação do autocomplete", async () => {
  await fixture("search", async page => {
    const rx = { ...product("Losartana 50mg"), brand: "Fabricante", requiresPrescription: true, prescriptionType: "ORDINARY", imageUrl: "/rx.webp", promotionalPrice: "8.00" };
    await page.route("**/api/produtos/busca?*", route => route.fulfill({ json: { data: { products: [rx], relatedProducts: [] } } }));
    await page.clock.install();
    await page.goto("http://127.0.0.1:3198");
    const input = page.getByRole("combobox");
    await input.fill("pressão"); await page.clock.runFor(250);
    const result = page.getByRole("option", { name: /Losartana/ });
    await expect(result).toBeVisible();
    await expect(result.locator("[data-prescription-search]")).toHaveCount(1);
    await expect(result.locator("img")).toHaveCount(0);
    await expect(result).not.toContainText(/10,00|OFF|cashback|Pix|frete/i);
    await input.press("ArrowDown");
    assert.equal(await input.getAttribute("aria-activedescendant"), await result.getAttribute("id"));
    await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=press%C3%A3o"]);
    await input.click(); await input.fill("losartana"); await page.clock.runFor(250);
    await expect(page.getByRole("option", { name: /Losartana/ }).locator("img")).toHaveCount(1);
  });
});

test("busca aproximada preserva o texto digitado, a URL e a apresentação neutra de Rx", async () => {
  await fixture("search", async page => {
    const rx = { ...product("Losartana 50mg"), requiresPrescription: true, prescriptionType: "ORDINARY", imageUrl: "/rx.webp", promotionalPrice: "8.00" };
    await page.route("**/api/produtos/busca?*", route => {
      const query = new URL(route.request().url()).searchParams.get("q");
      return route.fulfill({ json: { data: { products: [rx], relatedProducts: [], correctedQuery: query === "pressaoo" ? "pressao" : null } } });
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:3198");
    const input = page.getByRole("combobox");
    const notice = page.getByText("Resultados aproximados para “pressao”.", { exact: true });
    await input.fill("pressaoo"); await page.clock.runFor(250);
    await expect(notice).toBeVisible();
    await expect(input).toHaveValue("pressaoo");
    const result = page.getByRole("option", { name: /Losartana/ });
    await expect(result.locator("[data-prescription-search]")).toHaveCount(1);
    await expect(result.locator("img")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ver todos os resultados" })).toHaveAttribute("href", "/busca?q=pressaoo");
    await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=pressaoo"]);
    await input.click(); await input.fill("losartana");
    await expect(notice).toHaveCount(0);
    await page.clock.runFor(250);
    await expect(result.locator("img")).toHaveCount(1);
    await expect(page.getByText(/Resultados aproximados para/)).toHaveCount(0);
    await expect(input).toHaveValue("losartana");
  });
});

test("Enter opens current search immediately, including during debounce and after arrow selection", async () => {
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
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=Nivea"]);
    await expect(page.getByRole("option", { name: /Dove/ })).toHaveCount(0);
    await input.press("Tab"); await input.click();
    await page.clock.runFor(250);
    await expect(page.getByRole("option", { name: /Nivea/ })).toBeVisible();
    await input.press("ArrowDown"); await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=Nivea", "/busca?q=Nivea"]);
  });
});

test("cashback label, summary and order request retain the explicitly selected amount when the cart grows", async () => {
  await fixture("checkout", async page => {
    await page.route("**/api/minha-conta/cashback", route => route.fulfill({ json: { data: { balance: "30.00" } } }));
    let posted: { cashbackRedeemCents: number } | undefined;
    await page.route("**/api/pedidos", route => { posted = route.request().postDataJSON(); return route.fulfill({ status: 422, json: { error: "Pedido sintético interceptado" } }); });
    await page.goto("http://127.0.0.1:3198");
    await page.getByRole("checkbox", { name: "Usar saldo de cashback" }).check();
    await expect(page.getByRole("checkbox", { name: "Usar saldo de cashback" })).toBeChecked();
    await page.evaluate("window.changeCart(2000)");
    await expect(page.getByText(/Usar R\$\s*10,00 neste pedido/)).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Usar saldo de cashback" })).toBeChecked();
    await expect(page.locator("dl dd").filter({ hasText: /10,00/ })).toHaveText(/− R\$\s*10,00/);
    await page.getByRole("radio", { name: "Pix", exact: true }).check();
    await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Pedido sintético interceptado");
    assert.equal(posted?.cashbackRedeemCents, 1000);
    await page.evaluate("window.changeCart(500)");
    await expect(page.getByText(/Usar R\$\s*5,00 neste pedido/)).toBeVisible();
    await page.getByRole("button", { name: "Atualizar saldo de cashback" }).click();
    await expect(page.getByRole("checkbox", { name: "Usar saldo de cashback" })).not.toBeChecked();
  });
});

test("cashback selection does not transfer to another checkout account", async () => {
  await fixture("checkout", async page => {
    await page.route("**/api/minha-conta/cashback", route => route.fulfill({ json: { data: { balance: "30.00" } } }));
    await page.goto("http://127.0.0.1:3198");
    const checkbox = page.getByRole("checkbox", { name: "Usar saldo de cashback" });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await page.evaluate("window.changeOwner('another-synthetic')");
    await expect(checkbox).not.toBeChecked();
    await expect(page.locator("dl dt").filter({ hasText: "Cashback" })).toHaveCount(0);
  });
});

test("cart changes preserve chosen cashback but require WimiCoins selection again", async () => {
  await fixture("checkout", async page => {
    await page.route("**/api/minha-conta/cashback", route => route.fulfill({ json: { data: { balance: "10.00" } } }));
    await page.route("**/api/minha-conta/club", route => route.fulfill({ json: { data: { member: true, joinedAt: "2026-10-14T00:00:00.000Z", balancePoints: 500, pendingPoints: 0, lifetimeEarnedPoints: 500, lifetimeRedeemedPoints: 0, transactions: [] } } }));
    await page.goto("http://127.0.0.1:3198");
    await page.evaluate("window.changeCart(2000)");
    const cashback = page.getByRole("checkbox", { name: "Usar saldo de cashback" });
    const coins = page.getByRole("checkbox", { name: "Usar saldo de WimiCoins" });
    await cashback.check(); await coins.check();
    await expect(coins).toBeChecked();
    await page.evaluate("window.changeCart(3000)");
    await expect(cashback).toBeChecked();
    await expect(coins).not.toBeChecked();
    await expect(page.getByText(/Usar R\$\s*10,00 neste pedido/)).toBeVisible();
    await expect(page.locator("dl dt").filter({ hasText: "WimiCoins" })).toHaveCount(0);
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
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=Nivea"]);
    await input.press("Tab"); await input.click();
    await page.clock.runFor(250);
    await expect(page.getByRole("option", { name: /Nivea/ })).toBeVisible();
    releasePrevious(); await previousFinished;
    await expect(page.getByRole("option", { name: /Dove/ })).toHaveCount(0);
    await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=Nivea", "/busca?q=Nivea"]);
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
