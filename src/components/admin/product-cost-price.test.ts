import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const origin = "http://127.0.0.1:3197";
const ean = "7890000000000";
const updatedAt = "2026-11-18T10:00:00.000Z";
const product = {
  id: "distributor", name: "Produto sintético de QA", updatedAt, ean,
  inventorySource: "DISTRIBUTOR", supplierMarkupBps: 5000,
  price: "99.99", promotionalPrice: null, requiresPrescription: false,
  supplierPricing: { supplier: "ANB", unitCostCents: 200, unitPriceCents: 300, purchaseLimit: 5, demandAllowed: true, validUntil: "2020-01-02T00:00:00.000Z" },
};
const offers = ["ANB", "DM"].map((supplier, index) => ({
  id: `synthetic-${supplier}`, supplier, externalCode: `QA-${supplier}-004`, eanNormalized: ean.padStart(14, "0"),
  unitCostCents: index ? 300 : 200, substitutionTaxCents: 17, retailCeilingCents: 1000,
  stockQuantity: index ? 12 : 8, available: true, observedAt: "2020-01-01T00:00:00.000Z",
  validUntil: "2020-01-02T00:00:00.000Z", allocationQuantity: 5, reservedQuantity: 1, committedQuantity: 2,
}));

const bundle = build({
  stdin: {
    contents: `import React,{useState} from 'react';
      import {createRoot} from 'react-dom/client';
      import {Toaster} from 'sonner';
      import {ProductQuickControls} from './src/components/admin/product-quick-controls';
      const kind=new URLSearchParams(location.search).get('kind');
      const base=${JSON.stringify(product)};
      function FixtureApp(){
        const [product,setProduct]=useState(kind==='physical'?{...base,inventorySource:'PHARMACY',price:'4.20',supplierPricing:null}:kind==='no-offer'?{...base,supplierPricing:null}:base);
        const [reloads,setReloads]=useState(0);
        async function reload(){const response=await fetch('/api/admin/produtos/distributor');if(!response.ok)throw new Error('Falha sintética ao recarregar');setProduct((await response.json()).data);setReloads(count=>count+1);}
        return <><p>QA: somente dados sintéticos</p><output aria-label="Recargas do catálogo">{reloads}</output><ProductQuickControls product={product} canEdit={kind!=='readonly'} onSaved={reload}/><Toaster/></>;
      }
      createRoot(document.getElementById('root')).render(<FixtureApp/>);`,
    resolveDir: process.cwd(), loader: "tsx",
  },
  bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const styles = postcss([tailwind()]).process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" }).then(result => result.css);

type Write = { method: string; path: string; body: Record<string, unknown> };
type FixtureState = { writes: Write[]; offerReads: number; productReads: number };
async function fixture(run: (page: Page, state: FixtureState) => Promise<void>, kind = "distributor") {
  const browser = await chromium.launch();
  const state: FixtureState = { writes: [], offerReads: 0, productReads: 0 };
  let serverProduct = structuredClone(product);
  let serverOffers = structuredClone(offers);
  if (kind === "wrong-ean") serverOffers[0].eanNormalized = "07890000000017";
  const errors: string[] = [];
  const blocked: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
    page.setDefaultTimeout(8000);
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>#root{max-width:1000px;margin:16px auto;padding:0 16px}</style><div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: await styles });
      if (url.pathname === "/api/admin/fornecedores/ofertas" && request.method() === "GET") {
        assert.equal(url.searchParams.get("productId"), "distributor");
        state.offerReads++;
        return route.fulfill({ json: { data: serverOffers } });
      }
      if (request.method() === "POST" && url.pathname === "/api/admin/fornecedores/ofertas") {
        const body = request.postDataJSON();
        state.writes.push({ method: request.method(), path: url.pathname, body });
        const saved = { ...offers[0], ...body };
        serverOffers = [saved, offers[1]];
        serverProduct = { ...serverProduct, supplierPricing: { ...serverProduct.supplierPricing, unitCostCents: body.unitCostCents, unitPriceCents: 375, validUntil: body.validUntil } };
        return route.fulfill({ json: { data: saved } });
      }
      if (request.method() === "PATCH" && url.pathname === "/api/admin/produtos/distributor/operacao") {
        const body = request.postDataJSON();
        state.writes.push({ method: request.method(), path: url.pathname, body });
        serverProduct = { ...serverProduct, ...body };
        return route.fulfill({ json: { data: serverProduct } });
      }
      if (url.pathname === "/api/admin/produtos/distributor" && request.method() === "GET") {
        state.productReads++;
        return route.fulfill(kind === "reload-error" ? { status: 503, json: { error: "Falha sintética" } } : { json: { data: serverProduct } });
      }
      blocked.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    });
    await page.goto(`${origin}/?kind=${kind}`);
    await expect(page.getByRole("group", { name: "Preço de venda", exact: true })).toBeVisible();
    await run(page, state);
    assert.deepEqual(errors, [], "erros de execução do navegador");
    assert.deepEqual(blocked, [], "nenhuma chamada externa ou rota inesperada");
  } finally { await browser.close(); }
}

async function openOffers(page: Page) {
  await page.getByRole("button", { name: "Comparar / editar custos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Revisar oferta ANB", exact: true })).toBeVisible();
}
async function reviewAnb(page: Page) {
  await page.getByRole("button", { name: "Revisar oferta ANB", exact: true }).click();
}

test("custo resolvido vencido continua visível com venda do servidor e cabe em 320, 390 e 1280 px", async () => {
  await fixture(async (page, state) => {
    const cost = page.getByRole("group", { name: "Custo utilizado", exact: true });
    const sale = page.getByRole("group", { name: "Preço de venda", exact: true });
    await expect(cost).toContainText(/R\$\s*2,00/);
    await expect(cost).toContainText("ANB · Conferência vencida · em continuidade");
    await expect(sale).toContainText(/R\$\s*3,00/);
    await expect(sale).toContainText("+50%");
    await expect(cost).not.toContainText("Indisponível");
    await expect(sale).not.toContainText("99,99");
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const card of [cost, sale]) {
        const geometry = await card.evaluate(element => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, overflow: element.scrollWidth > element.clientWidth, viewport: innerWidth };
        });
        assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport && !geometry.overflow, `cartão cortado em ${width}px: ${JSON.stringify(geometry)}`);
      }
      const captureRoot = process.env.PRODUCT_COST_PRICE_CAPTURE_ROOT;
      if (captureRoot) { mkdirSync(captureRoot, { recursive: true }); await page.screenshot({ path: join(captureRoot, `synthetic-cost-price-${width}.png`), fullPage: true }); }
    }
    assert.equal(state.offerReads, 0);
    assert.deepEqual(state.writes, []);
  });
});

test("sem oferta elegível não inventa custo nem usa preço legado como venda", async () => {
  await fixture(async page => {
    for (const name of ["Custo utilizado", "Preço de venda"]) {
      const card = page.getByRole("group", { name, exact: true });
      await expect(card).toContainText("Indisponível");
      await expect(card).toContainText("Sem oferta elegível para venda");
      await expect(card).not.toContainText(/R\$/);
    }
  }, "no-offer");
});

test("consulta sem edição não expõe custo recebido nem controles privilegiados", async () => {
  await fixture(async (page, state) => {
    await expect(page.getByRole("group", { name: "Custo utilizado", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/R\$\s*2,00/);
    await expect(page.getByRole("group", { name: "Preço de venda", exact: true })).toContainText(/R\$\s*3,00/);
    assert.equal(state.offerReads, 0);
    assert.deepEqual(state.writes, []);
  }, "readonly");
});

test("produto físico mantém edição direta de preço sem controles de fornecedor", async () => {
  await fixture(async (page, state) => {
    await expect(page.getByRole("group", { name: "Preço de venda", exact: true })).toContainText(/R\$\s*4,20/);
    await expect(page.getByRole("group", { name: "Custo utilizado", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Editar venda e classificação" }).click();
    await expect(page.getByLabel("Preço normal (R$)", { exact: true })).toHaveValue("4.20");
    await expect(page.getByLabel("Acréscimo sobre o custo (%)", { exact: true })).toHaveCount(0);
    await page.getByLabel("Preço normal (R$)", { exact: true }).fill("4,50");
    await page.getByRole("button", { name: "Salvar ajuste", exact: true }).click();
    await expect(page.getByLabel("Recargas do catálogo")).toHaveText("1");
    assert.deepEqual(state.writes.map(write => write.body), [{ expectedUpdatedAt: updatedAt, price: 4.5 }]);
  }, "physical");
});

test("comparação é carregada ao abrir e revisão exige nova conferência antes de salvar custo", async () => {
  await fixture(async (page, state) => {
    assert.equal(state.offerReads, 0);
    await openOffers(page);
    assert.equal(state.offerReads, 1);
    await expect(page.getByText(/DM Paraná · custo final/)).toContainText(/R\$\s*3,00/);
    await page.getByRole("combobox", { name: /^Distribuidor/ }).selectOption("PROFARMA");
    await page.getByLabel("ST por unidade conferida na Profarma (R$)", { exact: false }).fill("0,17");
    await page.getByLabel(/Conferi agora:/).check();
    await page.getByLabel(/Renovar a cota histórica/).check();
    await reviewAnb(page);
    await expect(page.getByLabel("Código no fornecedor", { exact: true })).toHaveValue("QA-ANB-004");
    await expect(page.getByLabel("Custo final por unidade (R$)", { exact: false })).toHaveValue("2.00");
    await expect(page.getByLabel("Teto de venda conferido na CMED (R$)", { exact: false })).toHaveValue("10.00");
    await expect(page.getByLabel("Saldo real, se informado", { exact: true })).toHaveValue("8");
    await expect(page.getByLabel(/Conferi agora:/)).not.toBeChecked();
    await expect(page.getByLabel(/Renovar a cota histórica/)).not.toBeChecked();
    await page.getByRole("combobox", { name: /^Distribuidor/ }).selectOption("PROFARMA");
    await expect(page.getByLabel("ST por unidade conferida na Profarma (R$)", { exact: false })).toHaveValue("");
    await reviewAnb(page);
    await page.getByLabel("Custo final por unidade (R$)", { exact: false }).fill("2,50");
    await page.getByLabel(/Conferi agora:/).check();
    const before = Date.now();
    await page.getByRole("button", { name: "Salvar conferência da oferta", exact: true }).click();
    await expect(page.getByLabel("Recargas do catálogo")).toHaveText("1");
    assert.equal(state.productReads, 1);
    assert.equal(state.writes.length, 1);
    const write = state.writes[0];
    assert.equal(write.method, "POST");
    const { observedAt, validUntil, ...body } = write.body;
    assert.deepEqual(body, { productId: "distributor", supplier: "ANB", externalCode: "QA-ANB-004", eanNormalized: ean, unitCostCents: 250, substitutionTaxCents: null, retailCeilingCents: 1000, available: true, stockQuantity: 8, allocationQuantity: 5, replenishAllocation: false });
    assert.equal(Date.parse(String(validUntil)) - Date.parse(String(observedAt)), 24 * 60 * 60_000);
    assert.ok(Date.parse(String(observedAt)) >= before - 2000 && Date.parse(String(observedAt)) <= Date.now());
    await expect(page.getByRole("dialog").getByRole("status")).toContainText("Conferência salva.");
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page.getByRole("group", { name: "Custo utilizado", exact: true })).toContainText(/R\$\s*2,50/);
    await expect(page.getByRole("group", { name: "Custo utilizado", exact: true })).toContainText("Conferência vigente");
    await expect(page.getByRole("group", { name: "Preço de venda", exact: true })).toContainText(/R\$\s*3,75/);
  });
});

test("venda da distribuidora envia somente acréscimo e versão esperada sem gravar preço direto", async () => {
  await fixture(async (page, state) => {
    await page.getByRole("button", { name: "Editar venda e classificação" }).click();
    await page.getByLabel("Acréscimo sobre o custo (%)", { exact: true }).fill("25");
    await expect(page.getByText(/Venda após ajuste:/)).toContainText(/R\$\s*2,50/);
    await expect(page.getByLabel("Preço normal (R$)", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Salvar ajuste", exact: true }).click();
    await expect(page.getByLabel("Recargas do catálogo")).toHaveText("1");
    assert.deepEqual(state.writes, [{ method: "PATCH", path: "/api/admin/produtos/distributor/operacao", body: { expectedUpdatedAt: updatedAt, supplierMarkupBps: 2500 } }]);
  });
});

test("oferta salva permanece registrada quando recarregar catálogo falha", async () => {
  await fixture(async (page, state) => {
    await openOffers(page);
    await reviewAnb(page);
    await page.getByLabel("Custo final por unidade (R$)", { exact: false }).fill("2,50");
    await page.getByLabel(/Conferi agora:/).check();
    await page.getByRole("button", { name: "Salvar conferência da oferta", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("status")).toContainText("A oferta foi salva, mas não foi possível atualizar o catálogo. Recarregue a página");
    await expect(page.getByText(/ANB · custo final/)).toContainText(/R\$\s*2,50/);
    assert.equal(state.writes.length, 1);
    assert.equal(state.writes[0].body.unitCostCents, 250);
    assert.equal(state.productReads, 1);
    await expect(page.getByLabel("Recargas do catálogo")).toHaveText("0");
    await expect(page.getByRole("button", { name: "Salvar conferência da oferta", exact: true })).toBeEnabled();
  }, "reload-error");
});

test("oferta de outro EAN bloqueia revisão e não copia código nem custo", async () => {
  await fixture(async (page, state) => {
    await page.getByRole("button", { name: "Comparar / editar custos", exact: true }).click();
    await expect(page.getByRole("button", { name: "Revisar oferta ANB", exact: true })).toBeDisabled();
    await expect(page.getByText(/Apresentação incompatível: EAN inválido ou diferente do produto/)).toBeVisible();
    await expect(page.getByLabel("Código no fornecedor", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Custo final por unidade (R$)", { exact: false })).toHaveValue("");
    assert.deepEqual(state.writes, []);
  }, "wrong-ean");
});

test("trocar distribuidor limpa proposta e confirmações sem salvar dados ANB sobre DM", async () => {
  await fixture(async (page, state) => {
    await openOffers(page);
    await reviewAnb(page);
    await page.getByLabel("Custo final por unidade (R$)", { exact: false }).fill("2,50");
    await page.getByLabel(/Conferi agora:/).check();
    await page.getByLabel(/Renovar a cota histórica/).check();
    await page.getByRole("combobox", { name: /^Distribuidor/ }).selectOption("DM");
    for (const label of ["Código no fornecedor", "Custo final por unidade (R$)", "Teto de venda conferido na CMED (R$)", "Saldo real, se informado"]) {
      await expect(page.getByLabel(label, { exact: false })).toHaveValue("");
    }
    await expect(page.getByLabel(/Conferi agora:/)).not.toBeChecked();
    await expect(page.getByLabel(/Renovar a cota histórica/)).not.toBeChecked();
    await page.getByRole("button", { name: "Salvar conferência da oferta", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("status")).toContainText("Confira custo, teto de venda, código");
    assert.deepEqual(state.writes, []);
    await page.getByRole("combobox", { name: /^Distribuidor/ }).selectOption("PROFARMA");
    await expect(page.getByLabel("ST por unidade conferida na Profarma (R$)", { exact: false })).toHaveValue("");
  });
});
