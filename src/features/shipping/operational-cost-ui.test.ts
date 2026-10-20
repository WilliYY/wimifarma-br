import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { defaultShippingSettings } from "./schema";
import { shippingOperationalRouteKey } from "./operational-cost";

test("operational comparison keeps unknown costs pending and planning does not enable services", async () => {
  const settings = { ...defaultShippingSettings, contactEmail: "synthetic@example.invalid", serviceIds: [1], postingLocations: [1, 2, 3].map(serviceId => ({ serviceId, city: "Ivaté", state: "PR" as const })) };
  const quotes = [1, 2, 3, 99].map(serviceId => ({ provider: "melhor-envio", serviceId, carrier: serviceId === 3 ? "Jadlog" : "Correios", service: `Serviço ${serviceId}`, priceCents: serviceId === 1 ? 1000 : 2000, deliveryDays: 5 }));
  const costs = [1, 2].map(serviceId => ({ serviceId, routeKey: shippingOperationalRouteKey(settings, serviceId), tripCostCents: serviceId === 1 ? 5000 : 0, parcelsPerTrip: 1, collectionFeeCents: 0, extraInsuranceCents: 0, returnReserveCents: 0, otherFeesCents: 0 }));
  const bundle = await build({ stdin: { contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ShippingOperationalCostFields,ShippingCostComparisons} from './src/components/admin/shipping-operational-costs';function App(){const [settings,setSettings]=useState(${JSON.stringify({ ...settings, operationalCosts: costs })});const [confirmed,setConfirmed]=useState(false);return <><ShippingOperationalCostFields settings={settings} services={${JSON.stringify(quotes)}} disabled={false} onChange={setSettings}/><label><input type='checkbox' checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmação sintética</label><ShippingCostComparisons settings={settings} quotes={${JSON.stringify(quotes)}} cargoKinds={['medication']} acceptanceConfirmed={confirmed} disabled={false} onToggleService={()=>{}}/><output aria-label='Estado sintético'>{JSON.stringify(settings)}</output></>};createRoot(document.getElementById('root')).render(<App/>);`, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }));
    await page.goto("http://127.0.0.1:3198");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByLabel("Encomendas por viagem").fill("");
    await expect(page.getByLabel("Deslocamento por viagem de ida e volta (R$)")).toHaveValue("50");
    await expect(page.locator("article").filter({ hasText: "Serviço 1" })).toContainText("Subtotal conhecido");
    await page.getByLabel("Encomendas por viagem").fill("2");
    await expect(page.getByLabel("Deslocamento por viagem de ida e volta (R$)")).toHaveValue("50");
    await expect(page.getByText("Menor custo entre rotas completas", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Selecionar Correios · Serviço 1")).toBeEnabled();
    await expect(page.getByLabel("Selecionar Correios · Serviço 2")).toBeDisabled();
    await page.getByLabel("Confirmação sintética").check();
    await expect(page.getByLabel("Selecionar Correios · Serviço 2")).toBeEnabled();
    const best = page.locator("article").filter({ hasText: "Menor custo entre rotas completas" });
    await expect(best).toContainText("Serviço 2");
    await expect(page.locator("article").filter({ hasText: "Serviço 3" })).toContainText("Subtotal conhecido");
    await expect(page.getByLabel("Selecionar Jadlog · Serviço 3")).toBeDisabled();
    await expect(page.getByLabel("Selecionar Correios · Serviço 99")).toBeDisabled();
    await expect(page.locator("article").filter({ hasText: "Serviço 99" })).toContainText("Aceitação não comprovada");
    await page.getByLabel("Serviço para planejar custos").selectOption("3");
    await page.getByLabel("Cidade planejada de postagem/coleta").fill("Umuarama");
    await page.getByLabel("Deslocamento por viagem de ida e volta (R$)").fill("0");
    let state = JSON.parse(await page.getByLabel("Estado sintético").textContent() ?? "{}");
    assert.deepEqual(state.serviceIds, [1]);
    assert.equal(state.operationalCosts.find((entry: { serviceId: number }) => entry.serviceId === 3).tripCostCents, 0);
    await page.getByLabel("Serviço para planejar custos").selectOption("1");
    await page.getByLabel("Cidade planejada de postagem/coleta").fill("Umuarama");
    await page.getByLabel("Coleta adicional por encomenda (R$)").fill("0");
    state = JSON.parse(await page.getByLabel("Estado sintético").textContent() ?? "{}");
    assert.equal(state.operationalCosts.find((entry: { serviceId: number }) => entry.serviceId === 1).tripCostCents, null);
    assert.equal(await page.getByText("NaN").count(), 0);
  } finally { await browser.close(); }
});
