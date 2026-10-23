import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";

function fixtures() {
  return Array.from({ length: 31 }, (_, index) => ({
    id: `synthetic-order-${index}`, number: `WIM-TESTE-${String(index + 1).padStart(3, "0")}`,
    customerId: null, customerName: `Cliente fictício ${index + 1}`, customerPhone: "00000000000", customerEmail: null,
    fulfillmentMethod: index % 2 ? "PICKUP" : "DELIVERY", paymentMethod: "CASH", paymentStatus: index % 3 ? "PAID" : "PENDING", status: "PENDING",
    requiresPrescriptionReview: false, prescriptionReviewedAt: null, subtotalCents: 3990, deliveryFeeCents: 0, totalCents: 3990,
    postalCode: null, street: "Rua de teste", addressNumber: "1", complement: null, neighborhood: "Centro", city: "Cidade sintética", state: "PR", notes: null,
    privacyConsentAt: "2026-10-22T12:00:00.000Z", createdAt: new Date(Date.UTC(2026, 9, 22, 12, 0, 31 - index)).toISOString(), updatedAt: "2026-10-22T12:00:00.000Z",
    items: [{ id: `synthetic-item-${index}`, orderId: `synthetic-order-${index}`, productId: null, productName: index % 2 ? "Sabonete de teste 90 g" : "Produto sintético 30 unidades",
      productSlug: "produto-sintetico", productImageUrl: null, unitPriceCents: 1995, quantity: 2, totalCents: 3990, shortageQuantity: 0,
      inventorySource: "DISTRIBUTOR", supplierCode: index % 2 ? "GAM" : "PROFARMA", ean: "7891234567895", eanSource: "offer", createdAt: "2026-10-22T12:00:00.000Z" }],
  }));
}

test("30 pedidos compactos preservam detalhes, busca EAN, paginação e conferência por distribuidora no desktop e celular", { timeout: 90000 }, async () => {
  const orders = fixtures();
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {OrdersPanel} from './src/components/admin/orders-panel';createRoot(document.getElementById('root')).render(<OrdersPanel initialOrders={${JSON.stringify(orders)}} canManageCredits miaubyOrderAlertsEnabled/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "isolated-orders-navigation", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh:()=>{}});" }));
  } }] });
  const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => {
        const request = route.request(); const url = new URL(request.url());
        if (url.hostname !== "127.0.0.1" || request.method() !== "GET") { errors.push(`Unexpected request ${request.method()}`); return route.abort(); }
        if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
        if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
        return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body class="bg-surface-subtle"><main class="mx-auto max-w-[1600px] p-4 sm:p-6"><div id="root"></div></main><script src="/fixture.js"></script></body></html>' });
      });
      await page.goto("http://127.0.0.1:3198/admin/pedidos");
      await expect(page.locator("article[data-order-id]")).toHaveCount(30);
      const first = page.locator('article[data-order-id="synthetic-order-0"]');
      const toggle = first.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-001", exact: true });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      assert.ok((await first.boundingBox())!.height < (width < 600 ? 210 : 130), "a linha fechada precisa manter a densidade operacional");
      await expect(page.getByText("Miauby · avisos habilitados", { exact: true })).toBeVisible();
      await toggle.focus(); await page.keyboard.press("Enter");
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(first.getByText("EAN da oferta vinculada", { exact: true })).toBeVisible();
      await expect(first.getByText("7891234567895", { exact: true })).toBeVisible();
      await expect(first.getByText("Profarma", { exact: true }).last()).toBeVisible();
      await toggle.click();
      await page.getByRole("button", { name: "Próxima página", exact: true }).click();
      await expect(page.locator("article[data-order-id]")).toHaveCount(1);
      await expect(page.getByRole("heading", { name: "WIM-TESTE-031", exact: true })).toBeVisible();
      await page.getByRole("textbox", { name: "Buscar pedido", exact: true }).fill("7891234567895");
      await expect(page.locator("article[data-order-id]")).toHaveCount(30);
      await page.getByRole("button", { name: "Por distribuidora", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Profarma", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "GAM / eGAM", exact: true })).toBeVisible();
      await expect(page.getByText("Pedidos pendentes de pagamento continuam identificados para conferência.", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Por pedido", exact: true }).click();
      await page.getByRole("textbox", { name: "Buscar pedido", exact: true }).fill("");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "sem rolagem horizontal da página");
      if (process.env.ADMIN_ORDERS_QA_OUTPUT) {
        await fs.mkdir(process.env.ADMIN_ORDERS_QA_OUTPUT, { recursive: true });
        await page.screenshot({ path: path.join(process.env.ADMIN_ORDERS_QA_OUTPUT, `pedidos-${width}.png`), fullPage: width < 600 });
        await first.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-001", exact: true }).click();
        await page.screenshot({ path: path.join(process.env.ADMIN_ORDERS_QA_OUTPUT, `detalhes-${width}.png`), fullPage: false });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});

test("avisos financeiros ficam visíveis recolhidos e pagamentos incertos ou de teste não avançam", async () => {
  const scenarios = [
    { status: "PAID", environment: "test", warning: "Homologação · não separar" },
    { status: "UNKNOWN", environment: "production", warning: "Pagamento incerto · não separar" },
    { status: "SUBMITTING", environment: "production", warning: "Pagamento incerto · não separar" },
    { status: "REVIEW", environment: "production", warning: "Conferir pagamento · não separar" },
    { status: "PARTIALLY_REFUNDED", environment: "production", warning: "Reembolso parcial · conferir" },
  ];
  const orders = scenarios.map((scenario, index) => ({ ...fixtures()[index], paymentMethod: "ONLINE", paymentStatus: "PAID", onlinePayment: { ...scenario, statusDetail: null, providerOrderId: null } }));
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {OrdersPanel} from './src/components/admin/orders-panel';createRoot(document.getElementById('root')).render(<OrdersPanel initialOrders={${JSON.stringify(orders)}}/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "isolated-financial-navigation", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh:()=>{}});" }));
  } }] });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/*", route => route.request().method() === "GET" && new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }) : route.abort());
    await page.goto("http://127.0.0.1:3199");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    for (const [index, scenario] of scenarios.entries()) {
      const row = page.locator(`article[data-order-id="synthetic-order-${index}"]`);
      await expect(row.getByText(scenario.warning, { exact: true })).toBeVisible();
      await row.getByRole("button", { name: `Ver detalhes do pedido ${orders[index].number}`, exact: true }).click();
      await expect(row.getByRole("combobox", { name: /^Andamento/ })).toBeDisabled();
      await expect(row.getByRole("combobox", { name: /^Pagamento/ })).toBeDisabled();
    }
  } finally { await browser.close(); }
});
