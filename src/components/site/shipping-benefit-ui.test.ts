import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const styles = postcss([tailwind()]).process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" }).then(result => result.css);

for (const width of [320, 390, 1440]) {
  test(`seleção e preço assinados invalidam por créditos em ${width}px`, async () => {
    const bundle = await build({
      stdin: { contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
        import {CartProvider} from './src/components/site/cart-provider';
        import {CheckoutShippingOptions} from './src/components/site/checkout-shipping-options';
        import {ShippingBenefitFields} from './src/components/admin/shipping-benefit-fields';
        import {defaultShippingBenefitPolicy} from './src/features/shipping/benefit-policy';
        function Fixture(){const [selected,setSelected]=useState();const [discount,setDiscount]=useState(0);const [policy,setPolicy]=useState(defaultShippingBenefitPolicy);return <CartProvider><button onClick={()=>setDiscount(500)}>Usar crédito</button><output aria-label="Seleção">{selected?.token || 'Nenhuma'}</output><CheckoutShippingOptions postalCode="80010000" selected={selected} onSelect={setSelected} discountCents={discount} available onPickup={()=>{}}/><ShippingBenefitFields value={policy} onChange={setPolicy}/></CartProvider>};createRoot(document.getElementById('root')).render(<Fixture/>);`, resolveDir: process.cwd(), loader: "tsx" },
      bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '\"production\"' },
    });
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      await page.addInitScript(() => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ id: "synthetic", slug: "synthetic", name: "Sintético", imageUrl: null, category: null, unitPriceCents: 20000, originalPriceCents: null, stock: 5, quantity: 1, requiresPrescription: false, isPopularPharmacy: false }])));
      const requests: { discountCents: number }[] = [];
      const fixtureCss = await styles;
      await page.route("**/*", route => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>#root{max-width:760px;margin:auto;padding:16px}output{display:block;margin-block:12px}</style><div id="root"></div><script src="/fixture.js"></script>' });
        if (path === "/fixture.css") return route.fulfill({ contentType: "text/css", body: fixtureCss });
        if (path === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
        if (path === "/api/fretes/cotacao") {
          const body = route.request().postDataJSON(); requests.push(body);
          return route.fulfill({ json: { data: [{ provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 1875, deliveryDays: 4, token: `signed-${body.discountCents}`, benefit: { status: body.discountCents ? "regular" : "discounted", customerPriceCents: body.discountCents ? 1875 : 375, subsidyCents: body.discountCents ? 0 : 1500, minimumOrderCents: null, remainingCents: null } }] } });
        }
        return route.fulfill({ json: {} });
      });
      await page.goto("http://127.0.0.1:3199");
      await expect(page.getByRole("radio")).toBeVisible();
      await expect(page.getByText(/3,75/)).toBeVisible();
      await page.getByRole("radio").check();
      await expect(page.getByLabel("Seleção", { exact: true })).toHaveText("signed-0");
      await expect(page.getByText(/A Wimifarma oferece/)).toContainText(/15,00/);
      if (process.env.SHIPPING_BENEFIT_CAPTURE_ROOT) {
        mkdirSync(process.env.SHIPPING_BENEFIT_CAPTURE_ROOT, { recursive: true });
        await page.screenshot({ path: join(process.env.SHIPPING_BENEFIT_CAPTURE_ROOT, `beneficio-frete-${width}.png`), fullPage: true });
      }
      await page.getByRole("button", { name: "Usar crédito" }).click();
      await expect(page.getByLabel("Seleção", { exact: true })).toHaveText("Nenhuma");
      await expect.poll(() => requests.length).toBe(2);
      assert.equal(requests[1].discountCents, 500);
      await expect(page.getByRole("radio")).not.toBeChecked();
      await expect(page.getByText(/18,75/)).toBeVisible();
      await expect(page.getByLabel("Limite de subsídio por pedido (R$)")).toHaveValue("");
      await page.getByLabel("Limite de subsídio por pedido (R$)").fill("0");
      await expect(page.getByLabel("Limite de subsídio por pedido (R$)")).toHaveValue("0");
      await expect(page.getByLabel("Embalagem e proteção por volume (R$)")).toHaveValue("");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    } finally { await browser.close(); }
  });
}
