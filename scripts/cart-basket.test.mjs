import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";

const names = ["Algodão", "Sabonete", "Creme", "Gaze", "Escova", "Xampu", "Gel", "Protetor", "Curativo", "Lenço", "Fralda", "Talco", "Loção"];
const ids = ["cotton", "soap", "cream", "gauze", "brush", "shampoo", "gel", "sunscreen", "bandage", "tissue", "diaper", "powder", "lotion"];
const basketCapacity = 9;
const sideCapacity = 3;
const visibleCapacity = basketCapacity + sideCapacity;
const products = ids.map((id, index) => ({
  id, slug: id, name: names[index], imageUrl: index === 3 ? null : `/uploads/products/${id}.svg`,
  unitPriceCents: 500, originalPriceCents: null, stock: 20, category: index === 3 ? "Medicamentos" : null,
  requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false,
}));

// Keep the real basket, drawer, product controls, CSS modules and storage. Only
// replace Next's framework adapters; all images and API responses stay local.
const mocks = {
  "next/navigation": `export const useRouter = () => ({ push() {} });`,
  "next/link": `export default function Link(props) { return <a {...props} />; }`,
  "next/image": `
    export const getImageProps = ({ src }) => ({ props: { src } });
    export default function Image({ unoptimized, fill, priority, quality, ...props }) { return <img {...props} />; }
  `,
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
const basketImage = await readFile(new URL("../public/brand/cesta-wimifarma-preta.webp", import.meta.url));
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
  if (path === "/brand/cesta-wimifarma-preta.webp") return send("image/webp", basketImage);
  if (path === "/brand/medicamento-ilustrativo.webp") return send("image/webp", medicineFallback);
  const idIndex = ids.findIndex(id => path === `/uploads/products/${id}.svg`);
  if (idIndex >= 0) {
    if (ids[idIndex] === "powder") {
      return send("image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="52"><rect width="36" height="52" fill="#fff"/></svg>');
    }
    const color = `hsl(${idIndex * 47} 65% 78%)`;
    const background = idIndex === 0 ? '<rect width="36" height="52" fill="#fff"/>' : "";
    const label = idIndex === 0
      ? '<rect x="12" y="18" width="12" height="16" fill="#fff"/>'
      : `<text x="18" y="31" text-anchor="middle" font-family="sans-serif" font-size="14">${names[idIndex][0]}</text>`;
    return send("image/svg+xml", `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="52">${background}<rect x="5" y="2" width="26" height="48" rx="5" fill="${color}"/><path stroke="#394858" d="M7 12h22M7 40h22"/>${label}</svg>`);
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
const sideSlot = (page, index) => basket(page).locator(`[data-cart-basket-side-slot="${index}"]`);
const overflowBadge = page => basket(page).locator("[data-cart-basket-more]");
const thumbnails = page => basket(page).locator("[data-cart-basket-product]");
const count = (page, quantity) => expect(basket(page)).toHaveAccessibleName(`Abrir cesta: ${quantity} ${quantity === 1 ? "item" : "itens"} no carrinho`);
const renderedIds = (page, expected) => expect.poll(() => thumbnails(page).evaluateAll(nodes => nodes.map(node => node.dataset.cartBasketProduct))).toEqual(expected);
const observeFlights = page => page.evaluate(() => {
  window.flightAppeared = false;
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node instanceof Element && node.matches("[data-cart-basket-flight]")) window.flightAppeared = true;
    }
  }).observe(document.body, { childList: true, subtree: true });
});
const flightPositions = (page, kind) => flight(page, kind).evaluate(node => {
  const effect = node.getAnimations()[0]?.effect;
  const x = Number.parseFloat(node.style.left) + node.offsetWidth / 2;
  const y = Number.parseFloat(node.style.top) + node.offsetHeight / 2;
  return (effect?.getKeyframes() ?? []).map(frame => {
    const transform = new DOMMatrixReadOnly(frame.transform);
    return { x: x + transform.m41, y: y + transform.m42 };
  });
});

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
  await Promise.all([expect(slots(desktop)).toHaveCount(basketCapacity), expect(slots(mobile)).toHaveCount(basketCapacity)]);

  await desktop.bringToFront();
  await add(desktop, names[0]).click();
  await expect(flight(desktop, "land")).toHaveCount(1);
  await expect.poll(async () => (await flightPositions(desktop, "land")).length).toBeGreaterThan(0);
  const landing = await flightPositions(desktop, "land");
  expect(Math.min(...landing.map(point => point.y))).toBeLessThan(landing.at(-1).y);
  await count(desktop, 1);
  await expect(flight(desktop)).toHaveCount(0);
  await renderedIds(desktop, ids.slice(0, 1));
  const photo = thumbnails(desktop).locator("img");
  await expect(photo).toHaveAttribute("src", /^data:image\//);
  await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const cutoutPixels = await photo.evaluate(img => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0);
    const corner = context.getImageData(0, 0, 1, 1).data;
    const center = context.getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
    return { cornerAlpha: corner[3], center: Array.from(center) };
  });
  expect(cutoutPixels).toEqual({ cornerAlpha: 0, center: [255, 255, 255, 255] });

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
  await observeFlights(mobile);
  await add(mobile, names[3]).click();
  await count(mobile, 6);
  expect(await mobile.evaluate(() => window.flightAppeared)).toBe(false);
  await count(desktop, 6);
  await Promise.all([renderedIds(desktop, ids.slice(0, 4)), renderedIds(mobile, ids.slice(0, 4))]);
  const fallback = thumbnails(mobile).last().locator("img");
  await expect.poll(() => fallback.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await desktop.bringToFront();
  for (const name of names.slice(4, basketCapacity)) {
    await add(desktop, name).click();
    await expect(flight(desktop, "land")).toHaveCount(1);
    await expect(flight(desktop)).toHaveCount(0);
  }
  const fullIds = ids.slice(0, basketCapacity);
  await Promise.all([count(desktop, 11), count(mobile, 11)]);
  await Promise.all([renderedIds(desktop, fullIds), renderedIds(mobile, fullIds)]);
  const mobileButton = await basket(mobile).boundingBox();
  expect(mobileButton.height).toBeGreaterThanOrEqual(44);
  expect(mobileButton.x + mobileButton.width).toBeLessThanOrEqual(390);
  await Promise.all([capture(desktop, "desktop-cheia"), capture(mobile, "celular-cheia")]);
  console.log("PASS: nine different products on desktop and mobile; missing photo fallback and reduced motion");

  for (let index = 0; index < sideCapacity; index += 1) {
    const id = ids[basketCapacity + index];
    const target = await sideSlot(desktop, index).boundingBox();
    const header = await desktop.locator("header").boundingBox();
    await add(desktop, names[basketCapacity + index]).click();
    await expect(flight(desktop, "overflow")).toHaveCount(1);
    await expect.poll(async () => (await flightPositions(desktop, "overflow")).length).toBeGreaterThan(0);
    const bounce = await flightPositions(desktop, "overflow");
    const resting = bounce.at(-1);
    expect(Math.abs(resting.x - (target.x + target.width / 2))).toBeLessThan(1.5);
    expect(Math.abs(resting.y - (target.y + target.height / 2))).toBeLessThan(1.5);
    expect(resting.y).toBeLessThan(header.y + header.height);
    expect(bounce.slice(-3, -1).some(point => point.y < resting.y)).toBe(true);
    await expect(flight(desktop)).toHaveCount(0);
    await Promise.all([desktop, mobile].map(page =>
      expect(sideSlot(page, index).locator(`[data-cart-basket-product="${id}"]`)).toBeVisible()));
  }
  const visibleIds = ids.slice(0, visibleCapacity);
  await Promise.all([renderedIds(desktop, visibleIds), renderedIds(mobile, visibleIds)]);
  const uncuttable = thumbnails(desktop).filter({ has: desktop.locator("svg.lucide-package") });
  await expect(uncuttable).toHaveAttribute("data-cart-basket-product", "powder");
  await expect(uncuttable.locator("img")).toHaveCount(0);
  await expect(overflowBadge(desktop)).toHaveCount(0);
  await observeFlights(desktop);
  await add(desktop, names[visibleCapacity]).click();
  await Promise.all([desktop, mobile].map(async page => {
    await count(page, 15);
    await expect(overflowBadge(page)).toHaveText("+1");
    await renderedIds(page, visibleIds);
  }));
  expect(await desktop.evaluate(() => window.flightAppeared)).toBe(false);
  await Promise.all([capture(desktop, "desktop-transbordo"), capture(mobile, "celular-transbordo")]);
  await desktop.reload();
  await count(desktop, 15);
  await renderedIds(desktop, visibleIds);
  await expect(overflowBadge(desktop)).toHaveText("+1");
  await expect(flight(desktop)).toHaveCount(0);

  await mobile.bringToFront();
  await basket(mobile).click();
  const drawer = mobile.getByRole("dialog", { name: "Minha cesta" });
  await expect(drawer.getByText("15 itens selecionados")).toBeVisible();
  await expect(drawer.getByRole("button", { name: `Remover ${names[visibleCapacity]}`, exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: `Remover ${names[0]}`, exact: true }).click();
  await expect(drawer.getByText("12 itens selecionados")).toBeVisible();
  await drawer.getByRole("button", { name: "Fechar cesta", exact: true }).click();
  await Promise.all([desktop, mobile].map(async page => {
    await count(page, 12);
    await renderedIds(page, ids.slice(1));
    await expect(slots(page).last().locator(`[data-cart-basket-product="${ids[basketCapacity]}"]`)).toBeVisible();
    await expect(sideSlot(page, sideCapacity - 1).locator(`[data-cart-basket-product="${ids[visibleCapacity]}"]`)).toBeVisible();
    await expect(overflowBadge(page)).toHaveCount(0);
  }));
  await expect(flight(desktop)).toHaveCount(0);
  console.log("PASS: three overflow products land beside the basket and persist; the thirteenth stays in the drawer until a slot opens");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
