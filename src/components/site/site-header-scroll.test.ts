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
    const durations = await page.locator("header").evaluate(el => [el, ...el.querySelectorAll("[data-header-collapsible], [data-header-brand], [data-header-brand-panel], [data-animated-brand]")].map(node => getComputedStyle(node).transitionDuration));
    assert.ok(durations.every(value => value.split(",").every(part => Number.parseFloat(part) <= 0.001)));
  });
});

test("recolhimento publica o deslocamento global somente ao estabilizar", async () => {
  await fixture(1440, "ADMIN", false, async page => {
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const offsets: string[] = [];
      Object.assign(window, { headerOffsets: offsets });
      new MutationObserver(() => offsets.push(document.documentElement.style.getPropertyValue("--site-header-offset")))
        .observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
      scrollTo({ top: 400, behavior: "instant" });
    });
    await expect(page.locator("header")).toHaveAttribute("data-compact", "true");
    await page.waitForTimeout(450);
    const offsets = await page.evaluate(() => (window as unknown as { headerOffsets: string[] }).headerOffsets);
    assert.ok(offsets.length <= 2, `atualizações globais durante recolhimento: ${offsets.length}`);
  });
});

test("expansão mantém deslocamento seguro após resize compacto ou carregamento de fonte", async () => {
  await fixture(1440, "ADMIN", false, async page => {
    for (const invalidate of ["resize", "font"] as const) {
      await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" }));
      await expect(page.locator("header")).toHaveAttribute("data-compact", "true");
      await page.waitForTimeout(400);
      if (invalidate === "resize") await page.setViewportSize({ width: 1280, height: 900 });
      else await page.evaluate(() => {
        document.querySelector<HTMLElement>("[data-header-main]")!.style.minHeight = "120px";
        document.fonts.dispatchEvent(new Event("loadingdone"));
      });
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const samples: number[] = [];
        Object.assign(window, { headerSamples: samples });
        const observer = new ResizeObserver(([entry]) => {
          const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
          const offset = Number.parseFloat(getComputedStyle(document.querySelector("[data-sticky]")!).top);
          samples.push(Math.abs(offset - Math.ceil(height) - 16));
        });
        observer.observe(document.querySelector("header")!);
        setTimeout(() => observer.disconnect(), 1200);
        scrollTo({ top: 0, behavior: "instant" });
      });
      await page.waitForTimeout(450);
      const samples = await page.evaluate(() => (window as unknown as { headerSamples: number[] }).headerSamples);
      assert.ok(samples.length >= 4, "mediu posições intermediárias do painel fixo");
      assert.ok(Math.max(...samples) <= 1, `offset acompanha expansão após ${invalidate}: ${JSON.stringify(samples)}`);
    }
  });
});

test("painel sticky acompanha posições intermediárias sem salto e limpa o estilo temporário", async () => {
  await fixture(1440, "ADMIN", false, async page => {
    for (const top of [400, 0]) {
      await page.evaluate(target => {
        const samples: { expected: number; actual: number }[] = [];
        Object.assign(window, { stickySamples: samples });
        const observer = new ResizeObserver(([entry]) => {
          if (document.querySelector("header")!.getAttribute("data-compact") !== String(target > 0)) return;
          const sticky = document.querySelector("[data-sticky]")!;
          samples.push({ expected: Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height) + 16, actual: target ? sticky.getBoundingClientRect().top : Number.parseFloat(getComputedStyle(sticky).top) });
        });
        observer.observe(document.querySelector("header")!);
        setTimeout(() => observer.disconnect(), 450);
        scrollTo({ top: target, behavior: "instant" });
      }, top);
      await page.waitForTimeout(500);
      const samples = await page.evaluate(() => (window as unknown as { stickySamples: { expected: number; actual: number }[] }).stickySamples);
      assert.ok(samples.length >= 4, "registra posições intermediárias");
      assert.ok(samples.every(sample => Math.abs(sample.expected - sample.actual) <= 1), JSON.stringify(samples));
      assert.equal(await page.locator("[data-sticky]").evaluate(element => (element as HTMLElement).style.getPropertyValue("--site-header-offset")), "");
    }
    await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" }));
    await page.waitForTimeout(50);
    await page.evaluate("window.unmountHeader()");
    assert.equal(await page.locator("[data-sticky]").evaluate(element => (element as HTMLElement).style.getPropertyValue("--site-header-offset")), "");
  });
});

test("painel montado durante recolhimento acompanha a altura e preserva seu estilo anterior", async () => {
  await fixture(1440, "ADMIN", false, async page => {
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const samples: number[] = [];
      const writes: number[] = [];
      Object.assign(window, { lateStickySamples: samples, lateRootWrites: writes });
      new MutationObserver(records => writes.push(records.length)).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
      const observer = new ResizeObserver(([entry]) => {
        if (document.querySelector("header")!.getAttribute("data-compact") !== "true") return;
        if (!document.querySelector("[data-late-sticky]")) {
          for (const custom of [false, true]) {
            const element = document.createElement("aside");
            element.className = document.querySelector("[data-sticky]")!.className;
            element.dataset.lateSticky = custom ? "custom" : "inherited";
            if (custom) element.style.setProperty("--site-header-offset", "77px", "important");
            document.querySelector("main")!.append(element);
          }
          return;
        }
        const height = Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height) + 16;
        document.querySelectorAll("[data-late-sticky]").forEach(element => samples.push(Math.abs(Number.parseFloat(getComputedStyle(element).top) - height)));
      });
      observer.observe(document.querySelector("header")!);
      setTimeout(() => observer.disconnect(), 450);
      scrollTo({ top: 400, behavior: "instant" });
    });
    await page.waitForTimeout(500);
    const samples = await page.evaluate(() => (window as unknown as { lateStickySamples: number[] }).lateStickySamples);
    assert.ok(samples.length >= 4);
    assert.ok(Math.max(...samples) <= 1, `novo painel acompanha alturas intermediárias: ${JSON.stringify(samples)}`);
    const restored = await page.locator("[data-late-sticky]").evaluateAll(elements => elements.map(element => ({ value: (element as HTMLElement).style.getPropertyValue("--site-header-offset"), priority: (element as HTMLElement).style.getPropertyPriority("--site-header-offset") })));
    assert.deepEqual(restored, [{ value: "", priority: "" }, { value: "77px", priority: "important" }]);
    assert.ok(await page.evaluate(() => (window as unknown as { lateRootWrites: number[] }).lateRootWrites.reduce((sum, count) => sum + count, 0)) <= 2, "montagem tardia não acrescenta invalidações globais por quadro");
    await page.evaluate("window.unmountHeader()");
    await page.evaluate(() => {
      const element = document.createElement("aside");
      element.dataset.afterUnmount = "true";
      element.className = document.querySelector("[data-sticky]")!.className;
      document.querySelector("main")!.append(element);
    });
    await page.waitForTimeout(50);
    assert.equal(await page.locator("[data-after-unmount]").evaluate(element => (element as HTMLElement).style.getPropertyValue("--site-header-offset")), "", "observador de consumidores foi descartado");
  });
});

for (const role of [null, "CUSTOMER", "ADMIN"] as const) {
  test(`logo compacta ocupa a largura disponível sem deformação: ${role ?? "visitante"}`, async () => {
    await fixture(1536, role, false, async page => {
      await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" }));
      await expect(page.locator("header")).toHaveAttribute("data-compact", "true");
      for (const width of [320, 360, 390, 640, 768, 1024, 1280, 1536, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.locator('[data-animated-brand] img').evaluate(element => {
          const image = element as HTMLImageElement;
          const box = image.getBoundingClientRect();
          const link = image.closest('[data-header-brand]')!.getBoundingClientRect();
          return Math.min(box.width, box.height * image.naturalWidth / image.naturalHeight) / link.width;
        })).toBeGreaterThanOrEqual(0.96);
        const geometry = await page.locator('[data-header-brand]').evaluate(element => {
          const image = element.querySelector('img')!;
          const picture = image.getBoundingClientRect();
          const panel = element.parentElement!.getBoundingClientRect();
          return { fit: getComputedStyle(image).objectFit, centerDifference: Math.abs(picture.y + picture.height / 2 - panel.y - panel.height / 2), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.equal(geometry.fit, "contain");
        assert.ok(geometry.centerDifference <= 1, `${width}: marca centralizada na área preta`);
        assert.equal(geometry.overflow, false);
        await expect(page.locator('[data-animated-brand] img')).toHaveAttribute("src", "/brand/logo-wimifarma-animated.svg");
        if (role === "ADMIN") await expect(page.getByRole("link", { name: "Painel admin", exact: true }).locator("visible=true")).toHaveCount(1);
      }
    });
  });
}

test("marca e área preta percorrem tamanhos intermediários ao recolher e restaurar", async () => {
  await fixture(1536, "ADMIN", false, async page => {
    for (const top of [400, 0]) {
      const frames = await page.evaluate(target => {
        const header = document.querySelector('header')!;
        const brand = header.querySelector('[data-header-brand]')!;
        const image = brand.querySelector('img') as HTMLImageElement;
        image.getBoundingClientRect(); // Establish the previous layout before starting the CSS transitions.
        return new Promise<{ width: number; panelWidth: number; overflow: boolean }[]>((resolve, reject) => {
          const observer = new MutationObserver(() => {
            if (header.getAttribute('data-compact') !== String(target > 0)) return;
            observer.disconnect();
            clearTimeout(timeout);
            const animations = header.getAnimations({ subtree: true }).filter(animation => animation instanceof CSSTransition);
            animations.forEach(animation => animation.pause());
            const samples = [0, 0.25, 0.5, 0.75, 1].map(fraction => {
              animations.forEach(animation => { animation.currentTime = Number(animation.effect!.getTiming().duration) * fraction; });
              const box = image.getBoundingClientRect();
              return { width: Math.min(box.width, box.height * image.naturalWidth / image.naturalHeight), panelWidth: brand.parentElement!.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth };
            });
            animations.forEach(animation => animation.finish());
            resolve(samples);
          });
          const timeout = setTimeout(() => { observer.disconnect(); reject(new Error('Header state did not change')); }, 5000);
          observer.observe(header, { attributes: true, attributeFilter: ['data-compact'] });
          scrollTo({ top: target, behavior: "instant" });
        });
      }, top);
      const first = frames[0].width;
      const last = frames.at(-1)!.width;
      assert.ok(Math.abs(first - last) > 30);
      assert.ok(frames.some(frame => frame.width > Math.min(first, last) + 5 && frame.width < Math.max(first, last) - 5), `tamanhos intermediários sem troca abrupta de imagem: ${top} ${JSON.stringify(frames)}`);
      const firstPanel = frames[0].panelWidth;
      const lastPanel = frames.at(-1)!.panelWidth;
      assert.ok(frames.some(frame => frame.panelWidth > Math.min(firstPanel, lastPanel) + 5 && frame.panelWidth < Math.max(firstPanel, lastPanel) - 5), "área preta acompanha o redimensionamento");
      assert.ok(frames.every(frame => !frame.overflow));
    }
  });
});

test("ações móveis do administrador ficam alinhadas no topo e ao rolar", async () => {
  await fixture(390, "ADMIN", false, async page => {
    for (const width of [320, 360, 390, 414, 480, 640, 767]) {
      await page.setViewportSize({ width, height: 844 });
      for (const top of [0, 400]) {
        await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), top);
        await expect(page.locator("header")).toHaveAttribute("data-compact", String(top > 0));
        const controls = [page.getByRole("button", { name: "Abrir carrinho", exact: true }), page.getByRole("link", { name: "Abrir minha conta", exact: true }), page.getByRole("button", { name: "Sair", exact: true }).locator("visible=true"), page.getByRole("button", { name: "Abrir busca de produtos", exact: true })];
        await expect.poll(async () => {
          const boxes = await Promise.all(controls.map(control => control.boundingBox()));
          const centers = boxes.map(box => box!.y + box!.height / 2);
          return Math.max(...centers) - Math.min(...centers);
        }, { message: `${width}/${top}: carrinho, conta, saída e lupa na mesma linha` }).toBeLessThanOrEqual(1);
        const geometry = await page.evaluate(() => {
          const header = document.querySelector('header')!;
          const boxes = ['button[aria-label="Abrir carrinho"]', 'a[aria-label="Abrir minha conta"]', 'button[aria-label="Sair"]', 'button[aria-label="Abrir busca de produtos"]'].map(selector => Array.from(header.querySelectorAll(selector)).find(element => element.getClientRects().length)!.getBoundingClientRect());
          const admin = Array.from(header.querySelectorAll('a[href="/admin/dashboard"]')).find(element => element.getClientRects().length)!.getBoundingClientRect();
          const name = header.querySelector('a[aria-label="Abrir minha conta"] [data-header-account-name]') as HTMLElement;
          return { separated: admin.bottom <= boxes[0].top, targets: boxes.every(box => box.width >= 44 && box.height >= 44), nameFits: name.scrollWidth <= name.clientWidth, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.ok(geometry.separated, `${width}/${top}: Painel admin separado dos ícones`);
        assert.ok(geometry.targets);
        assert.ok(geometry.nameFits, `${width}/${top}: nome Admin sem corte`);
        assert.equal(geometry.overflow, false);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir busca de produtos", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Busca de produtos" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar busca", exact: true }).click();
    await expect(page.getByRole("button", { name: "Abrir busca de produtos", exact: true })).toBeFocused();
  });
});
