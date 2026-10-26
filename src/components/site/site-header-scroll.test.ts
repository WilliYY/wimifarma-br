import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { chromium, expect, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3197";
let browserPromise: ReturnType<typeof chromium.launch> | undefined;
after(async () => { if (browserPromise) await (await browserPromise).close(); });
const cssPath = path.resolve("src/app/globals.css");
const css = fs.readFile(cssPath, "utf8").then(source => postcss([tailwindcss()]).process(source, { from: cssPath })).then(result => result.css);
const mocks: Record<string, string> = {
  "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
  "next/image": "import React from 'react';export default ({fill,unoptimized,priority,fetchPriority,...props})=><img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:undefined}/>;",
  "next/navigation": "export const useRouter=()=>({push:()=>{}});export const usePathname=()=>'/';export const redirect=()=>{throw Error('Unexpected redirect')};",
  "next/server": "export const NextResponse={json:()=>{throw Error('Unexpected server response')}};",
  "@/features/auth/auth": "export const auth=async()=>window.session;export const signOut=async()=>{};",
  "@/components/site/announcement-bar": "import React from 'react';export const AnnouncementBar=()=> <div className='h-13 sm:h-10'><a href='/ofertas'>Campanha de teste</a></div>;",
  "@/components/site/site-nav": "import React from 'react';export const SiteNav=()=> <nav className='hidden h-15 lg:block'><a href='/catalogo'>Produtos</a></nav>;",
  "@/components/site/cart-header-button": "import React from 'react';export const CartHeaderButton=({className=''})=><button aria-label='Abrir carrinho' className={'h-11 w-11 shrink-0 '+className}>Carrinho</button>;",
};
const bundle = build({
  stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {SiteHeader} from './src/components/site/site-header';const root=createRoot(document.getElementById('root'));window.unmountHeader=()=>root.unmount();root.render(await SiteHeader());", resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "header-scroll-fixture", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

async function fixture(width: number, role: "ADMIN" | "CUSTOMER" | null, reduced: boolean, run: (page: Page) => Promise<void>) {
  const browser = await (browserPromise ??= chromium.launch());
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const session = role ? { user: { id: "synthetic", name: "Cliente sintético", role, customerId: "synthetic-customer" } } : null;
    const [styles, script] = await Promise.all([css, bundle]);
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<meta charset="utf-8"><style>${styles}</style><div id="root"></div><main class="h-[4000px] pt-64"><aside data-sticky class="lg:sticky lg:top-[var(--site-header-offset,14rem)]">Filtro</aside><article data-content>Conteúdo de teste</article></main><script>window.session=${JSON.stringify(session)}</script><script type="module" src="/fixture.js"></script>` });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script.outputFiles[0].text });
      if (url.pathname === "/api/minha-conta/club") return route.fulfill({ json: { data: { member: false, balancePoints: 0, pendingPoints: 0, lifetimeEarnedPoints: 0, lifetimeRedeemedPoints: 0, transactions: [] } } });
      if (url.pathname === "/api/minha-conta/creditos") return route.fulfill({ json: { data: { balanceCents: 0, availableCents: 0, reservedCents: 0, reviewRequired: false, transactions: [] } } });
      if (url.pathname === "/api/minha-conta/cashback") return route.fulfill({ json: { data: { availableCents: 0, pendingCents: 0, reservedCents: 0, transactions: [] } } });
      if (url.pathname === "/api/produtos/busca") return route.fulfill({ json: { data: { products: [{ id: "synthetic-product", name: "Produto sintético", slug: "sintetico", price: "10.00", activeIngredients: [] }], relatedProducts: [] } } });
      if (url.pathname.startsWith("/brand/")) return route.fulfill({ path: path.join(process.cwd(), "public", url.pathname) });
      return route.abort();
    });
    await page.goto(origin);
    try {
      await expect(page.locator("header")).toBeVisible();
      await run(page);
    } catch (error) {
      if (errors.length) throw new Error(errors.join("; "), { cause: error });
      throw error;
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

for (const [width, role] of [[320, null], [320, "ADMIN"], [390, "ADMIN"], [768, "CUSTOMER"], [768, "ADMIN"], [1536, null], [1536, "ADMIN"]] as const) {
  test(`cabeçalho recolhe sem deslocar conteúdo e restaura no topo: ${width}/${role ?? "visitante"}`, async () => {
    await fixture(width, role, false, async page => {
      const header = page.locator("header");
      const height = await header.evaluate(el => el.getBoundingClientRect().height);
      const contentY = await page.locator("[data-content]").evaluate(el => el.getBoundingClientRect().top + scrollY);
      if (width >= 768) await page.locator('input[aria-label="Buscar produtos"]').fill("texto preservado");
      await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" }));
      await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(height - 30);
      await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(role === "ADMIN" ? 105 : 74);
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - 400) < 2, "encolher não muda a posição de rolagem");
      assert.equal(await page.locator("[data-content]").evaluate(el => el.getBoundingClientRect().top + scrollY), contentY);
      await expect(page.getByRole("link", { name: "Wimifarma", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: role ? /Abrir (minha conta|conta de)/ : "Login ou cadastro" }).locator("visible=true")).toHaveCount(1);
      await expect(page.getByRole("link", { name: "Campanha de teste" })).toBeHidden();
      if (width >= 1024) {
        await expect(page.getByRole("link", { name: "Produtos", exact: true })).toBeHidden();
        const bottom = await header.evaluate(el => el.getBoundingClientRect().bottom);
        const stickyTop = await page.locator("[data-sticky]").evaluate(el => el.getBoundingClientRect().top);
        assert.ok(stickyTop >= bottom && stickyTop <= bottom + 18, "filtro acompanha a altura compacta");
      }
      if (role === "ADMIN") {
        const shortcut = page.getByRole("link", { name: "Painel admin", exact: true }).locator("visible=true");
        await expect(shortcut).toHaveCount(1);
        const box = await shortcut.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 32);
        await expect(shortcut).toContainText("Painel admin");
      }
      if (role) await expect(page.getByRole("button", { name: "Sair", exact: true }).locator("visible=true")).toHaveCount(1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => scrollTo({ top: 40, behavior: "instant" }));
      await expect(page.getByRole("link", { name: "Campanha de teste" })).toBeHidden();
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(height - 1);
      await expect(page.getByRole("link", { name: "Campanha de teste" })).toBeVisible();
      if (width >= 768) await expect(page.locator('input[aria-label="Buscar produtos"]')).toHaveValue("texto preservado");
    });
  });
}

test("recolhimento preserva foco do menu, autocomplete e descarte do observador", async () => {
  await fixture(1536, null, false, async page => {
    const menu = page.getByRole("link", { name: "Produtos", exact: true });
    for (const link of [page.getByRole("link", { name: "Farmacia Popular", exact: true }), menu]) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await link.focus();
      await page.evaluate(() => {
        scrollTo({ top: 400, behavior: "instant" });
        return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await expect(link).toBeVisible();
      await expect(link).toBeFocused();
    }
    const input = page.locator('input[aria-label="Buscar produtos"]');
    await input.focus();
    await expect(menu).toBeHidden();
    await input.fill("teste");
    const suggestion = page.getByRole("option", { name: /Produto sintético/ });
    await expect(suggestion).toBeVisible();
    const box = await suggestion.boundingBox();
    assert.ok(box && await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[role="option"]') !== null, { x: box.x + 5, y: box.y + 5 }), "autocomplete continua acima do conteúdo");
    await page.evaluate("window.unmountHeader()");
    await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--site-header-offset"))).toBe("");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  });
});

test("movimento reduzido usa logo estática e recolhimento sem transição perceptível", async () => {
  await fixture(390, "ADMIN", true, async page => {
    await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" }));
    await expect(page.getByRole("link", { name: "Campanha de teste" })).toBeHidden();
    const logo = page.locator('[data-animated-brand] img');
    await expect.poll(() => logo.evaluate(el => (el as HTMLImageElement).currentSrc)).toContain("logo-wimifarma-compact.webp");
    const durations = await page.locator("header").evaluate(el => [el, ...el.querySelectorAll("[data-header-collapsible]")].map(node => getComputedStyle(node).transitionDuration));
    assert.ok(durations.every(value => value.split(",").every(part => Number.parseFloat(part) <= 0.001)));
  });
});
