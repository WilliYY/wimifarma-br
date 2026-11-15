import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";

const names = ["Algodão", "Sabonete", "Creme", "Gaze", "Escova"];
const ids = ["cotton", "soap", "cream", "gauze", "brush"];
const products = ids.map((id, index) => ({
  id, slug: id, name: names[index], imageUrl: index === 3 ? null : `/fixture/${id}.svg`,
  unitPriceCents: 500, originalPriceCents: null, stock: 20, category: index === 3 ? "Medicamentos" : null,
  requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false,
}));

// Keep the real basket, drawer, product controls, CSS modules and storage. Only
// replace Next's framework adapters; all images and API responses stay local.
const mocks = {
  "next/navigation": `export const useRouter = () => ({ push() {} });`,
  "next/link": `export default function Link(props) { return <a {...props} />; }`,
  "next/image": `export default function Image({ unoptimized, fill, priority, quality, ...props }) { return <img {...props} />; }`,
};
const bundle = await build({
  stdin: { contents: `
import { createRoot } from 'react-dom/client';
import { CartProvider } from './src/components/site/cart-provider';
import { CartHeaderButton } from './src/components/site/cart-header-button';
import { ProductCardActions } from './src/components/site/product-card-actions';
createRoot(document.getElementById('root')).render(<CartProvider>
  <header><CartHeaderButton className="qa-desktop" /><CartHeaderButton className="qa-mobile" /></header>
  <main>{${JSON.stringify(products)}.map(product =>
    <article key={product.id} aria-label={product.name}><strong>{product.name}</strong>
      <ProductCardActions product={product} saleUnitLabel={null} />
    </article>)}</main>
</CartProvider>);
`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, outfile: "basket.js", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "next-test-adapters", setup(plugin) {
    plugin.onResolve({ filter: /^next\/(navigation|link|image)$/ }, args => ({ path: args.path, namespace: "test-adapter" }));
    plugin.onLoad({ filter: /.*/, namespace: "test-adapter" }, args => ({ contents: mocks[args.path], loader: "jsx", resolveDir: process.cwd() }));
  } }],
});
const assets = new Map(bundle.outputFiles.map(file => [file.path.split(/[\\/]/).at(-1), file.text]));
const globalStyles = fileURLToPath(new URL("../src/app/globals.css", import.meta.url));
const styles = await postcss([tailwindcss({ optimize: false })]).process(await readFile(globalStyles, "utf8"), { from: globalStyles });
assets.set("globals.css", styles.css);
const logo = await readFile(new URL("../public/brand/logo-wimifarma-compact.webp", import.meta.url));
const medicineFallback = await readFile(new URL("../public/brand/medicamento-ilustrativo.webp", import.meta.url));
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cesta — regressão local</title>
<link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/basket.css"><style>
*{box-sizing:border-box} body{margin:0;background:#f7f7f8;font:16px system-ui;color:#1b1f24}
header{display:flex;justify-content:flex-end;align-items:center;padding:12px 24px;min-height:72px;background:#121820}
header button{background:transparent;border:0;color:white;position:relative;cursor:pointer}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px}
article{background:white;border:1px solid #e2e4e8;border-radius:6px;padding:12px}
button{cursor:pointer}
.qa-mobile{display:none}
@media(max-width:639px){.qa-desktop{display:none}.qa-mobile{display:inline-flex}header{padding-inline:12px}}
</style></head><body><div id="root"></div><script src="/basket.js"></script></body></html>`;
const server = createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const send = (type, body) => { response.setHeader("Content-Type", type); response.end(body); };
  if (path === "/") return send("text/html; charset=utf-8", html);
  if (assets.has(path.slice(1))) {
    return send(path.endsWith(".js") ? "text/javascript" : "text/css", assets.get(path.slice(1)) ?? "");
  }
  if (path === "/brand/logo-wimifarma-compact.webp") return send("image/webp", logo);
  if (path === "/brand/medicamento-ilustrativo.webp") return send("image/webp", medicineFallback);
  const idIndex = ids.findIndex(id => path === `/fixture/${id}.svg`);
  if (idIndex >= 0) {
    const color = ["#d2abf5", "#7bd4ca", "#f6c476", "#9ddd8a", "#a9c8f5"][idIndex];
    return send("image/svg+xml", `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="52"><rect x="5" y="2" width="26" height="48" rx="5" fill="${color}"/><path stroke="#394858" d="M7 12h22M7 40h22"/><text x="18" y="31" text-anchor="middle" font-family="sans-serif" font-size="14">${names[idIndex][0]}</text></svg>`);
  }
  if (path.startsWith("/api/")) return send("application/json", "{}");
  response.writeHead(404).end();
});

const url = await new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`)));
const basket = page => page.getByRole("button", { name: /^Abrir cesta/ });
const article = (page, name) => page.getByRole("article", { name, exact: true });
const add = (page, name) => article(page, name).getByRole("button", { name: "Adicionar", exact: true });
const more = (page, name) => article(page, name).getByRole("button", { name: `Aumentar ${name}`, exact: true });
const flight = (page, kind) => page.locator(kind ? `[data-cart-basket-flight="${kind}"]` : "[data-cart-basket-flight]");
const slots = page => basket(page).locator("[data-cart-basket-slot]");
const thumbnails = page => basket(page).locator("[data-cart-basket-product]");
const count = (page, quantity) => expect(basket(page)).toHaveAccessibleName(`Abrir cesta: ${quantity} ${quantity === 1 ? "item" : "itens"} no carrinho`);
const renderedIds = (page, expected) => expect.poll(() => thumbnails(page).evaluateAll(nodes => nodes.map(node => node.dataset.cartBasketProduct))).toEqual(expected);

const capture = async (page, name) => {
  if (!process.env.BASKET_QA_DIR) return;
  await mkdir(process.env.BASKET_QA_DIR, { recursive: true });
  await page.locator("header").screenshot({ path: join(process.env.BASKET_QA_DIR, `${name}.png`), animations: "disabled" });
};

let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  context.setDefaultTimeout(8000);
  await context.route("**/*", route => route.request().url().startsWith(`${url}/`) ? route.continue() : route.abort());
  const desktop = await context.newPage();
  const mobile = await context.newPage();
  await desktop.clock.install();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.emulateMedia({ reducedMotion: "reduce" });
  await Promise.all([desktop.goto(url), mobile.goto(url)]);
  await Promise.all([count(desktop, 0), count(mobile, 0)]);
  await Promise.all([expect(slots(desktop)).toHaveCount(4), expect(slots(mobile)).toHaveCount(4)]);

  await desktop.bringToFront();
  await add(desktop, names[0]).click();
  await expect(flight(desktop, "land")).toHaveCount(1);
  await count(desktop, 1);
  await expect(flight(desktop)).toHaveCount(0);
  await renderedIds(desktop, ids.slice(0, 1));
  const photo = thumbnails(desktop).locator("img");
  await expect(photo).toHaveAttribute("src", `/fixture/${ids[0]}.svg`);
  await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);

  await desktop.clock.pauseAt(await desktop.evaluate(() => Date.now() + 500));
  await more(desktop, names[0]).dispatchEvent("click");
  await count(desktop, 2);
  await desktop.clock.runFor(449);
  await more(desktop, names[0]).dispatchEvent("click");
  await count(desktop, 2);
  await add(desktop, names[1]).dispatchEvent("click");
  await count(desktop, 3);
  await expect(flight(desktop, "land")).toHaveCount(1);
  await desktop.clock.runFor(1);
  await more(desktop, names[0]).dispatchEvent("click");
  await count(desktop, 4);
  await desktop.clock.resume();
  await expect(flight(desktop)).toHaveCount(0);
  await renderedIds(desktop, ids.slice(0, 2));
  console.log("PASS: product photo, single flight, same SKU cooldown and one slot per SKU");

  await add(desktop, names[2]).click();
  await expect(flight(desktop)).toHaveCount(0);
  await count(mobile, 5);
  await mobile.bringToFront();
  await mobile.evaluate(() => {
    window.flightAppeared = false;
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && node.matches("[data-cart-basket-flight]")) window.flightAppeared = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await add(mobile, names[3]).click();
  await count(mobile, 6);
  expect(await mobile.evaluate(() => window.flightAppeared)).toBe(false);
  await count(desktop, 6);
  await Promise.all([renderedIds(desktop, ids.slice(0, 4)), renderedIds(mobile, ids.slice(0, 4))]);
  const fallback = thumbnails(mobile).last().locator("img");
  await expect.poll(() => fallback.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await Promise.all([capture(desktop, "desktop-cheia"), capture(mobile, "celular-cheia")]);
  console.log("PASS: four different products on desktop and mobile; missing photo fallback and reduced motion");

  await desktop.bringToFront();
  await add(desktop, names[4]).click();
  await expect(flight(desktop, "overflow")).toHaveCount(1);
  await count(desktop, 7);
  await expect(flight(desktop)).toHaveCount(0);
  await renderedIds(desktop, ids.slice(0, 4));
  await basket(mobile).click();
  const drawer = mobile.getByRole("dialog", { name: "Minha cesta" });
  await expect(drawer.getByText("7 itens selecionados")).toBeVisible();
  await expect(drawer.getByRole("button", { name: `Remover ${names[4]}`, exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: `Remover ${names[0]}`, exact: true }).click();
  await expect(drawer.getByText("4 itens selecionados")).toBeVisible();
  await drawer.getByRole("button", { name: "Fechar cesta", exact: true }).click();
  await Promise.all([count(desktop, 4), count(mobile, 4)]);
  await Promise.all([renderedIds(desktop, ids.slice(1)), renderedIds(mobile, ids.slice(1))]);
  await desktop.reload();
  await count(desktop, 4);
  await renderedIds(desktop, ids.slice(1));
  await expect(flight(desktop)).toHaveCount(0);
  console.log("PASS: fifth SKU uses overflow, stays in the drawer, promotes after removal and persists across reload");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
