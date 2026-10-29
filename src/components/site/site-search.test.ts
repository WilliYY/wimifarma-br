import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3199";
const captureRoot = process.env.SEARCH_CAPTURE_ROOT;
const css = readFile("src/app/globals.css", "utf8")
  .then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" }))
  .then(result => result.css);
const bundle = build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {SiteSearch} from './src/components/site/site-search';
    createRoot(document.getElementById('root')).render(<SiteSearch/>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "search-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({unoptimized,priority,fill,...props})=><img {...props}/>;",
      "next/navigation": "export const useRouter=()=>({push:path=>window.navigations.push(path)});",
    };
    builder.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

async function fixture(width: number, run: (page: Page, requests: string[]) => Promise<void>) {
  const browser = await chromium.launch();
  const requests: string[] = [];
  const errors: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div style="padding:16px"><div id="root"></div></div><script>window.navigations=[];</script><script src="/fixture.js"></script></html>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: await css });
      if (url.pathname === "/api/produtos/busca") {
        const query = url.searchParams.get("q") ?? "";
        requests.push(query);
        if (query === "erro") return route.fulfill({ status: 503, json: { error: "Busca temporariamente indisponível." } });
        const product = { id: "synthetic", slug: "synthetic", name: "Produto sintético com apresentação e nome completo", price: "29.90", imageUrl: null, activeIngredients: [], brand: "Marca sintética",
          ...(query.startsWith("pmc") ? { requiresPrescription: query === "pmc-rx", prescriptionType: query === "pmc-rx" ? "ORDINARY" : "UNREVIEWED",
            catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: query !== "pmc-rx" },
            pmcReference: { amountCents: 4000, column: "PMC 0 %", publishedOn: "2026-10-09", sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file", presentation: "10 MG COM X 10", laboratory: "Laboratório sintético", registration: "1234567890123", rates: [{ label: "PMC 0 %", cents: 4000 }] } } : {}) };
        return route.fulfill({ json: { data: { products: query === "vazio" ? [] : [product], relatedProducts: [] } } });
      }
      return route.abort();
    });
    await page.goto(origin);
    if (width < 768) await page.getByRole("button", { name: "Abrir busca de produtos" }).click();
    await run(page, requests);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

for (const width of [390, 1280]) test(`busca por EAN ${width}px consulta o código e preserva Enter`, async () => {
  await fixture(width, async (page, requests) => {
    const input = page.getByRole("combobox", { name: "Buscar produtos" });
    await expect(input).toHaveAttribute("placeholder", /EAN/);
    await input.fill("7896523200576");
    await expect(page.getByRole("option", { name: /Produto sintético/ })).toBeVisible();
    assert.deepEqual(requests, ["7896523200576"]);
    await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=7896523200576"]);
  });
});

for (const width of [320, 390, 1280]) test(`autocomplete PMC ${width}px identifica referência sem antecipar Pix`, async () => {
  await fixture(width, async page => {
    const input = page.getByRole("combobox", { name: "Buscar produtos" });
    await input.fill("pmc");
    const item = page.getByRole("option", { name: /Produto sintético/ });
    await expect(item.getByText(/PMC CMED/)).toContainText(/40,00/);
    await expect(item.getByText("25% OFF", { exact: true })).toBeVisible();
    await expect(item.locator("strong")).toHaveText(/29,90/);
    await expect(item.getByText(/Pix/)).toHaveCount(0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (captureRoot) { await mkdir(captureRoot, { recursive: true }); await page.screenshot({ path: join(captureRoot, `search-pmc-${width}.png`) }); }
    await input.fill("pmc-rx");
    await expect(item.getByText(/PMC CMED/)).toBeVisible();
    await expect(item.getByText(/% OFF/)).toHaveCount(0);
    await expect(item.locator("s")).toHaveCount(0);
  });
});

for (const width of [320, 390, 1280]) test(`busca ${width}px tem um limpar, avisos compactos e mantém navegação`, async () => {
  await fixture(width, async (page, requests) => {
    const input = page.getByRole("combobox", { name: "Buscar produtos" });
    await input.focus();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toContainText("Digite pelo menos 2 letras");
    assert.ok((await listbox.boundingBox())!.height <= 80, "Aviso inicial deve ser compacto");
    if (captureRoot) {
      await mkdir(captureRoot, { recursive: true });
      await page.screenshot({ path: join(captureRoot, `search-empty-${width}.png`) });
    }
    await input.fill("p");
    await expect(page.getByRole("button", { name: "Limpar busca", exact: true })).toHaveCount(1);
    const nativeClear = await input.evaluate(element => {
      const style = getComputedStyle(element, "::-webkit-search-cancel-button");
      return { appearance: style.webkitAppearance, display: style.display };
    });
    assert.equal(nativeClear.appearance === "none" || nativeClear.display === "none", true, "Limpar nativo deve ficar oculto");
    assert.deepEqual(requests, []);
    await input.fill("produto");
    const result = page.getByRole("option", { name: /Produto sintético/ });
    await expect(result).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (captureRoot) await page.screenshot({ path: join(captureRoot, `search-results-${width}.png`) });
    await page.getByRole("button", { name: "Limpar busca", exact: true }).click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Limpar busca", exact: true })).toHaveCount(0);
    await input.fill("vazio");
    await expect(listbox).toContainText("Nenhum produto encontrado");
    await expect(page.getByRole("link", { name: "Ver todos os resultados" })).toHaveAttribute("href", "/busca?q=vazio");
    await input.fill("erro");
    await expect(listbox).toContainText("Busca temporariamente indisponível.");
    await input.fill("produto");
    await expect(result).toBeVisible();
    await input.press("ArrowDown");
    assert.equal(await input.getAttribute("aria-activedescendant"), await result.getAttribute("id"));
    await input.press("Enter");
    assert.deepEqual(await page.evaluate("window.navigations"), ["/busca?q=produto"]);
  });
});
