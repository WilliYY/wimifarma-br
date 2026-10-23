import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { defaultShippingSettings } from "./schema";

test("freight catalog searches all pages, preserves settings and applies the reported box only to an individual draft", async () => {
  const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {ShippingPanel} from './src/components/admin/shipping-panel';createRoot(document.getElementById('root')).render(<ShippingPanel callbackUrl='https://example.invalid/callback'/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const origin = "http://127.0.0.1:3187";
    const profile = { enabled: true, transportReviewed: true, weightGrams: 617, widthCm: 20, heightCm: 20, lengthCm: 20, measurementBasis: "measured", cargoKinds: ["general"], approvedServiceIds: [1, 2] };
    const products = Array.from({ length: 805 }, (_, i) => ({ id: `synthetic-${i}`, name: `Produto ${String(i).padStart(4, "0")}`, category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, updatedAt: new Date(0).toISOString(), shippingProfile: i === 804 ? { ...profile, weightGrams: null, enabled: false, transportReviewed: false } : profile }));
    const gets: URL[] = [];
    const saved: { profile: typeof profile; updatedAt: string }[] = [];
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      const json = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/api/admin/fretes") {
        gets.push(url);
        const filtered = products.filter(product => product.name.includes(url.searchParams.get("q") ?? ""));
        const totalPages = Math.max(1, Math.ceil(filtered.length / 100));
        const pageNumber = Math.min(Number(url.searchParams.get("page") ?? 1), totalPages);
        return json({ data: { settings: defaultShippingSettings, revision: 7, connected: true, applicationConfigured: true, expiresAt: null, products: filtered.slice((pageNumber - 1) * 100, pageNumber * 100), pagination: { page: pageNumber, pageSize: 100, total: filtered.length, totalPages } } });
      }
      if (url.pathname.startsWith("/api/admin/fretes/produtos/")) { saved.push(route.request().postDataJSON()); return json({}); }
      return route.abort();
    });
    await page.goto(origin);
    await expect(page.getByText("Página 1 de 9 · 805 produtos · até 100 por página", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar rascunho", exact: true })).toHaveCount(100);
    await expect(page.getByText("Produto 0100", { exact: true })).toHaveCount(0);
    await page.getByLabel("Cidade de origem", { exact: true }).fill("Origem ainda não salva");
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText("Produto 0100", { exact: true })).toBeVisible();
    await expect(page.getByText("Produto 0000", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Cidade de origem", { exact: true })).toHaveValue("Origem ainda não salva");
    await page.getByLabel("Buscar produto por nome, EAN ou SKU", { exact: true }).fill("Produto 0803");
    await page.getByRole("button", { name: "Buscar produtos", exact: true }).click();
    await expect(page.getByText("Produto 0803", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar rascunho", exact: true })).toHaveCount(1);
    assert.equal(gets.at(-1)?.searchParams.get("q"), "Produto 0803");
    assert.equal(gets.at(-1)?.searchParams.get("page"), "1");
    const product = page.locator("form").filter({ has: page.getByText("Produto 0803", { exact: true }) });
    await expect(product.locator('input[name="reviewed"]')).toBeChecked();
    await expect(product.locator('input[name="enabled"]')).toBeChecked();
    await product.getByRole("button", { name: "Usar referência 24 × 15 × 10 cm no rascunho", exact: true }).click();
    await expect(product.getByLabel("Peso embalado (g)", { exact: true })).toHaveValue("617");
    await expect(product.getByLabel("Comprimento (cm)", { exact: true })).toHaveValue("24");
    await expect(product.getByLabel("Largura (cm)", { exact: true })).toHaveValue("15");
    await expect(product.getByLabel("Altura (cm)", { exact: true })).toHaveValue("10");
    await expect(product.locator('input[name="reviewed"]')).not.toBeChecked();
    await expect(product.locator('input[name="enabled"]')).not.toBeChecked();
    await expect(product.getByText(/Medidas externas e peso da caixa vazia ainda precisam de confirmação/)).toBeVisible();
    assert.equal(saved.length, 0, "using a reference does not write a profile");
    await product.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
    await expect.poll(() => saved.length).toBe(1);
    await expect(page.getByText("Dados de transporte salvos.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Cidade de origem", { exact: true })).toHaveValue("Origem ainda não salva");
    assert.deepEqual(saved[0], { updatedAt: new Date(0).toISOString(), profile: { ...profile, enabled: false, transportReviewed: false, measurementBasis: "estimated", reference: null, widthCm: 15, heightCm: 10, lengthCm: 24 } });
    await page.getByLabel("Buscar produto por nome, EAN ou SKU", { exact: true }).fill("Produto 0804");
    await page.getByRole("button", { name: "Buscar produtos", exact: true }).click();
    const incomplete = page.locator("form").filter({ has: page.getByText("Produto 0804", { exact: true }) });
    await incomplete.getByRole("button", { name: "Usar referência 24 × 15 × 10 cm no rascunho", exact: true }).click();
    await expect(incomplete.getByLabel("Peso embalado (g)", { exact: true })).toHaveValue("");
    await page.getByLabel("Buscar produto por nome, EAN ou SKU", { exact: true }).fill("inexistente");
    await page.getByRole("button", { name: "Buscar produtos", exact: true }).click();
    await expect(page.getByText("Nenhum produto encontrado.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Limpar busca", exact: true }).click();
    await expect(page.getByText("Produto 0000", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar rascunho", exact: true })).toHaveCount(100);
    assert.equal(saved.length, 1);
  } finally { await browser.close(); }
});
