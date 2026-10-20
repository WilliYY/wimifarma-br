import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3195";
const captureRoot = process.env.FOOTER_CAPTURE_ROOT;
const bundle = build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {SiteFooter} from './src/components/site/site-footer';
    createRoot(document.getElementById('root')).render(<SiteFooter/>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{ name: "footer-fixture", setup(builder) {
    const mocks: Record<string, string> = {
      "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
      "next/image": "import React from 'react';export default ({unoptimized,priority,fill,...props})=><img {...props}/>;",
      "./footer-payment-methods": `import React from 'react';import {FooterPaymentMethodsContent} from './src/components/site/footer-payment-methods-content';
        export function FooterPaymentMethods(){const brands=location.pathname==='/fallback'?[]:Array.from({length:16},(_,i)=>({id:'synthetic-'+i,name:'Bandeira '+(i+1),image:i===0?'https://http2.mlstatic.com/broken.png':null}));return <FooterPaymentMethodsContent brands={brands} fromMercadoPago={!!brands.length}/>;}`,
    };
    builder.onResolve({ filter: /^(next\/(link|image)|\.\/footer-payment-methods)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});
const css = readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css);

async function fixture(path: string, run: (page: Page) => Promise<void>) {
  if (captureRoot) await mkdir(captureRoot, { recursive: true });
  const browser = await chromium.launch();
  const errors: string[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 950 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (["/brands", "/fallback"].includes(url.pathname)) return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: await css });
      if (url.pathname === "/brand/logo-wimifarma-compact.webp") return route.fulfill({ contentType: "image/webp", body: await readFile("public/brand/logo-wimifarma-compact.webp") });
      return route.abort();
    });
    await page.goto(`${origin}${path}`);
    await expect(page.getByRole("heading", { name: "Formas de pagamento" })).toBeVisible();
    await run(page);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("rodapé mantém identidade, links oficiais e novas bandeiras em telas pequenas e grandes", async () => {
  await fixture("/brands", async page => {
    const footer = page.getByRole("contentinfo", { name: "Informações da Wimifarma" });
    await expect(footer.getByRole("list", { name: "Bandeiras disponibilizadas pelo Mercado Pago" }).getByRole("listitem")).toHaveCount(16);
    await expect(footer.getByText("Bandeira 1", { exact: true })).toBeVisible();
    await expect(footer.getByText("Bandeira 16", { exact: true })).toBeVisible();
    await expect(footer.getByText("3% de desconto", { exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Consultar no portal da Anvisa" })).toHaveAttribute("href", "https://consultas.anvisa.gov.br/#/");
    await expect(footer.getByRole("link", { name: "Nosso perfil no Reclame AQUI" })).toHaveAttribute("href", /reclameaqui\.com\.br\/empresa\/w-y-yoshiura/);
    await expect(footer.getByRole("link", { name: "Encontre a Wimifarma no Google" })).toHaveAttribute("href", /maps\.app\.goo\.gl/);
    await expect(footer.locator(".site-gooey-footer__bubble")).toHaveCount(128);
    await expect(footer.locator("#wimifarma-footer-blob")).toHaveCount(1);
    assert.doesNotMatch(await footer.innerText(), /RA1000|RA Verificada|Ebit|reCAPTCHA|certificada pela Anvisa/i);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow em ${width}px`);
      if (captureRoot && [390, 1440].includes(width)) await page.screenshot({ path: join(captureRoot, `footer-synthetic-${width}.png`), fullPage: true });
    }
  });
});

test("indisponibilidade do catálogo mantém Pix e cartão sem inventar bandeiras", async () => {
  await fixture("/fallback", async page => {
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("Pix", { exact: true })).toBeVisible();
    await expect(footer.getByText("Cartão", { exact: true })).toBeVisible();
    await expect(footer.getByRole("list", { name: "Bandeiras disponibilizadas pelo Mercado Pago" })).toHaveCount(0);
    await expect(footer.getByText("Confira as opções e as condições disponíveis ao finalizar sua compra.")).toBeVisible();
  });
});
