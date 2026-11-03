import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("ADMIN salva o modo histórico com campos desconhecidos e preserva a política ao recarregar", async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ShippingPanel} from './src/components/admin/shipping-panel';createRoot(document.getElementById('root')).render(<ShippingPanel callbackUrl="https://example.test/callback"/>);`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", platform: "browser", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const strictKeys = ["maximumSubsidyCents", "minimumContributionBps", "variableCostReserveBps", "packagingCostCents"] as const;
    const initialPolicy = { enabled: false, maximumSubsidyCents: null, minimumContributionBps: null, variableCostReserveBps: null, packagingCostCents: null, costMaxAgeHours: 24 };
    let settings = { enabled: false, environment: "sandbox", originPostalCode: "01001000", originCity: "Cidade sintética", originState: "SP", postingLocations: [], preparationDays: 1, serviceIds: [], operationalCosts: [], contactEmail: "qa@example.test", freeShippingPolicy: initialPolicy };
    const writes: typeof settings[] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (path === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/fixture.js"></script>' });
      if (path === "/api/admin/fretes") {
        if (route.request().method() === "PUT") {
          const payload = route.request().postDataJSON() as { settings: typeof settings; revision: number; application?: unknown };
          assert.equal(payload.revision, writes.length);
          assert.equal(payload.application, undefined);
          settings = payload.settings;
          writes.push(settings);
        }
        return route.fulfill({ json: { data: { settings, revision: writes.length, applicationConfigured: false, connected: false, expiresAt: null, products: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } } });
      }
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3199/");
    const mode = page.getByLabel("Modelo de financiamento do frete");
    await expect(mode).toHaveValue("CONFIRMED_COSTS");
    await page.getByRole("checkbox", { name: "Aplicar benefício nas cotações elegíveis" }).check();
    const maximum = page.getByLabel("Limite de subsídio por pedido (R$)");
    await expect(maximum).toBeEnabled();
    assert.equal(await maximum.evaluate((element: HTMLInputElement) => element.required), true);
    await mode.selectOption("HISTORICAL_MARGIN_SHARE");
    await expect(maximum).toBeEnabled();
    assert.equal(await maximum.evaluate((element: HTMLInputElement) => element.required), false);
    await expect(page.getByLabel("Embalagem e proteção por volume (R$)")).toBeEnabled();
    await expect(page.getByLabel("Contribuição mínima projetada (%)")).toBeDisabled();
    await expect(page.getByLabel("Reserva de custos variáveis (%)")).toBeDisabled();
    assert.equal(await maximum.inputValue(), "");
    await expect(page.getByLabel("Validade do último custo (horas)")).toHaveValue("720");
    await expect(page.getByText(/50% da margem projetada/)).toBeVisible();
    await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Configuração salva.");
    assert.equal(writes.length, 1);
    const saved = writes[0].freeShippingPolicy as typeof initialPolicy & { fundingMode: string; marginShareBps: number; historicalCostMaxAgeHours: number };
    assert.equal(saved.enabled, true);
    assert.equal(saved.fundingMode, "HISTORICAL_MARGIN_SHARE");
    assert.equal(saved.marginShareBps, 5000);
    assert.equal(saved.historicalCostMaxAgeHours, 720);
    for (const key of strictKeys) assert.equal(saved[key], null);
    assert.equal(saved.costMaxAgeHours, 24);
    await page.reload();
    await expect(mode).toHaveValue("HISTORICAL_MARGIN_SHARE");
    await expect(maximum).toBeEnabled();
    await page.getByLabel("Dias úteis para preparar").fill("2");
    await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Configuração salva.");
    assert.equal(writes.length, 2);
    assert.deepEqual(writes[1].freeShippingPolicy, saved);
    assert.equal(writes[1].preparationDays, 2);
    await mode.selectOption("CONFIRMED_COSTS");
    await expect(maximum).toBeEnabled();
    assert.equal(await maximum.inputValue(), "");
    assert.equal(await maximum.evaluate((element: HTMLInputElement) => element.required), true);
    await maximum.fill("0");
    await page.getByLabel("Contribuição mínima projetada (%)").fill("2");
    await page.getByLabel("Reserva de custos variáveis (%)").fill("3");
    await page.getByLabel("Embalagem e proteção por volume (R$)").fill("4");
    await mode.selectOption("HISTORICAL_MARGIN_SHARE");
    await expect(maximum).toHaveValue("0");
    await expect(page.getByLabel("Embalagem e proteção por volume (R$)")).toHaveValue("4");
    await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Configuração salva.");
    assert.equal(writes[2].freeShippingPolicy.maximumSubsidyCents, 0);
    assert.equal(writes[2].freeShippingPolicy.packagingCostCents, 400);
    assert.equal(writes[2].freeShippingPolicy.minimumContributionBps, 200);
    assert.equal(writes[2].freeShippingPolicy.variableCostReserveBps, 300);
    await maximum.fill("15");
    await page.getByLabel("Embalagem e proteção por volume (R$)").fill("");
    await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Configuração salva.");
    assert.equal(writes[3].freeShippingPolicy.maximumSubsidyCents, 1500);
    assert.equal(writes[3].freeShippingPolicy.packagingCostCents, null);
    await page.reload();
    await expect(maximum).toHaveValue("15");
    await expect(page.getByLabel("Embalagem e proteção por volume (R$)")).toHaveValue("");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
