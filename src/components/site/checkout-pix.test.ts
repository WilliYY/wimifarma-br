import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3194";
const captureRoot = process.env.PIX_CAPTURE_ROOT;
const bundle = build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {CartProvider} from './src/components/site/cart-provider';
    import {CheckoutPage} from './src/components/site/checkout-page';
    import {PixDiscountBanner} from './src/components/site/pix-discount-banner';
    createRoot(document.getElementById('root')).render(location.pathname==='/banner'?<PixDiscountBanner/>:
      <CartProvider><CheckoutPage initialCustomer={{name:'',phone:'',email:'',street:'',neighborhood:''}}
        isCustomer={true} paymentConfig={{publicKey:'TEST-synthetic',environment:'test',brands:[]}}/></CartProvider>);`,
    resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{ name: "pix-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({unoptimized,priority,fill,...props})=><img {...props}/>;",
      "next/script": "export default ()=>null;",
    };
    builder.onResolve({ filter: /^next\/(link|image|script)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});
const css = captureRoot ? readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css) : Promise.resolve("");

async function fixture(width: number, run: (page: Page, orders: Record<string, unknown>[]) => Promise<void>, path = "/checkout") {
  if (captureRoot) await mkdir(captureRoot, { recursive: true });
  const browser = await chromium.launch();
  const orders: Record<string, unknown>[] = [];
  const errors: string[] = [];
  try {
    const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: "reduce" });
    await context.addInitScript(() => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([
      { id: "synthetic-item", slug: "synthetic-item", name: "Produto sintético", imageUrl: null, category: "Teste", unitPriceCents: 10000, originalPriceCents: null, stock: 10, requiresPrescription: false, isPopularPharmacy: false, quantity: 1 },
    ])));
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      const json = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
      if (["/checkout", "/banner"].includes(url.pathname)) return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: await css });
      if (url.pathname === "/brand/logo-wimifarma.svg") return route.fulfill({ contentType: "image/svg+xml", body: await readFile("public/brand/logo-wimifarma.svg") });
      if (url.pathname === "/api/health") return json({ timestamp: "2026-10-19T12:00:00.000Z" });
      if (url.pathname === "/api/minha-conta/cashback") return json({ data: { balance: "10.00" } });
      if (url.pathname === "/api/minha-conta/club") return json({ data: { member: true, joinedAt: null, balancePoints: 2000, pendingPoints: 0, lifetimeEarnedPoints: 2000, lifetimeRedeemedPoints: 0, transactions: [] } });
      if (url.pathname === "/api/pedidos") {
        const body = request.postDataJSON(); orders.push(body);
        assert.equal(body.onlineMethod, "pix");
        assert.equal(body.cashbackRedeemCents, 1000); assert.equal(body.wimicoinsRedeemPoints, 2000);
        assert.equal(Object.hasOwn(body, "pixDiscountCents"), false);
        return json({ data: { id: "synthetic-order", number: "WF-SYNTHETIC", totalCents: 6790, paymentMethod: "ONLINE" } });
      }
      if (url.pathname === "/api/pagamentos/synthetic-order") return json({ data: { orderId: "synthetic-order", number: "WF-SYNTHETIC", amountCents: 6790, status: "PENDING", statusDetail: null, pixCode: "SYNTHETIC-PIX", pixExpiresAt: new Date(Date.now() + 7_200_000).toISOString(), payerEmail: "buyer@example.invalid", qrDataUrl: null, environment: "test", publicKey: "TEST-synthetic", method: "pix" } });
      return route.abort();
    });
    await page.goto(`${origin}${path}`);
    if (path === "/checkout") await expect(page.getByRole("heading", { name: "Finalize sua compra" })).toBeVisible();
    await run(page, orders);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("Pix, cartão e dinheiro mostram o total correspondente sem criar pedido", async () => {
  await fixture(390, async (page, orders) => {
    await page.getByText("Retirar na farmacia", { exact: true }).click();
    const summary = page.getByRole("region", { name: "Resumo da compra" });
    await expect(summary.getByText("Desconto no Pix (3%)", { exact: true })).toBeVisible();
    await expect(summary.locator("strong")).toHaveText(/97,00/);
    for (const method of ["Cartão", "Dinheiro na retirada"]) {
      await page.getByText(method, { exact: true }).click();
      await expect(page.getByRole("radio", { name: method, exact: true })).toBeChecked();
      await expect(summary.getByText("Desconto no Pix (3%)", { exact: true })).toHaveCount(0);
      await expect(summary.locator("strong")).toHaveText(/100,00/);
    }
    await page.getByText("Pix", { exact: true }).click();
    await expect(summary.locator("strong")).toHaveText(/97,00/);
    assert.equal(orders.length, 0);
  });
});

test("Pix combina resgates e preserva o valor na resposta de pagamento", async () => {
  await fixture(390, async (page, orders) => {
    await page.getByText("Retirar na farmacia", { exact: true }).click();
    await page.getByRole("checkbox", { name: "Usar saldo de cashback" }).check();
    await page.getByRole("checkbox", { name: "Usar saldo de WimiCoins" }).check();
    const summary = page.getByRole("region", { name: "Resumo da compra" });
    await expect(summary.locator("strong")).toHaveText(/67,90/);
    await expect(summary.getByText(/2,10/)).toBeVisible();
    if (captureRoot) await page.screenshot({ path: join(captureRoot, "pix-checkout-390.png"), fullPage: true });
    await page.getByLabel("Nome completo").fill("Cliente Sintético");
    await page.getByLabel("WhatsApp / telefone").fill("+55 (44) 99999-0000");
    await page.getByLabel("E-mail", { exact: true }).fill("buyer@example.invalid");
    await page.getByRole("button", { name: "Gerar Pix e finalizar" }).click();
    await expect(page.getByLabel("Código Pix copia e cola")).toHaveValue("SYNTHETIC-PIX");
    await expect(page.getByText(/R\$\s*67,90/, { exact: true })).toBeVisible();
    assert.equal(orders.length, 1);
  });
});

test("banner Pix mantém marca, oferta e link em telas pequenas e grandes", async () => {
  for (const width of [320, 390, 768, 1440]) await fixture(width, async page => {
    await expect(page.getByRole("heading", { name: "Pague com Pix e ganhe 3% de desconto." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aproveitar no Pix" })).toHaveAttribute("href", "/catalogo?ordem=preco-asc");
    await expect(page.getByRole("img", { name: "Wimifarma" })).toBeVisible();
    if (captureRoot) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.getByRole("img", { name: "Wimifarma" }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), true);
      await mkdir(captureRoot, { recursive: true });
      await page.screenshot({ path: join(captureRoot, `pix-banner-${width}.png`), fullPage: true });
    }
  }, "/banner");
});
