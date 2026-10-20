import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { defaultShippingSettings } from "./schema";

test("freight product selectors default to PAC/SEDEX, preserve explicit empty approval and require renewed review", async () => {
  const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {ShippingPanel} from './src/components/admin/shipping-panel';createRoot(document.getElementById('root')).render(<ShippingPanel callbackUrl='https://example.invalid/callback'/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const origin = "http://127.0.0.1:3198";
    const profile = { enabled: true, transportReviewed: true, weightGrams: 500, widthCm: 20, heightCm: 20, lengthCm: 20 };
    const base = { category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, updatedAt: new Date(0).toISOString() };
    const saved: { approvedServiceIds: number[]; cargoKinds: string[] }[] = [];
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      const json = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/api/admin/fretes") return json({ data: { settings: { ...defaultShippingSettings, serviceIds: [1, 2, 12] }, connected: true, products: [
        { ...base, id: "legacy", name: "Produto legado", shippingProfile: { ...profile, cargoKinds: ["unspecified"] } },
        { ...base, id: "empty", name: "Produto sem aprovação", shippingProfile: { ...profile, approvedServiceIds: [] } },
      ] } });
      if (url.pathname === "/api/admin/fretes/simular") return json({ data: [], services: [{ serviceId: 12, service: "Cargo", carrier: "LATAM" }] });
      if (url.pathname.startsWith("/api/admin/fretes/produtos/")) { saved.push(route.request().postDataJSON().profile); return json({}); }
      return route.abort();
    });
    await page.goto(origin);
    const legacy = page.locator("form").filter({ has: page.getByText("Produto legado", { exact: true }) });
    const empty = page.locator("form").filter({ has: page.getByText("Produto sem aprovação", { exact: true }) });
    await expect(legacy.getByRole("checkbox", { name: "Correios · PAC", exact: true })).toBeChecked();
    await expect(legacy.getByRole("checkbox", { name: "Correios · SEDEX", exact: true })).toBeChecked();
    await expect(empty.getByRole("checkbox", { name: "Correios · PAC", exact: true })).not.toBeChecked();
    await empty.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
    await expect.poll(() => saved.length).toBe(1);
    assert.deepEqual(saved[0].approvedServiceIds, []);
    const simulator = page.locator("form").filter({ has: page.getByRole("button", { name: "Comparar preços, custos e aceitação", exact: true }) });
    for (const [label, value] of [["CEP de destino", "01001000"], ["Peso (kg)", "0.5"], ["Largura (cm)", "20"], ["Altura (cm)", "20"], ["Comprimento (cm)", "20"], ["Valor (R$)", "20"]]) await simulator.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Comparar preços, custos e aceitação", exact: true }).click();
    await legacy.getByRole("checkbox", { name: "Não informado", exact: true }).uncheck();
    await legacy.getByRole("checkbox", { name: "Líquido", exact: true }).check();
    await legacy.getByRole("checkbox", { name: "LATAM · Cargo", exact: true }).check();
    await expect(legacy.locator('input[name="reviewed"]')).not.toBeChecked();
    await expect(legacy.locator('input[name="enabled"]')).not.toBeChecked();
    await legacy.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
    await expect.poll(() => saved.length).toBe(2);
    assert.deepEqual(saved[1].approvedServiceIds, [1, 2, 12]);
    assert.deepEqual(saved[1].cargoKinds, ["liquid"], "unknown cargo can be reclassified without a hidden blocking flag");
  } finally { await browser.close(); }
});

test("catalog measurement edits preserve approved carrier IDs in the unapproved draft", async () => {
  const profile = { enabled: true, transportReviewed: true, weightGrams: 500, widthCm: 20, heightCm: 20, lengthCm: 20, approvedServiceIds: [1, 2, 35] };
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProductShippingFields} from './src/components/admin/product-shipping-fields';createRoot(document.getElementById('root')).render(<form><ProductShippingFields initialProfile={${JSON.stringify(profile)}} identityKey='synthetic' researched={false} canEdit={true} medicine={false}/></form>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "fixture-link", setup(builder) {
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default function Link(props){return React.createElement('a',props);}", resolveDir: process.cwd() }));
  } }] });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }));
    await page.goto("http://127.0.0.1:3199");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByLabel("Peso embalado (g)", { exact: true }).fill("600");
    const draft = JSON.parse(await page.locator('input[name="shippingDraft"]').inputValue());
    assert.deepEqual(draft.approvedServiceIds, [1, 2, 35]);
    assert.equal(draft.transportReviewed, false);
    assert.equal(draft.enabled, false);
  } finally { await browser.close(); }
});
