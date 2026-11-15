import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { defaultShippingSettings } from "./schema";

async function fixtureBundle(contents: string) {
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';${contents}`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "fixture-next-navigation", setup(builder) {
    // Standalone fixtures have no Next App Router; shortage actions call useRouter while rendering.
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh:()=>{}});" }));
  } }] });
  return bundle.outputFiles[0].text;
}

test("orders show historical posting location above recipient and filter local, travel and pending shipments on mobile", async () => {
  const quote = { provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 2000, deliveryDays: 4, postalCode: "01001000", fingerprint: "a".repeat(64), revision: 1, expiresAt: 1 };
  const base = { customerId: null, customerName: "Cliente sintético", customerPhone: "00000000000", customerEmail: null, fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", paymentStatus: "PAID", status: "PENDING", requiresPrescriptionReview: false, prescriptionReviewedAt: null, subtotalCents: 5000, deliveryFeeCents: 2000, totalCents: 7000, street: "Rua sintética", addressNumber: "1", city: "São Paulo", state: "SP", postalCode: "01001000", items: [], createdAt: new Date(0).toISOString() };
  const frenetQuote = {
    ...quote, provider: "frenet", serviceId: 3298, providerServiceCode: "03298",
    packaging: { version: 1, calculationMethod: "provider-conservative-envelope", inputMeasurementBasis: "measured", packages: [{ weightGrams: 500, lengthCm: 25, widthCm: 15, heightCm: 10, insuranceValueCents: 0, items: [{ productId: "synthetic-a", quantity: 1 }] }] },
    postingLocation: { city: "Ivaté", state: "PR", requiresTravel: false, pointName: "AC Ivaté" },
  };
  const orders = [
    { ...base, id: "local", number: "LOCAL", requiresPrescriptionReview: true, shippingQuote: { ...quote, packaging: { version: 1, calculationMethod: "provider-conservative-envelope", inputMeasurementBasis: "estimated", packages: [{ weightGrams: 5000, lengthCm: 52.8, widthCm: 51.8, heightCm: 35, insuranceValueCents: 9990, items: [{ productId: "synthetic-a", quantity: 10 }] }] }, postingLocation: { city: "Ivaté", state: "PR", requiresTravel: false, pointName: "Agência sintética" } } },
    { ...base, id: "travel", number: "VIAGEM", shippingQuote: { ...quote, postingLocation: { city: "Umuarama", state: "PR", requiresTravel: true } } },
    { ...base, id: "pending", number: "LEGADO", shippingQuote: quote },
    { ...base, id: "delivery", number: "ENTREGA LOCAL", shippingQuote: null },
    { ...base, id: "frenet", number: "FRENET", shippingQuote: frenetQuote },
    { ...base, id: "frenet-pending", number: "FRENET PENDENTE", requiresPrescriptionReview: true, shippingQuote: frenetQuote },
    { ...base, id: "frenet-reviewed", number: "FRENET CONFERIDA", requiresPrescriptionReview: true,
      prescriptionReviewedAt: new Date(0).toISOString(), shippingQuote: frenetQuote },
    { ...base, id: "superfrete", number: "SUPERFRETE", requiresPrescriptionReview: true,
      shippingQuote: { ...quote, provider: "superfrete", postingLocation: frenetQuote.postingLocation } },
  ];
  const script = await fixtureBundle(`import {OrdersPanel} from './src/components/admin/orders-panel';createRoot(document.getElementById('root')).render(<OrdersPanel initialOrders={${JSON.stringify(orders)}}/>);`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }));
    await page.goto("http://127.0.0.1:3196");
    await page.addScriptTag({ content: script });
    for (const number of ["LOCAL", "VIAGEM", "LEGADO", "FRENET", "FRENET PENDENTE", "FRENET CONFERIDA", "SUPERFRETE"]) await page.getByRole("button", { name: `Ver detalhes do pedido ${number}`, exact: true }).click();
    const local = page.locator("article").filter({ has: page.getByRole("heading", { name: "LOCAL", exact: true }) });
    const travel = page.locator("article").filter({ has: page.getByRole("heading", { name: "VIAGEM", exact: true }) });
    const pending = page.locator("article").filter({ has: page.getByRole("heading", { name: "LEGADO", exact: true }) });
    const frenet = page.locator("article").filter({ has: page.getByRole("heading", { name: "FRENET", exact: true }) });
    await expect(local.getByText("Postagem em Ivaté/PR", { exact: true })).toBeVisible();
    await expect(local.getByRole("region", { name: "Postagem do pedido" })).toHaveClass(/bg-emerald-50/);
    await expect(local.getByLabel("Embalagem prevista na cotação")).toContainText("52,8 × 51,8 × 35 cm");
    await expect(local.getByLabel("Embalagem prevista na cotação")).toContainText("5.000 g · 10 unidade(s)");
    await expect(local.getByLabel("Embalagem prevista na cotação")).toContainText("pesos e medidas de origem são estimados");
    await expect(local.getByLabel("Embalagem prevista na cotação")).toContainText("após inconsistência no primeiro empacotamento");
    await expect(local.getByLabel("Embalagem prevista na cotação")).toContainText("pode exigir etiquetas separadas");
    await expect(local.getByRole("link", { name: "Preparar envio no Melhor Envio" })).toHaveAttribute("href", "https://melhorenvio.com.br/painel");
    const frenetPosting = frenet.getByRole("region", { name: "Postagem do pedido" });
    await expect(frenetPosting).toContainText("Postagem em Ivaté/PR");
    await expect(frenetPosting).toContainText("Ponto: AC Ivaté");
    await expect(frenetPosting).toContainText("Frenet · Correios · PAC");
    await expect(frenetPosting).toContainText("Código do serviço: 03298");
    const frenetPackage = frenetPosting.getByLabel("Embalagem prevista na cotação");
    await expect(frenetPackage).toContainText("25 × 15 × 10 cm");
    await expect(frenetPackage).toContainText("um único volume");
    await expect(frenetPackage).toContainText("recalcule antes de comprar a etiqueta");
    await expect(frenetPackage).not.toContainText(/inconsistência|etiquetas separadas/);
    await expect(frenetPosting.getByRole("link", { name: "Preparar envio na Frenet" })).toHaveAttribute("href", "https://painel.frenet.com.br/");
    const frenetPending = page.locator("article").filter({ has: page.getByRole("heading", { name: "FRENET PENDENTE", exact: true }) }).getByRole("region", { name: "Postagem do pedido" });
    const frenetReviewed = page.locator("article").filter({ has: page.getByRole("heading", { name: "FRENET CONFERIDA", exact: true }) }).getByRole("region", { name: "Postagem do pedido" });
    const superfrete = page.locator("article").filter({ has: page.getByRole("heading", { name: "SUPERFRETE", exact: true }) });
    await expect(frenetPending.getByRole("link", { name: "Preparar envio na Frenet" })).toHaveCount(0);
    await expect(frenetPending).toContainText("Registre a conferência farmacêutica da receita antes de preparar a etiqueta");
    await expect(frenetReviewed.getByRole("link", { name: "Preparar envio na Frenet" })).toHaveAttribute("href", "https://painel.frenet.com.br/");
    await expect(superfrete.getByRole("link", { name: "Preparar envio no SuperFrete" })).toHaveAttribute("href", "https://web.superfrete.com/");
    await expect(travel.getByLabel("Embalagem prevista na cotação")).toHaveCount(0);
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
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await filter.selectOption("Umuarama/PR");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(travel).toBeVisible();
    await filter.selectOption("PENDING");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(pending).toBeVisible();
    await filter.selectOption("ALL");
    await expect(page.locator("article")).toHaveCount(8);
    await page.getByRole("button", { name: "Ver detalhes do pedido ENTREGA LOCAL", exact: true }).click();
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
