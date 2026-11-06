import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

test("fileiras MIP: sentidos opostos, pausa, arraste, teclado, ações e 320px", async () => {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
    "next/image": "import React from 'react';export default ({alt,priority,fill,sizes,...props})=><img alt={alt} {...props}/>;",
    "next/navigation": "export const useRouter=()=>({push:()=>{}});",
  };
  const fixture = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {HomeMedicineRails} from './src/components/site/home-medicine-rails';
    import {CartProvider,useCart} from './src/components/site/cart-provider';
    import {CatalogShippingProvider} from './src/components/site/catalog-shipping-preview';
    const count=Number(new URLSearchParams(location.search).get('count')??40);
    const products=Array.from({length:count},(_,i)=>({id:'mip-'+i,name:'Medicamento sintético apresentação completa '+i,slug:'mip-'+i,imageUrl:'/synthetic.svg',price:'20.00',promotionalPrice:'15.00',brand:'Marca',category:'Medicamentos',stock:20,requiresPrescription:false,prescriptionType:'UNREVIEWED',isPopularPharmacy:false,activeIngredients:['Ingrediente sintético'],searchTerms:[],catalogClassification:{kind:'MEDICINE',medicineClass:'OTHER',ethical:false,otc:true}}));
    function CartState(){const {items}=useCart();return <output hidden data-cart-state>{JSON.stringify(items)}</output>}
    createRoot(document.getElementById('root')).render(<CartProvider><CartState/><CatalogShippingProvider><HomeMedicineRails products={products}/></CatalogShippingProvider></CartProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, outdir: "fixture", platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "medicine-fixture", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }] });
  const css = (await postcss([tailwind()]).process(readFileSync("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css + fixture.outputFiles.find(file => file.path.endsWith(".css"))!.text;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, reducedMotion: "no-preference", hasTouch: true });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>body{margin:0}</style><div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: fixture.outputFiles.find(file => file.path.endsWith(".js"))!.text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/synthetic.svg") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#eee"/></svg>' });
      if (url.pathname === "/brand/logo-wimifarma-compact.webp") return route.fulfill({ contentType: "image/webp", body: readFileSync("public/brand/logo-wimifarma-compact.webp") });
      if (url.pathname.startsWith("/produto/")) return route.fulfill({ contentType: "text/html", body: "Ficha sintética" });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3198/");
    const heading = page.getByRole("heading", { name: "Sua farmácia Wimifarma tem tudo" });
    await expect(heading).toBeVisible();
    await expect(heading.getByRole("img", { name: "Wimifarma" })).toHaveAttribute("src", "/brand/logo-wimifarma-compact.webp");
    await expect.poll(() => heading.getByRole("img", { name: "Wimifarma" }).evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).justifyContent), "center");
    await expect(page.getByText("Medicamentos sem receita", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Farmacinha", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Pausar movimento|Retomar movimento/ })).toHaveCount(0);
    const rails = page.locator("[data-medicine-rail]");
    await expect(rails).toHaveCount(2);
    await expect(page.locator('[data-copy="original"]')).toHaveCount(40);
    const desktopDimensions = await page.locator('[data-copy="original"] article').evaluateAll(cards => cards.map(card => ({ width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height })));
    assert.ok(desktopDimensions.every(card => card.width === 320));
    const desktopHeights = desktopDimensions.map(card => card.height).sort((a, b) => a - b);
    assert.ok(desktopHeights[20] >= 220 && desktopHeights[20] <= 270, `altura mediana desktop ${desktopHeights[20]}`);
    assert.ok(desktopHeights[39] <= 290, `altura máxima desktop ${desktopHeights[39]}`);
    const ids = await page.locator('[data-copy="original"]').evaluateAll(rows => rows.map(row => row.getAttribute("data-product-id")));
    assert.equal(new Set(ids).size, 40);
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(2);
    const transforms = () => page.locator("[data-medicine-track]").evaluateAll(rows => rows.map(row => new DOMMatrix(getComputedStyle(row).transform).m41));
    const before = await transforms();
    await page.waitForTimeout(500);
    const after = await transforms();
    assert.ok(after[0] > before[0] + 2, "primeira fileira move para a direita");
    assert.ok(after[1] < before[1] - 2, "segunda fileira move para a esquerda");
    assert.ok(after.every((value, index) => Math.abs(value - before[index]) < 12), "velocidade permanece lenta");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(2);
    await page.locator("#root").evaluate(el => { el.style.marginTop = "2000px"; });
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(0);
    await page.locator("#root").evaluate(el => { el.style.marginTop = "0"; });
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(2);
    await rails.first().hover();
    await expect(rails.first().locator("[data-medicine-track]")).not.toHaveAttribute("data-moving", "true");
    await rails.first().focus();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(0);
    await rails.first().focus();
    const scroll = await rails.first().evaluate(el => el.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => rails.first().evaluate(el => el.scrollLeft)).toBeGreaterThan(scroll);
    const box = (await rails.first().boundingBox())!;
    await page.mouse.move(box.x + 500, box.y + 80);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 80, { steps: 8 });
    await page.mouse.up();
    assert.equal(new URL(page.url()).pathname, "/", "arrastar não abre produto");
    const visibleOriginal = page.locator('[data-copy="original"] button[aria-haspopup="dialog"]').filter({ visible: true }).first();
    await visibleOriginal.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Frete e prazo", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(visibleOriginal).toBeFocused();
    const add = page.locator('[data-copy="original"]').filter({ visible: true }).getByRole("button", { name: "Adicionar", exact: true }).first();
    await add.click();
    await expect(page.locator('[data-copy="original"]').getByRole("button", { name: /Aumentar/ })).toHaveCount(1);
    const cloneTabStops = await page.locator('li[aria-hidden="true"]').evaluateAll(rows => rows.flatMap(row => Array.from(row.querySelectorAll<HTMLElement>("a,button,input"))).filter(el => el.tabIndex >= 0).length);
    assert.equal(cloneTabStops, 0);
    await page.evaluate(() => localStorage.clear());
    await page.mouse.move(0, 1000);
    await page.goto("http://127.0.0.1:3198/");
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(2);
    await page.waitForTimeout(500);
    await rails.first().hover();
    await expect(rails.first().locator("[data-medicine-track]")).not.toHaveAttribute("data-moving", "true");
    const visualCopy = rails.first().locator('li[data-copy="after"][data-product-id="mip-0"]');
    const copyBounds = (await visualCopy.boundingBox())!;
    assert.ok(copyBounds.x >= -10 && copyBounds.x < 100, "a cópia testada está visível após a volta do loop");
    await visualCopy.locator("button").filter({ hasText: "Adicionar" }).click();
    const copyInput = visualCopy.locator("input");
    await expect(copyInput).toHaveValue("1");
    // Measure the browser's mousedown/default-focus step without a round trip
    // where the 180ms normalization timer can exchange identical copies first.
    const focusExchange = await copyInput.evaluate(input => {
      const viewport = input.closest<HTMLElement>("[data-medicine-rail]")!;
      const track = viewport.querySelector<HTMLElement>("ul")!;
      const beforeX = input.getBoundingClientRect().x;
      const before = { time: performance.now(), scrollLeft: viewport.scrollLeft, moving: track.dataset.moving ?? "false", transform: getComputedStyle(track).transform };
      const defaultAllowed = input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
      if (defaultAllowed) input.focus({ preventScroll: true });
      const focused = document.activeElement as HTMLElement;
      return { beforeX, afterX: focused.getBoundingClientRect().x, defaultAllowed, before, after: { time: performance.now(), scrollLeft: viewport.scrollLeft, moving: track.dataset.moving ?? "false", transform: getComputedStyle(track).transform, focused: focused.getAttribute("aria-label") } };
    });
    assert.equal(focusExchange.defaultAllowed, true, "mousedown da quantidade no clone permite o foco nativo");
    const originalInput = rails.first().locator('li[data-copy="original"][data-product-id="mip-0"] input');
    await expect(originalInput).toBeFocused();
    console.log("Troca de cópia:", JSON.stringify({ ...focusExchange, normalizeDelayMs: 180 }));
    assert.ok(Math.abs(focusExchange.beforeX - focusExchange.afterX) < 2, `troca de cópia preserva a posição visual do campo: cópia=${focusExchange.beforeX}, original=${focusExchange.afterX}`);
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText("5");
    await expect.poll(async () => JSON.parse((await page.locator("[data-cart-state]").textContent())!).find((product: { id: string }) => product.id === "mip-0")?.quantity).toBe(5);
    const originalCard = rails.first().locator('li[data-copy="original"][data-product-id="mip-0"]');
    await originalCard.locator('button[aria-haspopup="dialog"]').click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(originalCard.locator('button[aria-haspopup="dialog"]')).toBeFocused();
    assert.equal(await page.locator('li[aria-hidden="true"]').evaluateAll(rows => rows.flatMap(row => Array.from(row.querySelectorAll<HTMLElement>("a,button,input"))).filter(el => el.tabIndex >= 0).length), 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator('[data-medicine-track][data-moving="true"]')).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const mobileDimensions = await page.locator('[data-copy="original"] article').evaluateAll(cards => cards.map(card => ({ width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height })));
    assert.ok(mobileDimensions.every(card => card.width === 276));
    const mobileHeights = mobileDimensions.map(card => card.height).sort((a, b) => a - b);
    assert.ok(mobileHeights[20] >= 220 && mobileHeights[20] <= 270, `altura mediana mobile ${mobileHeights[20]}`);
    console.log(`Cartões compactos: desktop mediana=${desktopHeights[20]} máximo=${desktopHeights[39]}; mobile mediana=${mobileHeights[20]} máximo=${mobileHeights[39]}`);
    const text = page.locator('[data-copy="original"] a[href="/produto/mip-0"] span').first();
    assert.equal(await text.evaluate(el => getComputedStyle(el).webkitLineClamp), "none");
    const touchRail = rails.first();
    await touchRail.evaluate(el => { el.scrollLeft += 100; });
    const touchBefore = await touchRail.evaluate(el => el.scrollLeft);
    const touchCycle = await touchRail.locator("ul").evaluate(element => element.querySelector<HTMLElement>('li[data-copy="original"]')!.offsetLeft - element.querySelector<HTMLElement>('li[data-copy="before"]')!.offsetLeft);
    const touchBox = (await touchRail.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const touchY = Math.max(50, touchBox.y + 100);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 270, y: touchY }] });
    for (let x = 250; x >= 90; x -= 20) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: touchY }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => {
      const distance = ((await touchRail.evaluate(el => el.scrollLeft)) - touchBefore + touchCycle) % touchCycle;
      return distance > 20 && distance < touchCycle / 2;
    }).toBe(true);
    const captureRoot = process.env.HOME_MEDICINE_CAPTURE_ROOT;
    if (captureRoot) {
      mkdirSync(captureRoot, { recursive: true });
      await page.screenshot({ path: join(captureRoot, "medicine-rails-320.png"), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.screenshot({ path: join(captureRoot, "medicine-rails-1440.png"), fullPage: true });
    }
    const productLink = page.locator('[data-copy="original"] a[href="/produto/mip-0"]');
    await productLink.click();
    await expect(page).toHaveURL("http://127.0.0.1:3198/produto/mip-0");
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("http://127.0.0.1:3198/?count=1");
    await expect(rails).toHaveCount(1);
    await expect(page.locator('[data-copy="original"]')).toHaveCount(1);
    await expect(rails.first()).toHaveAttribute("data-looping", "false");
    await expect(page.locator('[data-copy="before"],[data-copy="after"]')).toHaveCount(0);
    await page.goto("http://127.0.0.1:3198/?count=21");
    await expect(rails).toHaveCount(2);
    await expect(rails.nth(1).locator('[data-copy="original"]')).toHaveCount(1);
    await page.goto("http://127.0.0.1:3198/?count=0");
    await expect(rails).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
