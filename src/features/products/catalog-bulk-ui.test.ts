import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const version = "2026-10-19T12:00:00.000Z";
const base = { brand: "Sintético", category: "Medicamentos", price: "4.00", promotionalPrice: null, stock: 7, status: "ACTIVE", activeIngredients: [], searchTerms: [], cashbackEnabled: false, cashbackRateBps: 200, wimicoinsEnabled: false, wimicoinsRateBps: 200, featuredPosition: null, imageUrl: null, ean: "7896181915638", requiresPrescription: true, prescriptionType: "ORDINARY", updatedAt: version, createdAt: version, catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false } };
const fixtures = [{ ...base, id: "physical", name: "Produto físico sintético", slug: "physical", inventorySource: "PHARMACY" }, { ...base, id: "physical-other", name: "Outro produto físico", slug: "physical-other", inventorySource: "PHARMACY" }, { ...base, id: "distributor", name: "Produto distribuidor sintético", slug: "distributor", inventorySource: "DISTRIBUTOR", supplierMarkupBps: 5000, supplierPricing: { supplier: "ANB", unitCostCents: 200, unitPriceCents: 300, purchaseLimit: 4, validUntil: "2099-01-01T12:00:00.000Z" } }];
const bundle = build({ stdin: { contents: "import React from 'react';import{createRoot}from'react-dom/client';import{ProductsCatalogPanel}from'./src/components/admin/products-catalog-panel';createRoot(document.getElementById('root')).render(<ProductsCatalogPanel canManageCashback={window.qaAdmin} />);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });

test("distribuidoras mostram 100 por página sem carregar seleção escondida para o lote", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const products = Array.from({ length: 201 }, (_, index) => ({ ...fixtures[2], id: `d-${index}`, name: `Lote ${String(index).padStart(3, "0")}`, slug: `lote-${index}` }));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1" || route.request().method() !== "GET") return route.abort();
      if (url.pathname === "/api/produtos") return route.fulfill({ json: { data: products } });
      return route.fulfill({ contentType: "text/html", body: '<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div></html>' });
    });
    await page.goto("http://127.0.0.1:3198/qa");
    await page.addScriptTag({ content: (await bundle).outputFiles[0].text });
    const rows = page.getByRole("checkbox", { name: /^Selecionar Lote/ });
    await expect(rows).toHaveCount(100);
    await rows.first().check();
    await expect(page.getByRole("button", { name: "Editar 1 em massa" })).toBeEnabled();
    await page.getByRole("button", { name: "Próxima página de produtos", exact: true }).click();
    await expect(rows).toHaveCount(100);
    await expect(page.getByRole("checkbox", { name: /^Selecionar Lote/, checked: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar selecionados em massa" })).toBeDisabled();
    await page.getByRole("button", { name: "Próxima página de produtos", exact: true }).click();
    await expect(rows).toHaveCount(1);
    await page.getByPlaceholder("Nome, marca, SKU ou EAN").fill("Lote 200");
    await expect(rows).toHaveCount(1);
    await page.getByPlaceholder("Nome, marca, SKU ou EAN").fill("");
    await expect(rows).toHaveCount(100);
    await expect(page.getByRole("button", { name: "Página anterior de produtos", exact: true })).toBeDisabled();
  } finally { await browser.close(); }
});

test("catálogo: origem, seleção visível, prévia explícita e preservação dos campos no lote", async () => {
  const browser = await chromium.launch();
  try {
    for (const admin of [true, false]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      const writes: { items: { id: string; expectedUpdatedAt: string }[]; changes: Record<string, unknown> }[] = [];
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.hostname !== "127.0.0.1") return route.abort();
        if (url.pathname === "/qa") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div></html>' });
        if (url.pathname === "/api/produtos") return route.fulfill({ json: { data: fixtures.map(product => admin ? product : { ...product, supplierMarkupBps: undefined, supplierPricing: "supplierPricing" in product ? { ...product.supplierPricing, unitCostCents: undefined } : undefined }) } });
        if (url.pathname === "/api/admin/produtos/lote") { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { count: writes.at(-1)!.items.length, data: [] } }); }
        return route.fulfill({ status: 404, body: "" });
      });
      await page.goto("http://127.0.0.1:3198/qa");
      await page.evaluate(value => { (window as unknown as { qaAdmin: boolean }).qaAdmin = value; }, admin);
      await page.addScriptTag({ content: (await bundle).outputFiles[0].text });
      await expect(page.getByRole("checkbox", { name: "Selecionar Produto físico sintético", exact: true })).toBeVisible();
      await expect(page.getByRole("checkbox", { name: "Selecionar Produto distribuidor sintético", exact: true })).toHaveCount(0);
      await page.getByRole("checkbox", { name: "Selecionar Produto físico sintético", exact: true }).check();
      await expect(page.getByRole("button", { name: "Editar 1 em massa" })).toBeEnabled();
      await page.getByPlaceholder("Nome, marca, SKU ou EAN").fill("Outro");
      await expect(page.getByRole("button", { name: "Editar selecionados em massa" })).toBeDisabled();
      await page.getByPlaceholder("Nome, marca, SKU ou EAN").fill("");
      await expect(page.getByRole("checkbox", { name: "Selecionar Produto físico sintético", exact: true })).not.toBeChecked();
      await page.getByRole("checkbox", { name: "Selecionar Produto físico sintético", exact: true }).check();
      await page.getByRole("tab", { name: /Distribuidoras/ }).click();
      await expect(page.getByRole("button", { name: "Editar selecionados em massa" })).toBeDisabled();
      await page.getByRole("checkbox", { name: "Selecionar Produto distribuidor sintético", exact: true }).check();
      await page.getByRole("button", { name: "Editar 1 em massa" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("textbox", { name: /Acréscimo distribuidor/ })).toHaveCount(admin ? 1 : 0);
      await dialog.getByLabel("Categoria", { exact: true }).selectOption("set");
      await dialog.getByLabel("Nova categoria", { exact: true }).fill("Categoria sintética");
      await dialog.getByRole("button", { name: "Revisar alterações" }).click();
      assert.equal(writes.length, 0);
      await expect(dialog.getByText("Categoria sintética", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Produto distribuidor sintético", { exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Aplicar a 1 produtos" }).click();
      await expect(dialog).toHaveCount(0);
      assert.deepEqual(writes, [{ items: [{ id: "distributor", expectedUpdatedAt: version }], changes: { category: "Categoria sintética" } }]);
      if (!admin) assert.equal(await page.getByText(/custo R\$/).count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
