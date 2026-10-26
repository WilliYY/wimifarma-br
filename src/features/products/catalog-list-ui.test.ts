import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";

const base = { brand: "Sintético", category: "Higiene", price: "4.00", promotionalPrice: null, stock: 1, status: "ACTIVE", activeIngredients: [], searchTerms: [], cashbackEnabled: false, cashbackRateBps: 200, wimicoinsEnabled: false, wimicoinsRateBps: 200, featuredPosition: null, imageUrl: null, ean: null, requiresPrescription: false, prescriptionType: "UNREVIEWED", createdAt: "2026-10-19T12:00:00Z", updatedAt: "2026-10-19T12:00:00Z", catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } };
const rows = (physical: number) => [...Array.from({ length: 130 }, (_, i) => ({ ...base, id: `distributor-${i}`, slug: `distributor-${i}`, name: `Distribuidor sintético ${i}`, inventorySource: "DISTRIBUTOR" })), ...Array.from({ length: physical }, (_, i) => ({ ...base, id: `physical-${i}`, slug: `physical-${i}`, name: `Físico sintético ${i}`, inventorySource: "PHARMACY" }))];
const bundle = build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {ProductsCatalogPanel} from './src/components/admin/products-catalog-panel';createRoot(document.getElementById('root')).render(<ProductsCatalogPanel canManageCashback/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, plugins: [{ name: "catalog-list-ui-fixture", setup(builder) {
  builder.onResolve({ filter: /components\/admin\/product-image-picker$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React,{forwardRef,useImperativeHandle} from 'react';export const ProductImagePicker=forwardRef((props,ref)=>{useImperativeHandle(ref,()=>({resolveImage:async()=>({id:'synthetic-image',url:'/uploads/products/synthetic.webp'}),resolveImageUrls:()=>[],refresh:async()=>{},reset:()=>{}}));return <p>Foto sintética preparada</p>;});", loader: "tsx", resolveDir: process.cwd() }));
} }] });

async function fixture(physical: number, run: (page: Page, writes: Record<string, unknown>[]) => Promise<void>) {
  const products: Record<string, unknown>[] = rows(physical);
  const writes: Record<string, unknown>[] = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const cssDirectory = join(process.cwd(), ".next/static/css");
    const css = process.env.CATALOG_LIST_CAPTURE_ROOT && existsSync(cssDirectory) ? readdirSync(cssDirectory).filter(file => file.endsWith(".css")).map(file => readFileSync(join(cssDirectory, file), "utf8")).join("\n") : "";
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:3194") return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px}</style><div id="root"></div>' });
      if (url.pathname === "/api/produtos") {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          writes.push(body);
          const product = { ...base, ...body, id: "new-physical", slug: "new-physical", createdAt: new Date().toISOString(), catalogClassification: null };
          products.unshift(product);
          return route.fulfill({ status: 201, json: { data: product } });
        }
        return route.fulfill({ json: { data: products } });
      }
      return route.fulfill({ status: 404, json: {} });
    });
    await page.goto("http://127.0.0.1:3194");
    if (css) await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: (await bundle).outputFiles[0].text });
    await run(page, writes);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("painel mostra totais completos, abre a maior origem e acompanha novo cadastro", async () => {
  await fixture(3, async (page, writes) => {
    const summary = page.getByRole("definition").first();
    await expect(summary).toHaveText("133");
    await expect(page.getByRole("tab", { name: /Distribuidoras/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("checkbox", { name: "Selecionar Distribuidor sintético 0", exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /^Selecionar Distribuidor sintético/ })).toHaveCount(100);
    if (process.env.CATALOG_LIST_CAPTURE_ROOT) {
      mkdirSync(process.env.CATALOG_LIST_CAPTURE_ROOT, { recursive: true });
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: join(process.env.CATALOG_LIST_CAPTURE_ROOT, `catalogo-admin-${width}.png`) });
      }
    }
    await page.getByPlaceholder("Nome, marca, SKU ou EAN").fill("Distribuidor sintético 129");
    await expect(page.getByRole("checkbox", { name: "Selecionar Distribuidor sintético 129", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input[name='name']").fill("Novo produto físico sintético");
    await dialog.locator("input[name='category']").fill("Higiene");
    await dialog.locator("input[name='price']").fill("7.50");
    await dialog.getByRole("button", { name: "Cadastrar produto", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(summary).toHaveText("134");
    await expect(page.getByRole("tab", { name: /Loja física/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByPlaceholder("Nome, marca, SKU ou EAN")).toHaveValue("");
    await expect(page.getByRole("checkbox", { name: "Selecionar Novo produto físico sintético", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "A classificar", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Selecionar Novo produto físico sintético", exact: true })).toBeVisible();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].inventorySource, "PHARMACY");
    assert.equal(writes[0].category, "Higiene");
    assert.deepEqual(writes[0].catalogClassification, { kind: "UNCLASSIFIED", medicineClass: "UNCLASSIFIED", ethical: false, otc: false });
  });
});

test("origem vazia selecionada pela pessoa permanece explícita, sem esconder a outra contagem", async () => {
  await fixture(0, async page => {
    await expect(page.getByRole("tab", { name: /Distribuidoras/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: /Loja física/ }).click();
    await expect(page.getByRole("tab", { name: /Loja física/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("0 de 0 produtos · 130 no catálogo · 100 por página", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Distribuidoras.*130/ })).toBeVisible();
  });
});
