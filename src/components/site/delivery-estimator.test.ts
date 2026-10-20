import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import type { CartProduct } from "./cart-provider";

const origin = "http://127.0.0.1:3198";
const product: CartProduct = {
  id: "synthetic-product", slug: "produto-sintetico", name: "Produto sintético",
  imageUrl: null, category: null, unitPriceCents: 2590, originalPriceCents: 2990,
  stock: 10, requiresPrescription: false, isPopularPharmacy: false,
};
const quote = {
  provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC",
  priceCents: 1875, deliveryDays: 4, token: "synthetic-quote-token",
};

async function fixture(run: (page: Page) => Promise<void>, cartOnly = false, fixtureProduct = product, purchasePanel = false) {
  const bundle = await build({
    stdin: {
      contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
        import {CartProvider} from './src/components/site/cart-provider';
        import {DeliveryEstimator} from './src/components/site/delivery-estimator';
        ${purchasePanel ? "import {ProductQuantityProvider} from './src/components/site/product-quantity';import {ProductPurchasePanel} from './src/components/site/product-purchase-panel';" : ""}
        function Fixture(){const [quantity,setQuantity]=useState(2);return <CartProvider>
          ${purchasePanel ? `<ProductQuantityProvider><ProductPurchasePanel product={${JSON.stringify(fixtureProduct)}}/><DeliveryEstimator product={${JSON.stringify(fixtureProduct)}}/></ProductQuantityProvider>` : `
          <label>Quantidade de teste<input type="number" value={quantity} onChange={event=>setQuantity(Number(event.target.value))}/></label>
          <DeliveryEstimator ${cartOnly ? "" : `product={${JSON.stringify(fixtureProduct)}} quantity={quantity}`}/>`}
        </CartProvider>};createRoot(document.getElementById('root')).render(<Fixture/>);`,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "delivery-navigation-fixture", setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
      builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "fixture" }));
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
        contents: args.path === "link" ? "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}" : args.path === "image" ? "import React from 'react';export default function Image({fill,priority,unoptimized,...props}){return <img {...props}/>}" : "export const useRouter=()=>({push(){},refresh(){}});export const usePathname=()=>'/produto/produto-sintetico';",
        loader: "tsx", resolveDir: process.cwd(),
      }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
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

async function consult(page: Page, postalCode: string) {
  await page.getByRole("textbox", { name: "CEP", exact: true }).fill(postalCode);
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
}

test("CEP nacional consulta frete do produto e quantidade atuais, sem misturar o carrinho", async () => {
  await fixture(async page => {
    const requests: unknown[] = [];
    await page.addInitScript(other => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...other, id: "other-product", quantity: 7 }])), product);
    await page.route("**/api/fretes/cotacao", route => {
      assert.equal(route.request().method(), "POST");
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: [quote] } });
    });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    assert.deepEqual(requests[0], { postalCode: "80010000", items: [{ productId: product.id, quantity: 2, expectedUnitPriceCents: 2590 }] });
    await expect(page.getByRole("status")).toContainText("PAC");
    await expect(page.getByRole("status")).toContainText(/18,75/);
    await expect(page.getByRole("status")).toContainText(/4 dias/);
  });
});

test("CEP inválido e entrega local não consultam transportadoras", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/cotacao", route => { requests++; return route.fulfill({ json: { data: [quote] } }); });
    await page.goto(origin);
    await consult(page, "12345");
    await expect(page.getByRole("status")).toContainText(/CEP/i);
    for (const [postalCode, city] of [["87525-000", "Ivaté"], ["87485-000", "Douradina"]]) {
      await consult(page, postalCode);
      await expect(page.getByRole("status")).toContainText(city);
      await expect(page.getByRole("status")).toContainText(/grátis|gratuita/i);
    }
    assert.equal(requests, 0);
  });
});

for (const [status, error] of [
  [422, "Produto ainda não liberado para envio por transportadora."],
  [409, "Estoque insuficiente para este produto."],
] as const) {
  test(`erro de cotação preserva o motivo (${status}), sem inventar preço ou falta de cobertura`, async () => {
    await fixture(async page => {
      await page.route("**/api/fretes/cotacao", route => route.fulfill({ status, json: { error } }));
      await page.goto(origin);
      await consult(page, "80010-000");
      await expect(page.getByRole("status")).toContainText(error);
      await expect(page.getByRole("status")).not.toContainText(/fora de cobertura|ainda nao disponivel|18,75|4 dias/i);
    });
  });
}

for (const change of ["CEP", "quantidade"] as const) {
  test(`alteração de ${change} invalida cotação anterior e ignora resposta atrasada`, async () => {
    await fixture(async page => {
      const requests: { postalCode: string; items: { quantity: number }[] }[] = [];
      let release: (() => void) | undefined;
      let finished: Promise<void> | undefined;
      await page.route("**/api/fretes/cotacao", async route => {
        requests.push(route.request().postDataJSON());
        if (requests.length === 1) {
          const pending = new Promise<void>(resolve => { release = resolve; });
          finished = pending.then(async () => {
            await route.fulfill({ json: { data: [{ ...quote, service: "Serviço antigo", priceCents: 9999 }] } }).catch(() => undefined);
          });
          await finished;
          return;
        }
        return route.fulfill({ json: { data: [quote] } });
      });
      await page.goto(origin);
      await consult(page, "80010-000");
      await expect.poll(() => requests.length).toBe(1);
      if (change === "CEP") await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01001-000");
      else {
        await page.getByLabel("Quantidade de teste").fill("3");
        await page.getByLabel("Quantidade de teste").fill("2");
        await expect(page.getByRole("button", { name: "Consultar", exact: true })).toBeEnabled();
        await page.getByLabel("Quantidade de teste").fill("3");
      }
      await expect(page.getByText("Serviço antigo", { exact: true })).toHaveCount(0);
      release?.();
      await finished;
      await page.getByRole("button", { name: "Consultar", exact: true }).click();
      await expect.poll(() => requests.length).toBe(2);
      assert.equal(requests[1].postalCode, change === "CEP" ? "01001000" : "80010000");
      assert.equal(requests[1].items[0].quantity, change === "quantidade" ? 3 : 2);
      await expect(page.getByRole("status")).toContainText("PAC");
      await expect(page.getByRole("status")).not.toContainText(/Serviço antigo|99,99/);
      if (change === "CEP") await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01001");
      else await page.getByLabel("Quantidade de teste").fill("4");
      await expect(page.getByText(/18,75/)).toHaveCount(0);
    });
  });
}

test("simulador sem produto orienta adicionar itens quando o carrinho está vazio", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/cotacao", route => { requests++; return route.fulfill({ json: { data: [quote] } }); });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect(page.getByRole("status")).toContainText(/adicion.*produto|adicion.*ite/i);
    assert.equal(requests, 0);
  }, true);
});

test("simulador sem produto consulta os itens e preços do carrinho hidratado", async () => {
  await fixture(async page => {
    const requests: unknown[] = [];
    await page.addInitScript(item => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...item, quantity: 3 }])), product);
    await page.route("**/api/fretes/cotacao", route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: [quote] } });
    });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    assert.deepEqual(requests[0], { postalCode: "80010000", items: [{ productId: product.id, quantity: 3, expectedUnitPriceCents: 2590 }] });
    await expect(page.getByRole("status")).toContainText(/18,75/);
  }, true);
});

test("seletor real do produto compartilha quantidade com a simulação de frete", async () => {
  await fixture(async page => {
    const requests: { items: { quantity: number }[] }[] = [];
    await page.route("**/api/fretes/cotacao", route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: [quote] } });
    });
    await page.goto(origin);
    await page.getByRole("button", { name: "Aumentar quantidade", exact: true }).first().click();
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    assert.equal(requests[0].items[0].quantity, 2);
    await expect(page.getByRole("status")).toContainText(/18,75/);
  }, false, product, true);
});

for (const prescriptionType of ["CONTROLLED", "ANTIMICROBIAL"] as const) {
  test(`produto ${prescriptionType} preserva atendimento assistido sem cotar transportadora`, async () => {
    await fixture(async page => {
      let requests = 0;
      await page.route("**/api/fretes/cotacao", route => { requests++; return route.fulfill({ json: { data: [quote] } }); });
      await page.goto(origin);
      await consult(page, "80010-000");
      await expect(page.getByRole("status")).toContainText(/atendimento.*farmácia/i);
      assert.equal(requests, 0);
    }, false, { ...product, requiresPrescription: true, prescriptionType });
  });
}

test("gratuidade nacional respeita o limiar de R$ 99,90 sem dispensar cotação", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/cotacao", route => { requests++; return route.fulfill({ json: { data: [quote] } }); });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect(page.getByRole("status")).toContainText("PAC");
    await expect(page.getByRole("status")).toContainText("Grátis");
    assert.equal(requests, 1);
    await page.getByLabel("Quantidade de teste").fill("1");
    await consult(page, "80010-000");
    await expect(page.getByRole("status")).toContainText(/18,75/);
    assert.equal(requests, 2);
  }, false, { ...product, unitPriceCents: 4995 });
});
