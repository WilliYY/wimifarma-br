import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect, type Page } from "@playwright/test";
import nextConfig from "../../../next.config";

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
        export function FooterPaymentMethods(){const brands=location.pathname==='/fallback'?[]:Array.from({length:16},(_,i)=>({id:'synthetic-'+i,name:'Bandeira '+(i+1),image:i===0?'https://http2.mlstatic.com/broken.png':i===1?'https://www.mercadopago.com/org-img/MP3/API/logos/synthetic.svg':null}));return <FooterPaymentMethodsContent brands={brands} fromMercadoPago={!!brands.length}/>;}`,
    };
    builder.onResolve({ filter: /^(next\/(link|image)|\.\/footer-payment-methods)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});
const css = readFile("src/app/globals.css", "utf8").then(source => postcss([tailwind()]).process(source, { from: "src/app/globals.css" })).then(result => result.css);
const policy = Promise.resolve(nextConfig.headers!()).then(rules => rules.find(rule => rule.source === "/:path*")!.headers.find(header => header.key === "Content-Security-Policy")!.value);

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
      if (url.href === "https://www.mercadopago.com/org-img/MP3/API/logos/synthetic.svg") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 32"><text x="4" y="24" fill="#152137" font-size="22">SYN</text></svg>' });
      if (url.origin !== origin) return route.abort();
      if (["/brands", "/fallback"].includes(url.pathname)) return route.fulfill({ contentType: "text/html", headers: { "Content-Security-Policy": await policy }, body: '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: (await bundle).outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: await css });
      if (url.pathname === "/brand/logo-wimifarma-compact.webp") return route.fulfill({ contentType: "image/webp", body: await readFile("public/brand/logo-wimifarma-compact.webp") });
      if (url.pathname === "/payments/pix-symbol.svg") return route.fulfill({ contentType: "image/svg+xml", body: await readFile("public/payments/pix-symbol.svg") });
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
    await expect(footer.getByRole("img", { name: "Bandeira 2", exact: true })).toBeVisible();
    assert.ok(await footer.locator('img[src="/payments/pix-symbol.svg"]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0));
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
    await expect(footer.getByText("Escolhendo Pix no checkout", { exact: true })).toBeVisible();
    await expect(footer.getByText("Cartão", { exact: true })).toBeVisible();
    await expect(footer.getByRole("list", { name: "Bandeiras disponibilizadas pelo Mercado Pago" })).toHaveCount(0);
    await expect(footer.getByText("Confira as opções e as condições disponíveis ao finalizar sua compra.")).toBeVisible();
  });
});

test("bolhas preservam fase e efeito, suspendem fora da tela e retomam sem remontar", async () => {
  await fixture("/fallback", async page => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const layer = page.locator(".site-gooey-footer__bubbles");
    const bubble = layer.locator(".site-gooey-footer__bubble").first();
    await expect(layer).toHaveAttribute("data-animating", "true");
    const original = await bubble.evaluate(el => ({ time: (el as HTMLElement).style.getPropertyValue("--time"), delay: (el as HTMLElement).style.getPropertyValue("--delay"), names: getComputedStyle(el).animationName }));
    assert.deepEqual(original, { time: "2.0s", delay: "-2.0s", names: "footer-bubble-size, footer-bubble-move" });
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "2400px";
      document.getElementById("root")!.before(spacer);
      window.scrollTo(0, 0);
    });
    await expect(layer).toHaveAttribute("data-animating", "false");
    const frozen = await bubble.evaluate(el => el.getAnimations().map(animation => animation.currentTime));
    await page.waitForTimeout(180);
    assert.deepEqual(await bubble.evaluate(el => el.getAnimations().map(animation => animation.currentTime)), frozen);
    await page.evaluate(() => window.scrollTo(0, 2300));
    await expect(layer).toHaveAttribute("data-animating", "true");
    await expect.poll(() => bubble.evaluate(el => Number(el.getAnimations()[0]?.currentTime))).toBeGreaterThan(Number(frozen[0]));
    assert.equal(await layer.evaluate(el => getComputedStyle(el).overflow), "visible");
    await expect(layer.locator(".site-gooey-footer__bubble")).toHaveCount(128);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(layer).toHaveAttribute("data-animating", "false");
    const hidden = await bubble.evaluate(el => el.getAnimations().map(animation => animation.currentTime));
    await page.waitForTimeout(180);
    assert.deepEqual(await bubble.evaluate(el => el.getAnimations().map(animation => animation.currentTime)), hidden);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(layer).toHaveAttribute("data-animating", "true");
  });
});

test("bolhas preservam a trajetória original sem animar dimensões ou bottom", async () => {
  await fixture("/fallback", async page => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".site-gooey-footer__bubbles")).toHaveAttribute("data-animating", "true");
    await page.addStyleTag({ content: `
      .legacy-reference { width: auto; height: auto; bottom: auto; translate: none; transform-origin: 50% 50%; transform: translate(-50%, 100%); animation-name: legacy-size, legacy-move; }
      @keyframes legacy-size { 0%, 75% { height: var(--size, 4rem); width: var(--size, 4rem); } 100% { height: 0; width: 0; } }
      @keyframes legacy-move { 0% { bottom: -4rem; } 100% { bottom: var(--distance, 10rem); } }
    ` });
    const evidence = [];
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      evidence.push(await page.evaluate(() => {
        const layer = document.querySelector(".site-gooey-footer__bubbles")!;
        const originals = [...layer.children] as HTMLElement[];
        const references = originals.map(element => {
          const reference = element.cloneNode() as HTMLElement;
          reference.classList.add("legacy-reference");
          layer.append(reference);
          return reference;
        });
        let maximumError = 0;
        let geometryStable = true;
        for (const phase of [0, 0.25, 0.5, 0.75, 0.8, 0.9, 0.99]) {
          for (const element of [...originals, ...references]) {
            for (const animation of element.getAnimations()) {
              const timing = animation.effect!.getTiming();
              animation.pause();
              animation.currentTime = Number(timing.duration) * (phase + 3) + (timing.delay ?? 0);
            }
          }
          originals.forEach((element, index) => {
            const a = element.getBoundingClientRect();
            const b = references[index].getBoundingClientRect();
            for (const key of ["x", "y", "width", "height"] as const) maximumError = Math.max(maximumError, Math.abs(a[key] - b[key]));
            const style = getComputedStyle(element);
            geometryStable &&= Math.abs(Number.parseFloat(style.width) - Number.parseFloat(element.style.getPropertyValue("--size")) * 16) < 0.05 && style.bottom === "-64px";
          });
        }
        references.forEach(element => element.remove());
        return { width: innerWidth, count: originals.length, maximumError, geometryStable };
      }));
    }
    for (const result of evidence) {
      assert.equal(result.count, 128);
      assert.ok(result.maximumError < 0.05, `trajetória ${result.width}px: erro máximo ${result.maximumError}px`);
      assert.equal(result.geometryStable, true, `dimensões/bottom estáveis em ${result.width}px`);
    }
  });
});
