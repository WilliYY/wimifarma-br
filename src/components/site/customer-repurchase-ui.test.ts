import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import { accountOrders } from "../../../scripts/fixtures/account-data";

const product = { id: "soap", name: "Sabonete sintético 90 g", slug: "sabonete-sintetico", imageUrl: null, category: "Higiene", unitPriceCents: 309, originalPriceCents: null, stock: 3, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
const extra = { ...product, id: "extra", name: "Outro produto", slug: "outro-produto", stock: 10 };
const order = { ...accountOrders[2], items: [
  { id: "line-soap", productId: "soap", productName: "Sabonete sintético 90 g", productImageUrl: null, quantity: 2, unitPriceCents: 100, totalCents: 200 },
  { id: "line-out", productId: "out", productName: "Item sem estoque", productImageUrl: null, quantity: 1, unitPriceCents: 100, totalCents: 100 },
  { id: "line-assisted", productId: "assisted", productName: "Item com atendimento", productImageUrl: null, quantity: 1, unitPriceCents: 100, totalCents: 100 },
  { id: "line-deleted", productId: null, productName: "Produto removido", productImageUrl: null, quantity: 1, unitPriceCents: 100, totalCents: 100 },
] };

async function fixture(run: (page: Page, requests: string[][]) => Promise<void>) {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CartProvider,useCart} from './src/components/site/cart-provider';import {CustomerOrderCard} from './src/components/site/customer-order-history';function State(){const cart=useCart();return <><pre data-testid="cart-state">{JSON.stringify(cart.items)}</pre><button onClick={()=>cart.addProduct(${JSON.stringify(extra)},1)}>Adicionar extra</button></>};createRoot(document.getElementById('root')).render(<CartProvider><CustomerOrderCard order={${JSON.stringify(order)}}/><State/></CartProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", platform: "browser", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "next-fixture", setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>", loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const requests: string[][] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/fixture.js"></script>' });
      if (url.pathname === "/api/carrinho/revisao") {
        const ids = route.request().postDataJSON().productIds as string[];
        requests.push(ids);
        return route.fulfill({ json: { data: { products: [product, { ...product, id: "out", stock: 0 }, { ...product, id: "assisted", requiresPrescription: true, prescriptionType: "CONTROLLED" }].filter(item => ids.includes(item.id)) } } });
      }
      if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: {} });
      return route.abort();
    });
    await page.addInitScript(items => { if (!localStorage.getItem("wimifarma-cart-v1")) localStorage.setItem("wimifarma-cart-v1", JSON.stringify(items)); }, [{ ...extra, quantity: 1 }, { ...product, unitPriceCents: 100, quantity: 1 }]);
    await page.goto("http://127.0.0.1:3197/");
    await expect(page.getByTestId("cart-state")).toContainText('"id":"extra"');
    await run(page, requests);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

const cartItems = async (page: Page) => JSON.parse(await page.getByTestId("cart-state").innerText()) as Array<{ id: string; quantity: number; unitPriceCents: number }>;

test("recompra usa preço e estoque atuais, mantém o carrinho e informa itens que não entraram", async () => {
  await fixture(async (page, requests) => {
    await page.getByRole("button", { name: "Comprar novamente", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("carrinho");
    assert.deepEqual(requests, [["soap", "out", "assisted"]]);
    assert.deepEqual((await cartItems(page)).map(({ id, quantity, unitPriceCents }) => ({ id, quantity, unitPriceCents })), [
      { id: "extra", quantity: 1, unitPriceCents: 309 }, { id: "soap", quantity: 3, unitPriceCents: 309 },
    ]);
    await expect(page.getByText(/Item sem estoque:/)).toBeVisible();
    await expect(page.getByText(/Item com atendimento:/)).toBeVisible();
    await expect(page.getByText(/Produto removido:/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver carrinho", exact: true })).toHaveAttribute("href", "/carrinho");
    await page.reload();
    await expect(page.getByTestId("cart-state")).toContainText('"quantity":3');
  });
});

test("recompra individual consulta só o produto escolhido e explica o limite atual", async () => {
  await fixture(async (page, requests) => {
    await page.getByText("Ver detalhes do pedido", { exact: false }).click();
    const button = page.getByRole("button", { name: "Comprar novamente Sabonete sintético 90 g", exact: true });
    await button.click();
    await expect(page.getByRole("status")).toContainText("carrinho");
    assert.deepEqual(requests, [["soap"]]);
    assert.equal((await cartItems(page)).find(item => item.id === "soap")!.quantity, 3);
    await button.click();
    await expect(page.getByRole("status")).toContainText("Nenhum");
    assert.equal((await cartItems(page)).find(item => item.id === "soap")!.quantity, 3);
  });
});

test("falha de consulta não altera o carrinho e permite tentar novamente", async () => {
  await fixture(async page => {
    await page.route("**/api/carrinho/revisao", route => route.fulfill({ status: 503, json: { error: "Consulta indisponível." } }));
    const before = await cartItems(page);
    const button = page.getByRole("button", { name: "Comprar novamente", exact: true });
    await button.click();
    await expect(page.getByRole("alert")).toContainText("Consulta indisponível");
    await expect(button).toBeEnabled();
    assert.deepEqual(await cartItems(page), before);
  });
});

test("consulta em andamento bloqueia repetição e preserva alterações feitas no carrinho", async () => {
  await fixture(async page => {
    let release: (() => void) | undefined;
    let count = 0;
    await page.route("**/api/carrinho/revisao", async route => {
      count++;
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: { data: { products: [product] } } });
    });
    const button = page.getByRole("button", { name: "Comprar novamente", exact: true });
    await button.click();
    await expect.poll(() => Boolean(release)).toBe(true);
    await expect(button).toBeDisabled();
    await page.getByRole("button", { name: "Adicionar extra" }).click();
    await expect(page.getByTestId("cart-state")).toContainText('"quantity":2');
    release!();
    await expect(page.getByRole("status")).toContainText("carrinho");
    assert.equal(count, 1);
    assert.equal((await cartItems(page)).find(item => item.id === "extra")!.quantity, 2);
  });
});
