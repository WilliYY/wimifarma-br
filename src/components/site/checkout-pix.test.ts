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
        isCustomer={true} paymentConfig={location.search==='?manual'?null:{publicKey:'TEST-synthetic',environment:'test',brands:[]}}/></CartProvider>);`,
    resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{ name: "pix-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({unoptimized,priority,fill,...props})=><img {...props}/>;",
      "next/script": "export default ()=>null;",
    };
    builder.onResolve({ filter: /^next\/(link|image|script)$|pix-discount-banner\.module\.css$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, async args => {
      if (args.path.endsWith(".css")) {
        const source = await readFile("src/components/site/pix-discount-banner.module.css", "utf8");
        const classes = Object.fromEntries([...source.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => [match[1], match[1]]));
        return { contents: `export default ${JSON.stringify(classes)}` };
      }
      return { contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() };
    });
  } }],
});
const css = (captureRoot ? readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css) : Promise.resolve("")).then(async source => `${source}\n${await readFile("src/components/site/pix-discount-banner.module.css", "utf8")}`);

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
    await expect(page.getByRole("group", { name: "Forma de pagamento", exact: true }).getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(summary.getByText("Desconto no Pix (3%)", { exact: true })).toHaveCount(0);
    await expect(summary.locator("strong")).toHaveText(/100,00/);
    await expect(page.getByRole("button", { name: "Escolha a forma de pagamento" })).toBeDisabled();
    if (captureRoot) await page.screenshot({ path: join(captureRoot, "checkout-sem-pix-390.png"), fullPage: true });
    await page.getByText("Pix", { exact: true }).click();
    await expect(summary.getByText("Desconto no Pix (3%)", { exact: true })).toBeVisible();
    await expect(summary.locator("strong")).toHaveText(/97,00/);
    if (captureRoot) await page.screenshot({ path: join(captureRoot, "checkout-pix-aplicado-390.png"), fullPage: true });
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

test("sem escolha de pagamento o handler também impede criar pedido", async () => {
  await fixture(390, async (page, orders) => {
    await page.getByText("Retirar na farmacia", { exact: true }).click();
    await page.getByLabel("Nome completo").fill("Cliente Sintético");
    await page.getByLabel("WhatsApp / telefone").fill("+55 (44) 99999-0000");
    await page.getByLabel(/^E-mail/).fill("buyer@example.invalid");
    const submit = page.getByRole("button", { name: "Escolha a forma de pagamento" });
    await expect(submit).toBeDisabled();
    await submit.evaluate((button: HTMLButtonElement) => {
      // Invoke the React callback directly to verify the guard beyond the disabled UI.
      const key = Object.keys(button).find(value => value.startsWith("__reactProps$"));
      if (!key) throw new Error("React event props unavailable");
      (button as unknown as Record<string, { onClick: () => void }>)[key].onClick();
    });
    await expect(page.getByRole("alert").filter({ hasText: "Escolha uma forma de pagamento para continuar." })).toBeVisible();
    assert.equal(orders.length, 0);
  });
});

test("checkout manual exige escolha e não converte cartão local em Pix ao trocar entrega", async () => {
  await fixture(320, async (page, orders) => {
    await page.getByText("Retirar na farmacia", { exact: true }).click();
    const summary = page.getByRole("region", { name: "Resumo da compra" });
    const pending = page.getByRole("button", { name: "Escolha a forma de pagamento" });
    await expect(pending).toBeDisabled();
    await expect(summary.locator("strong")).toHaveText(/100,00/);
    await page.getByText("Pix", { exact: true }).click();
    await expect(summary.locator("strong")).toHaveText(/97,00/);
    await page.getByText("Cartão", { exact: true }).click();
    await expect(summary.locator("strong")).toHaveText(/100,00/);
    await expect(page.getByRole("button", { name: "Confirmar pedido", exact: true })).toBeEnabled();
    await page.getByText("Receber em casa", { exact: true }).click();
    await expect(pending).toBeDisabled();
    await expect(page.getByRole("radio", { name: "Pix", exact: true })).not.toBeChecked();
    await expect(summary.getByText("Desconto no Pix (3%)", { exact: true })).toHaveCount(0);
    assert.equal(orders.length, 0);
  }, "/checkout?manual");
});

test("retomada usa o snapshot do pagamento sem exigir nova escolha nem criar pedido", async () => {
  await fixture(390, async (page, orders) => {
    await page.evaluate(() => sessionStorage.setItem("wimifarma-active-payment:guest", "synthetic-order"));
    await page.reload();
    await expect(page.getByLabel("Código Pix copia e cola")).toHaveValue("SYNTHETIC-PIX");
    await expect(page.getByText(/R\$\s*67,90/, { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Forma de pagamento", exact: true })).toHaveCount(0);
    assert.equal(orders.length, 0);
  });
});

test("Pix combina resgates e preserva o valor na resposta de pagamento", async () => {
  await fixture(390, async (page, orders) => {
    await page.getByText("Retirar na farmacia", { exact: true }).click();
    await page.getByText("Pix", { exact: true }).click();
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
    await expect(page.getByRole("heading", { name: "3% de desconto no Pix", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aproveitar", exact: true })).toHaveAttribute("href", "/catalogo?ordem=preco-asc");
    await expect(page.getByText("Escolha Pix no checkout. Frete à parte.", { exact: true })).toBeVisible();
    await expect(page.getByText("Seu cuidado com mais economia", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Wimifarma" })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await expect.poll(() => page.getByRole("img", { name: "Wimifarma" }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    if (captureRoot) {
      await mkdir(captureRoot, { recursive: true });
      await page.screenshot({ path: join(captureRoot, `pix-banner-${width}.png`), fullPage: true });
    }
  }, "/banner");
});
