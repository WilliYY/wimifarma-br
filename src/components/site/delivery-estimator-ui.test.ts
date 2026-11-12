import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import type { CartProduct } from "./cart-provider";
import type { ShippingOption } from "@/features/shipping/schema";

const origin = "http://127.0.0.1:3196";
const captureRoot = process.env.DELIVERY_ESTIMATOR_CAPTURE_ROOT;
const product: CartProduct = { id: "synthetic-delivery", slug: "synthetic-delivery", name: "Produto sintético para consulta de entrega com nome composto", category: "Higiene", imageUrl: null, stock: 10, unitPriceCents: 2590, originalPriceCents: null, requiresPrescription: false, isPopularPharmacy: false };
const regularBenefit = { status: "regular" as const, customerPriceCents: 1875, subsidyCents: 0, minimumOrderCents: null, remainingCents: null };
const quote: ShippingOption = { provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 1875, deliveryDays: 4, benefit: regularBenefit };
const browser = chromium.launch();
after(async () => (await browser).close());
const styles = readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css);
const bundle = build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {CartProvider} from './src/components/site/cart-provider';
    import {CatalogShippingProvider,CatalogShippingButton} from './src/components/site/catalog-shipping-preview';
    import {DeliveryEstimator} from './src/components/site/delivery-estimator';
    const product=${JSON.stringify(product)};
    createRoot(document.getElementById('root')).render(<CartProvider>{location.pathname==='/full'
      ? <DeliveryEstimator product={product}/>
      : <CatalogShippingProvider><CatalogShippingButton product={product}/></CatalogShippingProvider>}</CartProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "delivery-ui-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}", loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

async function fixture(width: number, run: (page: Page) => Promise<void>) {
  const context = await (await browser).newContext({ viewport: { width, height: width === 320 ? 568 : 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/" || url.pathname === "/full") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0;font-family:Arial,sans-serif}#root{max-width:760px;margin:auto;padding:16px}</style><div id="root"></div><script src="/fixture.js"></script>' });
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
    if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: await styles });
    if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: {} });
    return route.abort();
  });
  try { await run(page); assert.deepEqual(errors, []); } finally { await context.close(); }
}

async function capture(page: Page, name: string, evidence?: unknown) {
  if (!captureRoot) return;
  await mkdir(captureRoot, { recursive: true });
  const dialog = page.getByRole("dialog");
  await dialog.screenshot({ path: join(captureRoot, `${name}.png`) });
  if (evidence) await writeFile(join(captureRoot, `${name}.json`), JSON.stringify(evidence, null, 2));
}

for (const width of [320, 390, 1440]) {
  test(`frete mantém botão e CEP estáveis durante a consulta em ${width}px`, async () => {
    await fixture(width, async page => {
      let release: (() => void) | undefined;
      const requests: unknown[] = [];
      await page.route("**/api/fretes/estimativa", async route => {
        requests.push(route.request().postDataJSON());
        await new Promise<void>(resolve => { release = resolve; });
        await route.fulfill({ json: { data: { mode: "available", options: [quote, { ...quote, serviceId: 2, service: "SEDEX" }, { ...quote, serviceId: 3, service: "Entrega com prazo estendido" }] } } }).catch(() => undefined);
      });
      await page.goto(origin);
      const opener = page.getByRole("button", { name: /^Ver frete de / });
      await opener.click();
      const dialog = page.getByRole("dialog", { name: "Frete e prazo", exact: true });
      const postal = dialog.getByRole("textbox", { name: "CEP", exact: true });
      await expect(postal).toBeFocused();
      await postal.fill("80010-000");
      const before = (await dialog.getByRole("button", { name: "Consultar", exact: true }).boundingBox())!;
      await dialog.getByRole("button", { name: "Consultar", exact: true }).click();
      await expect.poll(() => requests.length).toBe(1);
      const loading = dialog.getByRole("button", { name: "Consultando...", exact: true });
      await expect(loading).toBeDisabled();
      const during = (await loading.boundingBox())!;
      const input = await postal.evaluate(element => {
        const style = getComputedStyle(element);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return { text: context.measureText((element as HTMLInputElement).value).width, available: element.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) };
      });
      const metrics = { width, before: before.width, during: during.width, input };
      try {
        await capture(page, `carregando-${width}`, metrics);
        assert.ok(Math.abs(before.width - during.width) <= 1, `botão mudou de largura: ${JSON.stringify(metrics)}`);
        assert.ok(input.available >= input.text, `CEP cortado: ${JSON.stringify(metrics)}`);
        await expect(postal).toHaveValue("80010-000");
      } finally { release?.(); }
      await expect(dialog.getByRole("status")).toContainText("Entrega com prazo estendido");
      await expect(dialog.getByText("Frete consultado para este pedido", { exact: true })).toHaveCount(0);
      await expect(dialog.getByText("Prazos estimados incluem preparação. O checkout confirma o frete.", { exact: true })).toHaveCount(1);
      await expect(dialog.getByText(/18,75/)).toHaveCount(3);
      assert.deepEqual(requests, [{ postalCode: "80010000", productId: product.id, quantity: 1 }]);
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await capture(page, `regular-compacto-${width}`);
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
    });
  });
}

test("frete compacto preserva desconto, gratuidade, subsídio e progresso reais", async () => {
  await fixture(390, async page => {
    const options: ShippingOption[] = [
      { ...quote, service: "Regular sem benefício" },
      { ...quote, serviceId: 2, service: "Regular com progresso", benefit: { ...regularBenefit, minimumOrderCents: 15000, remainingCents: 5010 } },
      { ...quote, serviceId: 3, service: "Regular com subsídio", benefit: { ...regularBenefit, customerPriceCents: 875, subsidyCents: 1000 } },
      { ...quote, serviceId: 4, service: "Desconto confirmado", benefit: { ...regularBenefit, status: "discounted", customerPriceCents: 375, subsidyCents: 1500 } },
      { ...quote, serviceId: 5, service: "Gratuidade confirmada", benefit: { ...regularBenefit, status: "free", customerPriceCents: 0, subsidyCents: 1875 } },
      { ...quote, serviceId: 6, service: "Regular com mínimo", benefit: { ...regularBenefit, minimumOrderCents: 15000 } },
      { ...quote, serviceId: 7, service: "Regular com restante", benefit: { ...regularBenefit, remainingCents: 5010 } },
    ];
    await page.route("**/api/fretes/estimativa", route => route.fulfill({ json: { data: { mode: "available", options } } }));
    await page.goto(origin);
    await page.getByRole("button", { name: /^Ver frete de / }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "CEP", exact: true }).fill("80010-000");
    await dialog.getByRole("button", { name: "Consultar", exact: true }).click();
    const rows = dialog.getByRole("listitem");
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ hasText: "Regular sem benefício" }).getByText("Frete consultado para este pedido", { exact: true })).toHaveCount(0);
    await expect(rows.filter({ hasText: "Regular com progresso" })).toContainText(/faltam R\$\s*50,10/);
    await expect(rows.filter({ hasText: "Regular com progresso" })).toContainText(/Meta estimada de R\$\s*150,00/);
    await expect(rows.filter({ hasText: "Regular com progresso" }).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");
    await expect(rows.filter({ hasText: "Regular com subsídio" })).toContainText(/10,00 de desconto no frete/);
    await expect(rows.filter({ hasText: "Desconto confirmado" })).toContainText(/15,00 de desconto no frete/);
    await expect(rows.filter({ hasText: "Desconto confirmado" })).toContainText(/3,75/);
    await expect(rows.filter({ hasText: "Gratuidade confirmada" })).toContainText("Frete grátis nesta cotação");
    await expect(rows.filter({ hasText: "Gratuidade confirmada" }).getByText("Grátis", { exact: true })).toHaveCount(1);
    for (const service of ["Regular com mínimo", "Regular com restante", "Desconto confirmado"]) {
      await expect(rows.filter({ hasText: service }).getByRole("progressbar")).toHaveCount(0);
    }
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth));
      await dialog.evaluate(element => { element.scrollTop = 0; });
      await capture(page, `beneficios-${width}`);
    }
    await expect(dialog.getByText("Prazos estimados incluem preparação. O checkout confirma o frete.", { exact: true })).toHaveCount(1);
    await expect(dialog.getByText(/Estimativa da cotação atual/)).toHaveCount(0);
  });
});

test("frete fora do modo compacto evita repetir a nota regular", async () => {
  await fixture(390, async page => {
    await page.route("**/api/fretes/estimativa", route => route.fulfill({ json: { data: { mode: "available", options: [quote] } } }));
    await page.goto(`${origin}/full`);
    await page.getByRole("textbox", { name: "CEP", exact: true }).fill("80010-000");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByRole("status").getByText("Frete consultado para este pedido", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText(/18,75/);
  });
});
