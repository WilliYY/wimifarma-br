import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";

const names = ["Algodão", "Sabonete", "Creme", "Genérico", "Escova", "Xampu", "Gel", "Ético", "Curativo", "Lenço", "Fralda", "Talco", "Loção", "Óleo", "Fio"];
const ids = ["cotton", "soap", "cream", "generic", "brush", "shampoo", "gel", "ethical", "bandage", "tissue", "diaper", "powder", "lotion", "oil", "floss"];
const basketCapacity = 9;
const sideCapacity = 5;
const visibleCapacity = basketCapacity + sideCapacity;
const products = ids.map((id, index) => ({
  id, slug: id, name: names[index], imageUrl: ["generic", "ethical"].includes(id) ? null : `/uploads/products/${id}.svg`,
  unitPriceCents: 500, originalPriceCents: null, stock: id === "floss" ? 1 : 20, category: ["generic", "ethical"].includes(id) ? "Medicamentos" : null,
  catalogClassification: id === "generic" ? { medicineClass: "GENERIC" } : id === "ethical" ? { ethical: true } : undefined,
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
const medicineIllustrations = new Map(await Promise.all(
  ["/brand/medicamento-sem-foto.webp", "/brand/medicamento-etico-ilustrativo.webp"].map(async path =>
    [path, await readFile(new URL(`../public${path}`, import.meta.url))]),
));
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cesta — regressão local</title>
<link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/basket.css"><style>
*{box-sizing:border-box} body{margin:0;background:#f7f7f8;font:16px system-ui;color:#1b1f24}
header{display:flex;justify-content:flex-end;align-items:center;padding:12px 24px;min-height:72px;background:#121820}
header button{background:transparent;border:0;color:white;position:relative;cursor:pointer}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px}
article{background:white;border:1px solid #e2e4e8;border-radius:6px;padding:12px}
button:not(:disabled){cursor:pointer}
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
  if (medicineIllustrations.has(path)) return send("image/webp", medicineIllustrations.get(path));
  const idIndex = ids.findIndex(id => path === `/uploads/products/${id}.svg`);
  if (idIndex >= 0) {
    if (ids[idIndex] === "powder") {
      return send("image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="52"><rect width="36" height="52" fill="#fff"/></svg>');
    }
    const color = `hsl(${idIndex * 47} 65% 78%)`;
    const background = idIndex === 0 ? '<rect width="36" height="52" fill="#fff"/>'
      : ids[idIndex] === "lotion" ? '<rect x="2" y="1" width="32" height="50" rx="4" fill="#eeedea"/>' : "";
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
const flightPositions = (page, kind, initial = false) => page.evaluate(({ kind, initial }) => {
  const recorded = window.basketFlightPaths.get(kind);
  if (!recorded) return [];
  const { effect, initialFrames, x, y } = recorded;
  return (initial ? initialFrames : effect.getKeyframes()).map(frame => {
    const transform = new DOMMatrixReadOnly(frame.transform);
    return { x: x + transform.m41, y: y + transform.m42 };
  });
}, { kind, initial });

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
  await context.addInitScript(() => {
    // Keep the planned motion available after the short-lived thumbnail is removed.
    window.basketFlightPaths = new Map();
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      const kind = this.getAttribute("data-cart-basket-flight");
      if (kind) {
        if (window.holdBasketMotions) animation.pause();
        window.basketFlightPaths.set(kind, {
          animation,
          effect: animation.effect,
          initialFrames: animation.effect.getKeyframes(),
          x: Number.parseFloat(this.style.left) + this.offsetWidth / 2,
          y: Number.parseFloat(this.style.top) + this.offsetHeight / 2,
        });
        if (kind === "overflow" && window.shiftHeaderOnOverflow) {
          document.querySelector("header").style.transform = "translateY(-18px)";
          window.shiftHeaderOnOverflow = false;
        }
      }
      return animation;
    };
  });
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

  await desktop.evaluate(() => { window.holdBasketMotions = true; });
  await desktop.clock.pauseAt(await desktop.evaluate(() => Date.now() + 500));
  await more(desktop, names[0]).evaluate(button => {
    for (let click = 0; click < 30; click++) button.click();
  });
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
  await desktop.evaluate(() => {
    window.holdBasketMotions = false;
    window.basketFlightPaths.get("land")?.animation.finish();
  });
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
    await desktop.evaluate(() => window.basketFlightPaths.delete("land"));
    await add(desktop, name).click();
    await expect.poll(async () => (await flightPositions(desktop, "land")).length).toBeGreaterThan(0);
    await expect(flight(desktop)).toHaveCount(0);
  }
  const fullIds = ids.slice(0, basketCapacity);
  await Promise.all([count(desktop, 11), count(mobile, 11)]);
  await Promise.all([renderedIds(desktop, fullIds), renderedIds(mobile, fullIds)]);
  await expect(basket(desktop).locator('[data-cart-basket-product="ethical"] img')).toHaveAttribute("src", /^data:image\//);
  const mobileButton = await basket(mobile).boundingBox();
  expect(mobileButton.height).toBeGreaterThanOrEqual(44);
  expect(mobileButton.x + mobileButton.width).toBeLessThanOrEqual(390);
  await Promise.all([capture(desktop, "desktop-cheia"), capture(mobile, "celular-cheia")]);
  console.log("PASS: nine different products on desktop and mobile; missing photo fallback and reduced motion");

  for (let index = 0; index < sideCapacity; index += 1) {
    const id = ids[basketCapacity + index];
    const target = await sideSlot(desktop, index).boundingBox();
    const header = await desktop.locator("header").boundingBox();
    await desktop.evaluate(shift => {
      window.basketFlightPaths.delete("overflow");
      window.shiftHeaderOnOverflow = shift;
    }, index === 0);
    await add(desktop, names[basketCapacity + index]).click();
    await expect.poll(async () => (await flightPositions(desktop, "overflow")).length).toBeGreaterThan(0);
    const bounce = await flightPositions(desktop, "overflow", true);
    const resting = bounce.at(-1);
    expect(Math.abs(resting.x - (target.x + target.width / 2))).toBeLessThan(1.5);
    expect(Math.abs(resting.y - (target.y + target.height / 2))).toBeLessThan(1.5);
    expect(resting.y).toBeLessThan(header.y + header.height);
    expect(bounce.slice(-3, -1).some(point => point.y < resting.y)).toBe(true);
    if (index === 0) {
      const moved = await sideSlot(desktop, index).boundingBox();
      await expect.poll(async () => (await flightPositions(desktop, "overflow")).at(-1)?.y, {
        intervals: [20, 40, 60],
      }).toBeCloseTo(moved.y + moved.height / 2, 0);
    }
    await expect(flight(desktop)).toHaveCount(0);
    if (index === 0) await desktop.locator("header").evaluate(element => element.style.removeProperty("transform"));
    await Promise.all([desktop, mobile].map(page =>
      expect(sideSlot(page, index).locator(`[data-cart-basket-product="${id}"]`)).toBeVisible()));
  }
  const visibleIds = ids.slice(0, visibleCapacity);
  await Promise.all([renderedIds(desktop, visibleIds), renderedIds(mobile, visibleIds)]);
  const uncuttable = thumbnails(desktop).filter({ has: desktop.locator("svg.lucide-package") });
  await expect(uncuttable).toHaveAttribute("data-cart-basket-product", "powder");
  await expect(uncuttable.locator("img")).toHaveCount(0);
  const creamCutout = basket(desktop).locator('[data-cart-basket-product="lotion"] img');
  await expect(creamCutout).toHaveAttribute("src", /^data:image\//);
  expect(await creamCutout.evaluate(async img => {
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 255 && data[i] === 238 && data[i + 1] === 237 && data[i + 2] === 234) return false;
    }
    return true;
  })).toBe(true);
  await expect(overflowBadge(desktop)).toHaveCount(0);
  await observeFlights(desktop);
  await add(desktop, names[visibleCapacity]).click();
  await expect(more(desktop, names[visibleCapacity])).toBeDisabled();
  await expect(more(desktop, names[visibleCapacity])).toHaveCSS("cursor", "default");
  await Promise.all([desktop, mobile].map(async page => {
    await count(page, 17);
    await expect(overflowBadge(page)).toHaveText("+1");
    await renderedIds(page, visibleIds);
  }));
  expect(await desktop.evaluate(() => window.flightAppeared)).toBe(false);
  await Promise.all([capture(desktop, "desktop-transbordo"), capture(mobile, "celular-transbordo")]);
  await desktop.reload();
  await count(desktop, 17);
  await renderedIds(desktop, visibleIds);
  await expect(overflowBadge(desktop)).toHaveText("+1");
  await expect(flight(desktop)).toHaveCount(0);

  await mobile.bringToFront();
  await basket(mobile).click();
  const drawer = mobile.getByRole("dialog", { name: "Minha cesta" });
  await expect(drawer.getByText("17 itens selecionados")).toBeVisible();
  await expect(drawer.getByRole("button", { name: `Remover ${names[visibleCapacity]}`, exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: `Remover ${names[0]}`, exact: true }).click();
  await expect(drawer.getByText("14 itens selecionados")).toBeVisible();
  await drawer.getByRole("button", { name: "Fechar cesta", exact: true }).click();
  await Promise.all([desktop, mobile].map(async page => {
    await count(page, 14);
    await renderedIds(page, ids.slice(1));
    await expect(slots(page).last().locator(`[data-cart-basket-product="${ids[basketCapacity]}"]`)).toBeVisible();
    await expect(sideSlot(page, sideCapacity - 1).locator(`[data-cart-basket-product="${ids[visibleCapacity]}"]`)).toBeVisible();
    await expect(overflowBadge(page)).toHaveCount(0);
  }));
  await expect(flight(desktop)).toHaveCount(0);
  console.log("PASS: five overflow products land beside the basket; the fifteenth waits for a preview slot");

  await desktop.bringToFront();
  await basket(desktop).click();
  const desktopDrawer = desktop.getByRole("dialog", { name: "Minha cesta" });
  await desktop.evaluate(() => { window.holdBasketMotions = true; });
  await desktop.clock.pauseAt(await desktop.evaluate(() => Date.now() + 500));
  await desktopDrawer.getByRole("button", { name: `Remover ${names[1]}`, exact: true }).dispatchEvent("click");
  await expect(flight(desktop, "departure")).toHaveCount(1);
  expect(await flight(desktop, "departure").evaluate(el => Number(getComputedStyle(el).zIndex)))
    .toBeGreaterThan(await desktopDrawer.evaluate(el => Number(getComputedStyle(el).zIndex)));
  await expect(desktopDrawer.getByRole("button", { name: `Remover ${names[1]}`, exact: true })).toHaveCount(0);
  await count(desktop, 13);
  await renderedIds(desktop, ids.slice(2));
  let departure = [];
  for (let step = 0; step < 10 && !departure.length; step++) {
    await desktop.clock.runFor(30);
    departure = await flightPositions(desktop, "departure");
  }
  expect(departure.at(-1).y - departure[0].y).toBeGreaterThan(0);
  await desktop.evaluate(() => window.basketFlightPaths.get("departure").animation.finish());
  await desktop.clock.resume();
  await expect(flight(desktop)).toHaveCount(0);
  await desktopDrawer.getByRole("button", { name: "Fechar cesta", exact: true }).click();

  await add(desktop, names[0]).dispatchEvent("click");
  await expect(flight(desktop, "overflow")).toHaveCount(1);
  await article(desktop, names[0]).getByRole("button", { name: `Diminuir ${names[0]}`, exact: true }).dispatchEvent("click");
  await expect(flight(desktop)).toHaveCount(0);
  await Promise.all([desktop, mobile].map(async page => {
    await count(page, 13);
    await renderedIds(page, ids.slice(2));
  }));

  await article(desktop, names[2]).getByRole("button", { name: `Diminuir ${names[2]}`, exact: true }).dispatchEvent("click");
  await expect(flight(desktop, "departure")).toHaveCount(1);
  await add(desktop, names[2]).dispatchEvent("click");
  await expect(flight(desktop, "departure")).toHaveCount(0);
  await Promise.all([desktop, mobile].map(async page => {
    await count(page, 13);
    await renderedIds(page, [...ids.slice(3), ids[2]]);
  }));
  await desktop.evaluate(() => { window.holdBasketMotions = false; });
  console.log("PASS: removal leaves both baskets immediately and interrupted flights do not leave duplicate thumbnails");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
