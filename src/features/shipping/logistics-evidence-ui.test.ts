import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("evidence panel loads lazily, shows provenance and requests preview without saving a shipping profile", async () => {
  const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {ProductLogisticsEvidence} from './src/components/admin/product-logistics-evidence';createRoot(document.getElementById('root')).render(<ProductLogisticsEvidence productId='fixture' onSaved={()=>{}}/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let reads = 0; const writes: string[] = []; const bodies: { method: string; body: { evidence?: { observations: unknown[]; review: { confirmed: boolean } } } }[] = [];
    const gtin = "07890000000000";
    const largeEvidence = { version: 1, gtin, sourceDecisions: [], observations: Array.from({ length: 20 }, (_, index) => ({ id: `source-${index}`, source: { url: "https://example.invalid/ficha", capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin, excerpt: "Fonte sintética ".repeat(110) }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: null, weightBasis: "unspecified", sidesMm: null, sideOrder: ["altura", "largura", "profundidade"], dimensionsBasis: "labeled_axes", notes: "" })), review: { confirmed: false, note: "" } };
    assert.ok(Buffer.byteLength(JSON.stringify(largeEvidence)) > 32000);
    await page.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:3188") return route.abort();
      const json = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (request.method() !== "GET") { writes.push(url.pathname); bodies.push({ method: request.method(), body: request.postDataJSON() }); assert.ok(Buffer.byteLength(request.postData() ?? "") < 32000); return json({ data: { blockers: ["Confira calibração, recipiente externo, proteção, tara e folgas."], draft: null } }); }
      if (url.pathname.endsWith("/evidencias")) { reads++; return json({ data: { gtin, logisticsEvidence: largeEvidence, updatedAt: new Date(0).toISOString(), evidenceStatus: "partial" } }); }
      if (url.pathname.endsWith("/embalagens")) return json({ data: [{ id: "box", revision: 1, name: "Caixa pendente", data: {} }] });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3188");
    assert.equal(reads, 0);
    await page.getByText("Unidade comercial e receitas de embalagem", { exact: true }).click();
    await expect(page.getByText(/GTIN: 07890000000000/)).toBeVisible();
    await page.getByLabel("Conferi a apresentação e as fontes desta unidade comercial; isso não aprova o transporte.", { exact: true }).check();
    await page.getByRole("button", { name: "Salvar evidência", exact: true }).click();
    await expect(page.getByText(/Evidência salva/)).toBeVisible();
    assert.deepEqual(bodies[0].body.evidence?.observations, []);
    assert.equal(bodies[0].body.evidence?.review.confirmed, true);
    await page.getByLabel("Embalagem", { exact: true }).selectOption("box");
    await page.getByLabel("Mercadoria geral", { exact: true }).check();
    await page.getByRole("button", { name: "Conferir preparação sem aplicar" }).click();
    await expect(page.getByText("Confira calibração, recipiente externo, proteção, tara e folgas.", { exact: true })).toBeVisible();
    assert.deepEqual(writes, ["/api/admin/fretes/produtos/fixture/evidencias", "/api/admin/fretes/produtos/fixture/evidencias"]);
    assert.deepEqual(bodies.map(item => item.method), ["PUT", "POST"]);
    await expect(page.getByRole("button", { name: "Liberar para transportadora" })).toHaveCount(0);
  } finally { await browser.close(); }
});
