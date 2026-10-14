import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { defaultShippingSettings } from "./schema";

async function fixtureBundle(contents: string) {
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';${contents}`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  return bundle.outputFiles[0].text;
}

test("orders show historical posting location above recipient and filter local, travel and pending shipments on mobile", async () => {
  const quote = { provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 2000, deliveryDays: 4, postalCode: "01001000", fingerprint: "a".repeat(64), revision: 1, expiresAt: 1 };
  const base = { customerId: null, customerName: "Cliente sintético", customerPhone: "00000000000", customerEmail: null, fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", paymentStatus: "PAID", status: "PENDING", requiresPrescriptionReview: false, prescriptionReviewedAt: null, subtotalCents: 5000, deliveryFeeCents: 2000, totalCents: 7000, street: "Rua sintética", addressNumber: "1", city: "São Paulo", state: "SP", postalCode: "01001000", items: [], createdAt: new Date(0).toISOString() };
  const orders = [
    { ...base, id: "local", number: "LOCAL", shippingQuote: { ...quote, postingLocation: { city: "Ivaté", state: "PR", requiresTravel: false, pointName: "Agência sintética" } } },
    { ...base, id: "travel", number: "VIAGEM", shippingQuote: { ...quote, postingLocation: { city: "Umuarama", state: "PR", requiresTravel: true } } },
    { ...base, id: "pending", number: "LEGADO", shippingQuote: quote },
    { ...base, id: "delivery", number: "ENTREGA LOCAL", shippingQuote: null },
  ];
  const script = await fixtureBundle(`import {OrdersPanel} from './src/components/admin/orders-panel';createRoot(document.getElementById('root')).render(<OrdersPanel initialOrders={${JSON.stringify(orders)}}/>);`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }));
    await page.goto("http://127.0.0.1:3196");
    await page.addScriptTag({ content: script });
    const local = page.locator("article").filter({ has: page.getByRole("heading", { name: "LOCAL", exact: true }) });
    const travel = page.locator("article").filter({ has: page.getByRole("heading", { name: "VIAGEM", exact: true }) });
    const pending = page.locator("article").filter({ has: page.getByRole("heading", { name: "LEGADO", exact: true }) });
    await expect(local.getByText("Postagem em Ivaté/PR", { exact: true })).toBeVisible();
    await expect(local.getByRole("region", { name: "Postagem do pedido" })).toHaveClass(/bg-emerald-50/);
    await expect(travel.getByText("Levar para Umuarama/PR", { exact: true })).toBeVisible();
    await expect(travel.getByRole("region", { name: "Postagem do pedido" })).toHaveClass(/bg-amber-50/);
    await expect(pending.getByText("Local de postagem: confirmação pendente", { exact: true })).toBeVisible();
    await expect(local.getByText("Destinatário · entrega", { exact: true })).toBeVisible();
    assert.equal(await local.evaluate(article => {
      const posting = article.querySelector('[aria-label="Postagem do pedido"]');
      const customer = [...article.querySelectorAll("p")].find(p => p.textContent === "Cliente");
      return Boolean(posting && customer && posting.compareDocumentPosition(customer) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), true);
    const filter = page.getByLabel("Filtrar por cidade de postagem", { exact: true });
    await filter.selectOption("Umuarama/PR");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(travel).toBeVisible();
    await filter.selectOption("PENDING");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(pending).toBeVisible();
    await filter.selectOption("ALL");
    await expect(page.locator("article")).toHaveCount(4);
    await expect(page.locator("article").filter({ has: page.getByRole("heading", { name: "ENTREGA LOCAL", exact: true }) }).getByRole("region", { name: "Postagem do pedido" })).toHaveCount(0);
  } finally { await browser.close(); }
});

test("posting configuration saves city, state and optional point with revision and removes blank mapping on mobile", async () => {
  const script = await fixtureBundle("import {ShippingPanel} from './src/components/admin/shipping-panel';createRoot(document.getElementById('root')).render(<ShippingPanel callbackUrl='https://example.invalid/callback'/>);");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const origin = "http://127.0.0.1:3197";
    let settings = { ...defaultShippingSettings, contactEmail: "synthetic@example.invalid", serviceIds: [1, 35], postingLocations: [{ serviceId: 1, city: "Ivaté", state: "PR", pointName: "Agência sintética" }] };
    const saved: { settings: typeof settings; revision: number }[] = [];
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script });
      if (url.pathname !== "/api/admin/fretes") return route.abort();
      if (route.request().method() === "PUT") { const body = route.request().postDataJSON(); saved.push(body); settings = body.settings; }
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { settings, revision: 7 + saved.length, applicationConfigured: true, connected: true, products: [] } }) });
    });
    await page.goto(origin);
    await expect(page.getByLabel("Cidade de postagem · serviço 1", { exact: true })).toHaveValue("Ivaté");
    await expect(page.getByLabel("Cidade de postagem · serviço 35", { exact: true })).toHaveValue("");
    await expect(page.getByText("Local de postagem: confirmação pendente", { exact: true })).toBeVisible();
    await page.getByLabel("Cidade de postagem · serviço 35", { exact: true }).fill("Umuarama");
    await page.getByLabel("Ponto de postagem (opcional) · serviço 35", { exact: true }).fill("Ponto sintético");
    await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
    await expect.poll(() => saved.length).toBe(1);
    await expect(page.getByRole("status")).toHaveText("Configuração salva.");
    assert.equal(saved[0].revision, 7);
    assert.deepEqual(saved[0].settings.postingLocations.find(location => location.serviceId === 35), { serviceId: 35, city: "Umuarama", state: "PR", pointName: "Ponto sintético" });
    await page.getByLabel("Cidade de postagem · serviço 35", { exact: true }).fill("");
    await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
    await expect.poll(() => saved.length).toBe(2);
    assert.equal(saved[1].revision, 8);
    assert.equal(saved[1].settings.postingLocations.some(location => location.serviceId === 35), false);
    assert.equal(saved[1].settings.postingLocations[0].city, "Ivaté");
  } finally { await browser.close(); }
});
