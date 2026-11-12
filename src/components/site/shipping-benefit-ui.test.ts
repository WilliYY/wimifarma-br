import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

test("checkout mostra a menor meta antes da seleção e preserva as opções pagas", async () => {
  const stylesheet = (await readFile("src/app/globals.css", "utf8")).replace(
    '@import "tailwindcss";',
    '@import "tailwindcss" source(none);\n@source "../components/site/checkout-shipping-options.tsx";\n@source "../components/site/shipping-benefit-note.tsx";',
  );
  const css = await postcss([tailwind()]).process(stylesheet, { from: "src/app/globals.css" });
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CheckoutShippingOptions} from './src/components/site/checkout-shipping-options';function App(){const [selected,setSelected]=React.useState();const [cep,setCep]=React.useState('01001000');return <><button onClick={()=>setCep('02002000')}>Trocar CEP</button><CheckoutShippingOptions postalCode={cep} available selected={selected} onSelect={setSelected} onPickup={()=>{}}/></>};createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", platform: "browser", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "cart-fixture", setup(builder) {
      builder.onResolve({ filter: /cart-provider$/ }, () => ({ path: "cart", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export const useCart=()=>({items:[{id:'synthetic',quantity:1,unitPriceCents:10000,requiresPrescription:false,isPopularPharmacy:false}]});` }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const benefit = (minimumOrderCents: number | null, remainingCents: number | null, status = "regular") => ({ status, customerPriceCents: 1900, subsidyCents: 0, minimumOrderCents, remainingCents });
    let benefits = [benefit(20000, 10000), { ...benefit(15000, 5000), customerPriceCents: 2000 }];
    let fail = false;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (path === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css.css });
      if (path === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>' });
      if (path.startsWith("/api/")) return route.fulfill(fail ? { status: 503, json: { error: "Cotação indisponível" } } : { json: { data: benefits.map((benefit, index) => ({ provider: "melhor-envio", serviceId: index + 1, carrier: "Transportadora sintética", service: `Serviço ${index + 1}`, priceCents: 1900 + index * 100, deliveryDays: 5 + index, token: `token-${index}`, benefit })) } });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3198/");
    await expect(page.getByText(/faltam R\$\s*50,00/)).toBeVisible();
    const progress = page.getByRole("progressbar", { name: /Serviço 2/ });
    await expect(progress).toHaveAttribute("aria-valuenow", "66");
    await expect(page.getByText(/Estimativa da cotação atual/)).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("group")).toContainText(/R\$\s*19,00/);
    await expect(page.getByRole("group")).toContainText(/R\$\s*20,00/);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByText(/faltam R\$\s*50,00/)).toBeVisible();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const bounds = await page.getByRole("group").boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
    }
    await page.getByRole("radio").first().check();
    await expect(page.getByRole("progressbar")).toHaveCount(1);
    await expect(page.getByRole("radio").first()).toBeChecked();
    benefits = [benefit(null, null), benefit(null, null)];
    await page.getByRole("button", { name: "Trocar CEP" }).click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(2);
    benefits = [benefit(15000, 5000), { ...benefit(null, null, "free"), customerPriceCents: 0, subsidyCents: 2000 }];
    await page.getByRole("button", { name: "Consultar novamente" }).click();
    await expect(page.getByText("Frete grátis nesta cotação")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await expect(page.getByRole("group")).toContainText("Grátis");
    benefits = [{ ...benefit(null, null, "discounted"), customerPriceCents: 1400, subsidyCents: 500 }, { ...benefit(null, null), customerPriceCents: 2000 }];
    await page.getByRole("button", { name: "Consultar novamente" }).click();
    await expect(page.getByText(/R\$\s*5,00 de desconto no frete/)).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    fail = true;
    await page.getByRole("button", { name: "Consultar novamente" }).click();
    await expect(page.getByText("Cotação indisponível")).toBeVisible();
    await expect(page.getByText("Frete grátis nesta cotação")).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
