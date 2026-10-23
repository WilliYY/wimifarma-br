import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";

function fixtures() {
  return Array.from({ length: 31 }, (_, index) => ({
    id: `synthetic-order-${index}`, number: `WIM-TESTE-${String(index + 1).padStart(3, "0")}`,
    customerId: null, customerName: `Cliente fictício ${index + 1}`, customerPhone: "00000000000", customerEmail: null,
    fulfillmentMethod: index % 2 ? "PICKUP" : "DELIVERY", paymentMethod: "CASH", paymentStatus: index % 3 ? "PAID" : "PENDING", status: "PENDING",
    requiresPrescriptionReview: false, prescriptionReviewedAt: null as string | null, subtotalCents: 3990, deliveryFeeCents: 0, totalCents: 3990,
    postalCode: null, street: "Rua de teste", addressNumber: "1", complement: null, neighborhood: "Centro", city: "Cidade sintética", state: "PR", notes: null,
    privacyConsentAt: "2026-10-22T12:00:00.000Z", createdAt: new Date(Date.UTC(2026, 9, 22, 12, 0, 31 - index)).toISOString(), updatedAt: "2026-10-22T12:00:00.000Z",
    items: [{ id: `synthetic-item-${index}`, orderId: `synthetic-order-${index}`, productId: null, productName: index % 2 ? "Sabonete de teste 90 g" : "Produto sintético 30 unidades",
      productSlug: "produto-sintetico", productImageUrl: null, unitPriceCents: 1995, quantity: 2, totalCents: 3990, shortageQuantity: 0,
      inventorySource: "DISTRIBUTOR", supplierCode: index % 2 ? "GAM" : "PROFARMA", ean: "7891234567895", eanSource: "offer", createdAt: "2026-10-22T12:00:00.000Z" }],
  }));
}

test("lista única de 30 pedidos agrupa origens nos detalhes e separa filas encerradas", { timeout: 90000 }, async () => {
  const orders = [...fixtures(), { ...fixtures()[0], id: "completed", number: "WIM-CONCLUIDO", status: "COMPLETED" }, { ...fixtures()[0], id: "refunded", number: "WIM-ESTORNADO", paymentStatus: "REFUNDED" }];
  orders[0].items.push({ ...orders[0].items[0], id: "pharmacy-item", inventorySource: "PHARMACY", supplierCode: "", productName: "Estoque da farmácia" });
  orders[0].items.push({ ...orders[0].items[0], id: "anb-item", supplierCode: "ANB", productName: "Produto ANB" });
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {OrdersPanel} from './src/components/admin/orders-panel';function Fixture(){const [value,setValue]=React.useState(${JSON.stringify(orders)});window.refreshOrders=()=>setValue(current=>current.map(order=>({...order})));return <OrdersPanel initialOrders={value} canManageCredits miaubyOrderAlertsEnabled/>;}createRoot(document.getElementById('root')).render(<Fixture/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "isolated-orders-navigation", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh:()=>{}});" }));
  } }] });
  const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390, 320]) {
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
      await expect(page.getByRole("button", { name: "Por distribuidora", exact: true })).toHaveCount(0);
      await expect(page.locator('article[data-order-id="completed"]')).toHaveCount(0);
      await expect(page.locator('article[data-order-id="refunded"]')).toHaveCount(0);
      await expect(page.locator("article[data-order-id]")).toHaveCount(30);
      const first = page.locator('article[data-order-id="synthetic-order-0"]');
      const toggle = first.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-001", exact: true });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      assert.ok((await first.boundingBox())!.height < (width < 600 ? 210 : 130), "a linha fechada precisa manter a densidade operacional");
      await expect(page.getByText("Miauby · avisos habilitados", { exact: true })).toBeVisible();
      await toggle.focus(); await page.keyboard.press("Enter");
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(first.getByText("EAN da oferta vinculada", { exact: true }).first()).toBeVisible();
      await expect(first.getByText("7891234567895", { exact: true }).first()).toBeVisible();
      await expect(first.getByRole("heading", { name: "Farmácia", exact: true })).toBeVisible();
      await expect(first.getByRole("heading", { name: "ANB", exact: true })).toBeVisible();
      await expect(first.getByText("Profarma", { exact: true }).last()).toBeVisible();
      await toggle.click();
      await page.getByRole("button", { name: "Próxima página", exact: true }).click();
      await expect(page.locator("article[data-order-id]")).toHaveCount(1);
      await expect(page.getByRole("heading", { name: "WIM-TESTE-031", exact: true })).toBeVisible();
      await page.getByRole("textbox", { name: "Buscar pedido", exact: true }).fill("7891234567895");
      await expect(page.locator("article[data-order-id]")).toHaveCount(30);
      await page.getByRole("textbox", { name: "Buscar pedido", exact: true }).fill("");
      await page.getByRole("button", { name: /^Concluídos/ }).click();
      await expect(page.locator("article[data-order-id]")).toHaveCount(1);
      await expect(page.getByRole("heading", { name: "WIM-CONCLUIDO", exact: true })).toBeVisible();
      await page.getByRole("button", { name: /^Cancelados \/ estornados/ }).click();
      await expect(page.getByRole("heading", { name: "WIM-ESTORNADO", exact: true })).toBeVisible();
      await page.getByRole("button", { name: /^Todos / }).click();
      await expect(page.locator("article[data-order-id]")).toHaveCount(30);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "sem rolagem horizontal da página");
      if (process.env.ADMIN_ORDERS_QA_OUTPUT) {
        await fs.mkdir(process.env.ADMIN_ORDERS_QA_OUTPUT, { recursive: true });
        await page.screenshot({ path: path.join(process.env.ADMIN_ORDERS_QA_OUTPUT, `pedidos-${width}.png`), fullPage: width < 600 });
        await first.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-001", exact: true }).click();
        await page.screenshot({ path: path.join(process.env.ADMIN_ORDERS_QA_OUTPUT, `detalhes-${width}.png`), fullPage: false });
      }
      await page.goto("http://127.0.0.1:3198/admin/pedidos?pedido=synthetic-order-30");
      await expect(page.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-031", exact: true })).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByText("Página 2 de 2 · até 30 pedidos por página", { exact: true })).toBeVisible();
      await page.goto("http://127.0.0.1:3198/admin/pedidos?pedido=completed");
      await expect(page.getByRole("button", { name: "Ver detalhes do pedido WIM-CONCLUIDO", exact: true })).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("article[data-order-id]")).toHaveCount(1);
      await page.goto("http://127.0.0.1:3198/admin/pedidos?pedido=synthetic-order-0");
      await expect(page.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-001", exact: true })).toHaveAttribute("aria-expanded", "true");
      await page.getByRole("textbox", { name: "Buscar pedido", exact: true }).fill("WIM-TESTE-002");
      const operatorOrder = page.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-002", exact: true });
      await operatorOrder.click();
      await page.evaluate("window.refreshOrders()");
      await expect(page.getByRole("textbox", { name: "Buscar pedido", exact: true })).toHaveValue("WIM-TESTE-002");
      await expect(operatorOrder).toHaveAttribute("aria-expanded", "true");
      await page.evaluate("history.pushState({}, '', '?pedido=synthetic-order-2');window.refreshOrders()");
      await expect(page.getByRole("textbox", { name: "Buscar pedido", exact: true })).toHaveValue("");
      const newTarget = page.getByRole("button", { name: "Ver detalhes do pedido WIM-TESTE-003", exact: true });
      await expect(newTarget).toHaveAttribute("aria-expanded", "true");
      await newTarget.click();
      await page.evaluate("window.refreshOrders()");
      await expect(newTarget).toHaveAttribute("aria-expanded", "false");
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
      await expect(row.getByRole("button", { name: "Confirmar", exact: true })).toBeDisabled();
      await expect(row.getByRole("combobox", { name: /^Pagamento/ })).toBeDisabled();
    }
  } finally { await browser.close(); }
});

test("ações percorrem etapas em ordem, conferem receita e reservam envio para entrega", async () => {
  for (const fulfillmentMethod of ["PICKUP", "DELIVERY"]) {
    let order = { ...fixtures()[0], fulfillmentMethod, paymentStatus: "PAID", requiresPrescriptionReview: fulfillmentMethod === "PICKUP" };
    const changes: string[] = [];
    const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {OrdersPanel} from './src/components/admin/orders-panel';createRoot(document.getElementById('root')).render(<OrdersPanel initialOrders={${JSON.stringify([order])}}/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "ordered-actions-navigation", setup(builder) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh:()=>{}});" }));
    } }] });
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.route("**/*", async route => {
        const request = route.request();
        if (new URL(request.url()).hostname !== "127.0.0.1") return route.abort();
        if (request.method() === "PATCH") {
          const body = request.postDataJSON();
          if (body.status) { changes.push(body.status); order = { ...order, status: body.status }; }
          if (body.prescriptionReviewed) order = { ...order, prescriptionReviewedAt: "2026-10-22T13:00:00.000Z" };
          return route.fulfill({ json: { data: order } });
        }
        return route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' });
      });
      await page.goto("http://127.0.0.1:3202");
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.getByRole("button", { name: `Ver detalhes do pedido ${order.number}`, exact: true }).click();
      if (fulfillmentMethod === "PICKUP") await expect(page.getByText("Saiu para entrega / envio", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect(page.getByRole("listitem").filter({ hasText: "Confirmar" })).toHaveClass(/bg-emerald-50/);
      await page.getByRole("button", { name: "Separar", exact: true }).click();
      const ready = fulfillmentMethod === "PICKUP" ? "Pronto para retirada" : "Pronto para envio";
      if (fulfillmentMethod === "PICKUP") {
        await expect(page.getByRole("button", { name: ready, exact: true })).toBeDisabled();
        await page.getByRole("checkbox", { name: "Farmacêutico conferiu a receita" }).check();
        await page.getByRole("button", { name: "Registrar conferência farmacêutica", exact: true }).click();
      }
      await page.getByRole("button", { name: ready, exact: true }).click();
      if (fulfillmentMethod === "DELIVERY") await page.getByRole("button", { name: "Saiu para entrega / envio", exact: true }).click();
      await page.getByRole("button", { name: "Concluir", exact: true }).click();
      await expect(page.locator("article[data-order-id]")).toHaveCount(0);
      assert.deepEqual(changes, fulfillmentMethod === "PICKUP" ? ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] : ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]);
      await page.getByRole("button", { name: /^Concluídos/ }).click();
      await expect(page.getByRole("heading", { name: order.number, exact: true })).toBeVisible();
    } finally { await browser.close(); }
  }
});

test("hidratação mantém horário de Brasília entre servidor UTC e navegador sem recriar a lista", async () => {
  const props = `initialOrders={${JSON.stringify(fixtures().slice(0, 1))}}`;
  const plugin = { name: "hydration-router", setup(builder: import("esbuild").PluginBuild) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh:()=>{}});" }));
  } };
  const server = await build({ stdin: { contents: `import React from 'react';import {renderToString} from 'react-dom/server';import {OrdersPanel} from './src/components/admin/orders-panel';export const html=renderToString(<OrdersPanel ${props}/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/*", "react-dom/*"], plugins: [plugin] });
  const serverModule = { exports: {} as { html: string } };
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    runInNewContext(server.outputFiles[0].text, { module: serverModule, exports: serverModule.exports, require: createRequire(import.meta.url), process, console });
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ; else process.env.TZ = originalTimezone;
  }
  const client = await build({
    stdin: { contents: `import React,{useEffect} from 'react';import {hydrateRoot} from 'react-dom/client';import {OrdersPanel} from './src/components/admin/orders-panel';window.__hydrationErrors=[];function Fixture(){useEffect(()=>{document.documentElement.dataset.hydrated='true'},[]);return <OrdersPanel ${props}/>};hydrateRoot(document.getElementById('root'),<Fixture/>,{onRecoverableError:error=>window.__hydrationErrors.push(error.message)});`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [plugin],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ timezoneId: "America/Sao_Paulo" });
    await page.route("**/*", route => route.request().method() === "GET" && new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fulfill({ contentType: "text/html; charset=utf-8", body: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><div id="root">${serverModule.exports.html}</div></body></html>` }) : route.abort());
    await page.goto("http://127.0.0.1:3200");
    await page.addScriptTag({ content: client.outputFiles[0].text });
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const hydrationErrors = await page.evaluate(() => (window as unknown as { __hydrationErrors: string[] }).__hydrationErrors);
    assert.deepEqual(hydrationErrors, []);
    await expect(page.locator("article[data-order-id]").first()).toContainText(/22\/10\/2026.*09:00/);
  } finally { await browser.close(); }
});
