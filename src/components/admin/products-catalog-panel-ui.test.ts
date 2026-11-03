import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

let styles: Promise<string> | undefined;
function fixtureStyles() {
  if (!process.env.CATALOG_PANEL_CAPTURE_ROOT) return Promise.resolve("");
  return styles ??= postcss([tailwind()]).process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" }).then(result => result.css);
}

test("catálogo inicia na loja física e filtra conferência sem gravar", async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProductsCatalogPanel} from './src/components/admin/products-catalog-panel';createRoot(document.getElementById('root')).render(<ProductsCatalogPanel/>);`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", platform: "browser", format: "iife", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  });
  const css = await fixtureStyles();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const product = (id: string, inventorySource: "PHARMACY" | "DISTRIBUTOR") => ({
      id, inventorySource, name: `Produto sintético ${id}`, sku: `TEST-${id}`, ean: null, brand: "Marca sintética", category: inventorySource === "PHARMACY" ? "Categoria da loja" : "Categoria do fornecedor",
      status: "DRAFT", price: "10.00", promotionalPrice: null, stock: 2, imageUrl: null, imageAssetId: null, slug: id, activeIngredients: [], searchTerms: [], createdAt: "2026-11-02T12:00:00.000Z", updatedAt: "2026-11-02T12:00:00.000Z", featuredPosition: null, cashbackEnabled: false, cashbackRateBps: 0, isPopularPharmacy: false, requiresPrescription: false,
    });
    const source = { title: "Ficha sintética", url: "https://example.test/ficha", evidence: "Dados físicos sintéticos para teste isolado." };
    const groupedProduct = (id: string) => {
      const name = `Loção sintética frasco 200 ml com descrição extensa para conferência de embalagem e identificadores ${id}`;
      return { ...product(id, "PHARMACY"), name, sku: `TEST-EMBALAGEM-IDENTIFICADOR-LONGO-SEM-ESPACOS-${id}`, ean: "0000000000000",
        catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
        shippingProfile: {
          enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 300, lengthCm: 10, widthCm: 5, heightCm: 18,
          reference: { productName: name, packageLevel: "retail_unit", weightGrams: 300, lengthCm: 10, widthCm: 5, heightCm: 18,
            weightSource: source, dimensionsSource: source, researchedAt: "2026-11-02T12:00:00.000Z", warnings: [],
            estimate: { comparableName: "Frasco sintético", packageDescription: "Frasco plástico fechado", productFamily: "Loção sintética", packageMaterial: "Plástico", targetSource: source, source, confidence: "low", assumptions: ["Hipótese sintética para teste."], weightGrams: null, lengthCm: null, widthCm: null, heightCm: null },
          },
        },
      };
    };
    const products = [product("loja", "PHARMACY"), groupedProduct("embalagem-a"), groupedProduct("embalagem-b"), ...["a", "b", "c", "d"].map(id => product(`fornecedor-${id}`, "DISTRIBUTOR"))];
    await page.route("**/*", route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() !== "GET") writes.push(`${request.method()} ${path}`);
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (path === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (path === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root" class="mx-auto w-full max-w-7xl p-3 sm:p-6"></div><script src="/fixture.js"></script></html>' });
      if (path === "/api/produtos") return route.fulfill({ json: { data: products } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto("http://127.0.0.1:3199/");
    await expect(page.getByRole("tab", { name: /Loja física/ })).toHaveAttribute("aria-selected", "true").catch(error => { throw new Error(`${String(error)}; browser errors: ${errors.join("; ")}`); });
    await expect(page.getByRole("heading", { name: "Produtos da loja física" })).toBeVisible();
    await expect(page.getByText("SKU TEST-loja", { exact: true })).toBeVisible();
    await expect(page.getByText("SKU TEST-fornecedor-a", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("definition").first()).toHaveText("3");
    const group = page.getByLabel("Conferir embalagens e medidas");
    await group.selectOption("review");
    await expect(page.getByText("SKU TEST-loja", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Distribuidoras/ }).click();
    await expect(group).toHaveCount(0);
    await expect(page.getByRole("definition").first()).toHaveText("4");
    await expect(page.getByText("SKU TEST-fornecedor-a", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Loja física/ }).click();
    await expect(group).toHaveValue("");
    await expect(page.getByLabel("Categoria", { exact: true }).getByRole("option", { name: "Categoria do fornecedor" })).toHaveCount(0);
    const exactGroupKey = await group.getByRole("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).find(value => value && value !== "review"));
    assert.ok(exactGroupKey, "fixture precisa ter um grupo físico completo");
    const captureRoot = process.env.CATALOG_PANEL_CAPTURE_ROOT;
    if (captureRoot) mkdirSync(captureRoot, { recursive: true });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await group.selectOption("");
      await expect(page.getByText("SKU TEST-loja", { exact: true })).toBeVisible();
      await expect(page.getByText("SKU TEST-EMBALAGEM-IDENTIFICADOR-LONGO-SEM-ESPACOS-embalagem-a", { exact: true })).toBeVisible();
      await expect(group).toBeVisible();
      await expect(page.getByPlaceholder("Nome, marca, SKU ou EAN")).toBeVisible();
      if (captureRoot) {
        assert.ok(await page.locator("#root > div").evaluate(element => getComputedStyle(element).display === "grid"), "CSS real precisa estar carregado");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `catálogo transborda em ${width}px`);
        assert.ok(await group.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }), `filtro cortado em ${width}px`);
        assert.ok(await page.getByRole("button", { name: "Editar selecionados em massa" }).evaluate(element => {
          const box = element.getBoundingClientRect();
          const parent = element.parentElement!.getBoundingClientRect();
          return box.right <= parent.right + 1 && box.left >= parent.left - 1 && element.scrollWidth <= element.clientWidth + 1;
        }), `botão de edição em massa cortado em ${width}px`);
        const row = page.getByRole("article").filter({ hasText: "SKU TEST-EMBALAGEM-IDENTIFICADOR-LONGO-SEM-ESPACOS-embalagem-a" });
        const rowLayout = await row.evaluate(element => {
          const edit = element.querySelector("button")!.getBoundingClientRect();
          const price = [...element.querySelectorAll("p")].find(item => /R\$/.test(item.textContent ?? ""))!.getBoundingClientRect();
          return { rowWidth: element.getBoundingClientRect().width, editWidth: edit.width, priceTop: price.top, editBottom: edit.bottom, editTop: edit.top };
        });
        if (width < 640) {
          assert.ok(rowLayout.editWidth >= rowLayout.rowWidth - 60, `nome e identificadores precisam ocupar a largura da linha em ${width}px`);
          assert.ok(rowLayout.priceTop >= rowLayout.editBottom, `preço precisa ficar abaixo do cadastro em ${width}px`);
        } else {
          assert.ok(rowLayout.priceTop < rowLayout.editBottom && rowLayout.priceTop >= rowLayout.editTop, "desktop preserva preço ao lado do cadastro");
        }
      }
      if (captureRoot) await page.screenshot({ path: join(captureRoot, `catalogo-loja-${width}.png`), fullPage: true });
      await group.selectOption(exactGroupKey);
      await expect(page.getByRole("article")).toHaveCount(2);
      await expect(page.getByText("SKU TEST-loja", { exact: true })).toHaveCount(0);
      await expect(page.getByText("EAN 0000000000000", { exact: true })).toHaveCount(2);
      if (captureRoot) assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `grupo transborda em ${width}px`);
      if (captureRoot) await page.screenshot({ path: join(captureRoot, `catalogo-grupo-${width}.png`), fullPage: true });
    }
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
