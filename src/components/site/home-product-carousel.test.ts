import assert from "node:assert/strict";
import test, { after } from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const browser = chromium.launch();
after(async () => (await browser).close());
const bundle = build({
  stdin: {
    contents: `import React,{Profiler} from 'react';import{createRoot}from'react-dom/client';import{HomeProductCarousel}from'./src/components/site/home-product-carousel';const products=Array.from({length:4},(_,i)=>({id:String(i),slug:'item-'+i,name:'Produto '+i}));window.commits=0;createRoot(document.getElementById('root')).render(<Profiler id="fixture" onRender={()=>window.commits++}><HomeProductCarousel products={products} compactHeader={location.search.includes('compact')} id="fixture-carousel" title="Seleção de teste" eyebrow="Seleção" href="/catalogo"/></Profiler>);`,
    loader: "tsx", resolveDir: process.cwd(),
  },
  bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "carousel-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/link$|public-product-card$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
      contents: args.path === "next/link" ? 'import React from "react";export default function Link(props){return <a {...props}/>;}' : 'import React from "react";export function PublicProductCard({product}){return <a href={"/produto/"+product.slug}>{product.name}</a>;}',
      loader: "tsx", resolveDir: process.cwd(),
    }));
  } }],
});

async function fixture(compact: boolean) {
  const context = await (await browser).newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollWidth")!;
    Object.defineProperty(Element.prototype, "scrollWidth", { ...descriptor, get() {
      if (this.id === "fixture-carousel") (window as unknown as { scrollReads: number }).scrollReads++;
      return descriptor.get!.call(this);
    } });
    (window as unknown as { scrollReads: number }).scrollReads = 0;
  });
  await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>#fixture-carousel{display:flex;overflow:auto;width:300px;scroll-behavior:auto}[data-home-product-card]{flex:none;width:160px}</style><div id="root"></div></html>' }));
  const js = (await bundle).outputFiles[0].text;
  await page.goto("http://127.0.0.1:3196/" + (compact ? "?compact" : ""));
  await page.addScriptTag({ content: js });
  await expect(page.getByRole("region", { name: "Seleção de teste" })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return { page, context, errors };
}

test("vitrine sem setas dispensa leituras de controle durante resize e arraste", async () => {
  const { page, context, errors } = await fixture(true);
  try {
    await expect(page.getByRole("button")).toHaveCount(0);
    await page.locator("#fixture-carousel").evaluate(element => { element.style.width = "280px"; element.scrollLeft = 100; element.dispatchEvent(new Event("scroll")); });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    assert.equal(await page.evaluate(() => (window as unknown as { scrollReads: number }).scrollReads), 0);
    assert.equal(await page.locator("#fixture-carousel").evaluate(element => element.scrollLeft), 100);
    await page.locator("#fixture-carousel").focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => page.locator("#fixture-carousel").evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("eventos sem mudança não renderizam novamente os controles; setas continuam funcionando", async () => {
  const { page, context, errors } = await fixture(false);
  try {
    const previous = page.getByRole("button", { name: "Ver produtos anteriores: Seleção de teste" });
    const next = page.getByRole("button", { name: "Ver próximos produtos: Seleção de teste" });
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    const commits = await page.evaluate(() => (window as unknown as { commits: number }).commits);
    for (let index = 0; index < 4; index++) {
      await page.locator("#fixture-carousel").evaluate(element => element.dispatchEvent(new Event("scroll")));
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    assert.equal(await page.evaluate(() => (window as unknown as { commits: number }).commits), commits);
    await next.click();
    await expect(previous).toBeEnabled();
    await next.click();
    await expect(next).toBeDisabled();
    await previous.click();
    await previous.click();
    await expect(previous).toBeDisabled();
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
