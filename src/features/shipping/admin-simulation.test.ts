import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { defaultShippingSettings } from "./schema";

test("failed admin simulation never leaves another destination's prices visible", async () => {
  const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {ShippingPanel} from './src/components/admin/shipping-panel';createRoot(document.getElementById('root')).render(<ShippingPanel callbackUrl='https://example.invalid/callback'/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const origin = "http://127.0.0.1:3197";
    let calls = 0;
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/api/admin/fretes") return json({ data: { settings: { ...defaultShippingSettings, enabled: true, contactEmail: "shipping@example.invalid", serviceIds: [1, 2] }, revision: 1, applicationConfigured: true, connected: true, expiresAt: null, products: [] } });
      if (url.pathname === "/api/admin/fretes/simular") {
        calls += 1;
        return calls === 1 ? json({ data: [{ provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 1977, deliveryDays: 9 }] }) : json({ error: "Consulta sintética indisponível" }, 502);
      }
      return route.abort();
    });
    await page.goto(origin);
    for (const [label, value] of [["CEP de destino", "01001000"], ["Peso (kg)", "0.3"], ["Largura (cm)", "15"], ["Altura (cm)", "10"], ["Comprimento (cm)", "20"], ["Valor (R$)", "50"]]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Consultar preços e prazos", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: /Correios.*PAC/ })).toBeVisible();
    await page.getByLabel("CEP de destino", { exact: true }).fill("69005010");
    await page.getByRole("button", { name: "Consultar preços e prazos", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Consulta sintética indisponível");
    await expect(page.getByRole("checkbox", { name: /Correios.*PAC/ })).toHaveCount(0);
  } finally { await browser.close(); }
});
