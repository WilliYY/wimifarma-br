import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import type { CartProduct } from "./cart-provider";

const origin = "http://127.0.0.1:3197";
const product: CartProduct = {
  id: "synthetic-a", slug: "produto-a", name: "Produto A", imageUrl: null,
  category: null, unitPriceCents: 2590, originalPriceCents: null, stock: 10,
  requiresPrescription: false, isPopularPharmacy: false,
};
const otherProduct = { ...product, id: "synthetic-b", slug: "produto-b", name: "Produto B" };
const quote = {
  provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC",
  priceCents: 1875, deliveryDays: 4, token: "synthetic-token",
};

async function fixture(run: (page: Page) => Promise<void>) {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';
        import {CartProvider} from './src/components/site/cart-provider';
        import {CatalogShippingProvider,CatalogShippingButton} from './src/components/site/catalog-shipping-preview';
        createRoot(document.getElementById('root')).render(<CartProvider><CatalogShippingProvider>
          <label>Pesquisar produtos<input type="search"/></label>
          <article onClick={()=>window.cardClicks++}><CatalogShippingButton product={${JSON.stringify(product)}}/></article>
          <CatalogShippingButton product={${JSON.stringify(otherProduct)}}/>
        </CatalogShippingProvider></CartProvider>);`,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "catalog-shipping-link", setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}",
        loader: "tsx", resolveDir: process.cwd(),
      }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(item => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...item, id: "cart-only", quantity: 7 }])), product);
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script>window.cardClicks=0;</script><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: { ok: true } });
      return route.abort();
    });
    try { await run(page); } catch (error) {
      if (errors.length) throw new Error(errors.join("; "), { cause: error });
      throw error;
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("frete do catálogo consulta apenas após envio, para uma unidade e sem alterar carrinho", async () => {
  await fixture(async page => {
    const requests: unknown[] = [];
    await page.route("**/api/fretes/cotacao", route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: [quote] } });
    });
    await page.goto(origin);
    await page.getByLabel("Pesquisar produtos").fill("Produto");
    const opener = page.getByRole("button", { name: "Ver frete de Produto A", exact: true });
    await opener.click();
    await expect(page.getByRole("dialog", { name: "Frete e prazo" })).toHaveCount(1);
    await expect(page.getByRole("dialog")).toContainText("Produto A");
    await expect(page.getByRole("dialog")).toContainText("1 unidade");
    await page.getByRole("textbox", { name: "CEP", exact: true }).fill("80010-000");
    assert.equal(requests.length, 0);
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect.poll(() => requests.length).toBe(1);
    assert.deepEqual(requests[0], { postalCode: "80010000", items: [{ productId: product.id, quantity: 1, expectedUnitPriceCents: 2590 }] });
    await expect(page.getByRole("status")).toContainText(/18,75/);
    assert.equal(await page.evaluate("window.cardClicks"), 0);
    assert.deepEqual(await page.evaluate(() => (JSON.parse(localStorage.getItem("wimifarma-cart-v1")!) as { id: string; quantity: number }[]).map(({ id, quantity }) => ({ id, quantity }))), [{ id: "cart-only", quantity: 7 }]);
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(opener).toBeFocused();
  });
});

test("CEP permanece entre produtos apenas na página e resultado anterior não reaparece", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/cotacao", route => { requests++; return route.fulfill({ json: { data: [quote] } }); });
    await page.goto(origin);
    await page.getByRole("button", { name: "Ver frete de Produto A", exact: true }).click();
    await page.getByRole("textbox", { name: "CEP", exact: true }).fill("80010-000");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("PAC");
    await page.keyboard.press("Escape");
    const opener = page.getByRole("button", { name: "Ver frete de Produto B", exact: true });
    await opener.click();
    await expect(page.getByRole("dialog")).toContainText("Produto B");
    await expect(page.getByRole("textbox", { name: "CEP", exact: true })).toHaveValue("80010-000");
    await expect(page.getByText(/18,75/)).toHaveCount(0);
    assert.equal(requests, 1);
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    await page.reload();
    await page.getByRole("button", { name: "Ver frete de Produto A", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "CEP", exact: true })).toHaveValue("");
    assert.equal(requests, 1);
  });
});

test("perfil sem envio preserva motivo da API, sem preço inventado", async () => {
  await fixture(async page => {
    const error = "Produto ainda não liberado para envio por transportadora.";
    await page.route("**/api/fretes/cotacao", route => route.fulfill({ status: 422, json: { error } }));
    await page.goto(origin);
    await page.getByRole("button", { name: "Ver frete de Produto A", exact: true }).click();
    await page.getByRole("textbox", { name: "CEP", exact: true }).fill("80010-000");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(error);
    await expect(page.getByRole("status")).not.toContainText(/18,75|4 dias|fora de cobertura/i);
  });
});

test("fechar durante consulta ignora resposta atrasada ao abrir outro produto", async () => {
  await fixture(async page => {
    let release: (() => void) | undefined;
    let finished: Promise<void> | undefined;
    let requests = 0;
    await page.route("**/api/fretes/cotacao", async route => {
      requests++;
      const pending = new Promise<void>(resolve => { release = resolve; });
      finished = pending.then(() => route.fulfill({ json: { data: [{ ...quote, service: "Serviço antigo", priceCents: 9999 }] } }).catch(() => undefined));
      await finished;
    });
    await page.goto(origin);
    await page.getByRole("button", { name: "Ver frete de Produto A", exact: true }).click();
    await page.getByRole("textbox", { name: "CEP", exact: true }).fill("80010-000");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect.poll(() => requests).toBe(1);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ver frete de Produto B", exact: true }).click();
    release?.();
    await finished;
    await expect(page.getByRole("dialog")).not.toContainText(/Serviço antigo|99,99/);
    await expect(page.getByRole("button", { name: "Consultar", exact: true })).toBeEnabled();
    assert.equal(requests, 1);
  });
});
