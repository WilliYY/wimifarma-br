import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import sharp from "sharp";
import { chromium, expect, type Page } from "@playwright/test";
import { buildHomeCollections } from "../src/features/products/home-collections";
import type { RelatedProductCardItem } from "../src/components/site/public-product-card";

const output = "outputs/catalogo-vitrine-2026-10-19";
const base = "http://127.0.0.1:3098";
const classification = (medicine: boolean) => ({ kind: medicine ? "MEDICINE" : "HYGIENE", medicineClass: medicine ? "OTHER" : "UNCLASSIFIED", ethical: false, otc: medicine });
const homeProducts: RelatedProductCardItem[] = Array.from({ length: 30 }, (_, index) => {
  const medicine = index < 15, number = index % 15 + 1;
  const id = `synthetic-${medicine ? "mip" : "care"}-${number}`;
  return { id, slug: id, name: `${medicine ? "MIP" : "Higiene"} QA ${String(number).padStart(2, "0")} sintético`, brand: "QA sintético", category: medicine ? "Medicamentos" : "Higiene", price: (number + (medicine ? 1 : 2)).toFixed(2), promotionalPrice: null, imageUrl: `/uploads/products/${id}.webp`, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, stock: 20, activeIngredients: [], searchTerms: [], cashbackEnabled: false, cashbackRateBps: 200, catalogClassification: classification(medicine), inventorySource: "PHARMACY" };
});
const verifiedPhotos = new Set(homeProducts.map(product => product.imageUrl!));
const collections = buildHomeCollections(homeProducts, verifiedPhotos, new Date("2026-10-19T15:00:00Z"));
const ownProducts = homeProducts.slice(15, 19).map((product, index) => ({ ...product, status: "ACTIVE", description: "Registro exclusivamente sintético de QA", ean: null, sku: null, featuredPosition: null, imageAssetId: null, createdAt: "2026-10-19T12:00:00.000Z", updatedAt: "2026-10-19T12:00:00.000Z", supplierMarkupBps: 6000, sortOrder: index }));
const distributorProducts = Array.from({ length: 3 }, (_, index) => ({ ...ownProducts[index], id: `synthetic-distributor-${index}`, slug: `synthetic-distributor-${index}`, name: `Medicamento distribuidor QA ${index + 1}`, category: "Medicamentos", imageUrl: null, requiresPrescription: true, prescriptionType: "ORDINARY", catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false }, inventorySource: "DISTRIBUTOR", stock: 3, supplierPricing: { supplier: "ANB", unitCostCents: 1000, unitPriceCents: 1600, purchaseLimit: 999, demandAllowed: true, validUntil: "2099-10-19T20:00:00.000Z" } }));

const harness = `
import {createRoot} from "react-dom/client";
import {Toaster} from "sonner";
import {CustomerAuthPage} from "@/components/site/customer-auth-page";
import {ProductsCatalogPanel} from "@/components/admin/products-catalog-panel";
import {HomePage} from "@/components/site/home-page";
import {CartProvider} from "@/components/site/cart-provider";
import {BrandSignature} from "@/components/site/brand-signature";
import {buildHomeShortcuts} from "@/features/products/home-shortcuts";
const mode=location.pathname;
createRoot(document.getElementById("root")).render(<><div className="fixed bottom-0 right-0 z-[100] rounded-tl-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white">QA SINTÉTICO</div>{mode==="/login"?<CustomerAuthPage/>:mode==="/admin/catalogos"?<main className="min-h-screen bg-surface-subtle p-4 sm:p-8"><ProductsCatalogPanel canManageCashback canManageShipping/></main>:<CartProvider><header className="absolute left-0 right-0 top-0 z-30 flex h-24 items-center justify-between border-b border-line bg-white px-4 sm:px-8"><BrandSignature/><span className="text-xs font-semibold text-muted">Vitrine sintética</span></header><main><HomePage shortcuts={buildHomeShortcuts()} customerReviews={[]} collections={window.__qa.collections}/></main></CartProvider>}<Toaster/></>);
`;

async function bundleFixture() {
  return build({ stdin: { contents: harness, resolveDir: process.cwd(), sourcefile: "catalog-upgrade-qa.tsx", loader: "tsx" }, outfile: "qa.js", bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, plugins: [{ name: "qa-framework-isolation", setup(builder) {
    builder.onResolve({ filter: /features\/reviews\/whatsapp-testimonials$/ }, args => ({ path: args.path, namespace: "qa-testimonials" }));
    builder.onLoad({ filter: /.*/, namespace: "qa-testimonials" }, () => ({ contents: "export const whatsappTestimonials=[];" }));
    builder.onResolve({ filter: /^(next\/(image|link|navigation)|next-auth\/react)$/ }, args => ({ path: args.path, namespace: "qa-mock" }));
    builder.onLoad({ filter: /.*/, namespace: "qa-mock" }, args => {
      const contents = args.path === "next/image" ? `import {createElement} from "react";export default function Image({fill,priority,unoptimized,quality,sizes,loading,style,...props}){return createElement("img",{...props,loading:"eager",style:fill?{position:"absolute",width:"100%",height:"100%",inset:0,...style}:style});}`
        : args.path === "next/link" ? `import {createElement} from "react";export default function Link({prefetch,replace,scroll,...props}){return createElement("a",props);}`
          : args.path === "next/navigation" ? `export const useRouter=()=>({push:path=>window.__qa.navigation.push(path),replace:path=>window.__qa.navigation.push(path),refresh:()=>{}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);`
            : `export const getProviders=async()=>({});export const signIn=async()=>{window.__qa.authCalls++;return window.__qa.authCalls===1?{error:"Synthetic refusal"}:{ok:true};};export const getSession=async()=>({user:{role:"ADMIN"}});export const useSession=()=>({data:null,status:"unauthenticated"});`;
      return { contents, loader: "jsx", resolveDir: process.cwd() };
    });
  } }] });
}

async function fit(page: Page, label: string) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: document overflow`);
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1 && element.getBoundingClientRect().left >= -1 && element.getBoundingClientRect().right <= innerWidth + 1), `${label}: dialog overflow`);
}

async function loadedImages(page: Page) {
  await expect.poll(() => page.locator("img").evaluateAll(images => images.filter(image => !(image as HTMLImageElement).complete || !(image as HTMLImageElement).naturalWidth).map(image => image.getAttribute("src")))).toEqual([]);
}

async function main() {
  for (const [name, products] of Object.entries(collections)) {
    assert.equal(products.length, 15, `${name}: 15 synthetic items required`);
    assert.ok(products.every(product => !product.requiresPrescription && product.imageUrl && verifiedPhotos.has(product.imageUrl)));
  }
  assert.ok(collections.otc.every(product => (product.catalogClassification as { otc: boolean }).otc));
  const bundle = await bundleFixture();
  const cssFiles = (await fs.readdir(".next/static/css", { recursive: true })).filter(file => file.endsWith(".css"));
  assert.ok(cssFiles.length, "Run the current Next.js build before the visual audit");
  const compiledCss = (await Promise.all(cssFiles.map(file => fs.readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
  assert.match(compiledCss, /grid-template-columns:\s*0?\.85fr\s+1\.15fr/, "Compiled CSS predates the current login; rerun after the Next.js build");
  const css = `${compiledCss}\n${bundle.outputFiles.find(file => file.path.endsWith(".css"))?.text ?? ""}`;
  const font = /--font-barlow:\s*([^;}]+)/.exec(css)?.[1] ?? "Arial";
  const images = new Map<string, Buffer>();
  for (const product of homeProducts) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="white"/><rect x="105" y="50" width="270" height="370" rx="10" fill="#f7f8fa" stroke="#c8102e" stroke-width="3"/><rect x="105" y="50" width="270" height="65" fill="#c8102e"/><text x="240" y="90" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="21" fill="white">QA SINTÉTICO</text><text x="240" y="220" text-anchor="middle" font-family="Arial" font-size="22" fill="#111827">${product.name.replace(" sintético", "")}</text><text x="240" y="350" text-anchor="middle" font-family="Arial" font-size="17" fill="#667085">SEM VALIDADE COMERCIAL</text></svg>`;
    images.set(product.imageUrl!, await sharp(Buffer.from(svg)).webp().toBuffer());
  }
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  const results: unknown[] = [];
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce", serviceWorkers: "block" });
      const page = await context.newPage();
      const errors: string[] = [], mutations: string[] = [], blockedExternal: string[] = [], missingAssets: string[] = [];
      const servedAssets = new Set<string>();
      page.on("pageerror", error => errors.push(error.message));
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== base) { blockedExternal.push(url.origin); return route.abort(); }
        if (request.method() !== "GET") { mutations.push(`${request.method()} ${url.pathname}`); return route.abort(); }
        const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (["/login", "/admin/catalogos", "/"].includes(url.pathname)) return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<!doctype html><html lang="pt-BR" class="h-full antialiased"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/_next/static/css/qa.css"><style>:root{--font-barlow:${font}}</style></head><body><div id="root"></div><script>window.__qa=${JSON.stringify({ collections, navigation: [], authCalls: 0 })}</script><script src="/qa.js"></script></body></html>` });
        if (url.pathname === "/qa.js") return route.fulfill({ contentType: "text/javascript; charset=utf-8", body: Buffer.from(bundle.outputFiles.find(file => file.path.endsWith(".js"))!.contents) });
        if (url.pathname === "/_next/static/css/qa.css") return route.fulfill({ contentType: "text/css; charset=utf-8", body: css });
        if (url.pathname === "/api/produtos") return json({ data: [...ownProducts, ...distributorProducts] });
        if (url.pathname === "/api/minha-conta/club") return json({ message: "Synthetic guest" }, 401);
        if (url.pathname.startsWith("/api/")) return json({ data: [] });
        if (images.has(url.pathname)) return route.fulfill({ contentType: "image/webp", body: images.get(url.pathname)! });
        const staticPath = url.pathname.startsWith("/_next/static/") ? path.resolve(".next/static", url.pathname.slice("/_next/static/".length)) : path.resolve("public", `.${url.pathname}`);
        const allowedRoot = path.resolve(url.pathname.startsWith("/_next/static/") ? ".next/static" : "public");
        if (!staticPath.startsWith(`${allowedRoot}${path.sep}`)) return route.abort();
        try {
          const body = await fs.readFile(staticPath);
          servedAssets.add(url.pathname);
          return route.fulfill({ body, contentType: /\.svg$/.test(staticPath) ? "image/svg+xml" : /\.webp$/.test(staticPath) ? "image/webp" : /\.woff2$/.test(staticPath) ? "font/woff2" : "application/octet-stream" });
        } catch { missingAssets.push(url.pathname); return route.fulfill({ status: 404, body: "Missing QA asset" }); }
      });

      await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Que bom ter você aqui." })).toBeVisible();
      await loadedImages(page);
      assert.equal(await page.locator("[data-brand-signature] img").getAttribute("src"), "/brand/logo-wimifarma-compact.webp");
      await fit(page, `login ${width}`);
      await page.screenshot({ path: `${output}/login-${width}.png`, fullPage: true });
      await page.getByLabel("E-mail ou usuário", { exact: true }).fill("admin-qa@example.invalid");
      const loginPassword = page.getByRole("form", { name: "Entrar na conta" }).getByLabel("Senha", { exact: true });
      await loginPassword.fill("Synthetic-only-password");
      await page.getByRole("button", { name: "Mostrar senha", exact: true }).click();
      await expect(loginPassword).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Ocultar senha", exact: true }).click();
      await page.getByRole("button", { name: "Entrar na minha conta", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Não foi possível entrar");
      await expect(page.getByLabel("E-mail ou usuário", { exact: true })).toHaveValue("admin-qa@example.invalid");
      await page.getByRole("button", { name: "Entrar na minha conta", exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __qa: { navigation: string[] } }).__qa.navigation)).toEqual(["/admin/dashboard"]);
      await page.getByRole("button", { name: "Criar conta", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Vamos criar sua conta?" })).toBeVisible();
      await fit(page, `registration ${width}`);
      await page.screenshot({ path: `${output}/cadastro-${width}.png`, fullPage: true });

      await page.goto(`${base}/admin/catalogos`, { waitUntil: "domcontentloaded" });
      const origin = page.getByRole("tablist", { name: "Origem dos produtos" });
      await expect(origin.getByRole("tab", { name: /Loja física/ })).toHaveAttribute("aria-selected", "true");
      const panel = page.getByRole("tabpanel");
      await expect(panel.getByRole("article")).toHaveCount(4);
      assert.ok(await panel.getByRole("article").first().evaluate(element => element.getBoundingClientRect().height < 170), "Catalog rows must remain compact");
      await loadedImages(page);
      await panel.getByRole("checkbox", { name: "Selecionar produtos visíveis, até 50" }).check();
      await expect(panel.getByRole("checkbox", { checked: true })).toHaveCount(5);
      await fit(page, `catalog ${width}`);
      await page.screenshot({ path: `${output}/catalogo-${width}.png`, fullPage: true });
      await panel.getByRole("button", { name: "Editar 4 em massa", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Status", { exact: true }).selectOption("DRAFT");
      await dialog.getByRole("button", { name: "Revisar alterações" }).click();
      await expect(dialog.getByRole("heading", { name: "Revisar edição em massa" })).toBeVisible();
      await expect(dialog.getByLabel("Produtos que serão alterados").locator("li")).toHaveCount(4);
      await expect(dialog.getByText("Rascunho", { exact: true })).toBeVisible();
      await fit(page, `bulk preview ${width}`);
      await page.screenshot({ path: `${output}/lote-previa-${width}.png`, fullPage: true });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await origin.getByRole("tab", { name: /Distribuidoras/ }).click();
      await expect(panel.getByRole("article")).toHaveCount(3);
      await expect(panel.getByRole("checkbox", { checked: true })).toHaveCount(0);
      await expect(panel.getByRole("button", { name: "Editar selecionados em massa" })).toBeDisabled();
      await expect(panel.getByRole("img", { name: "Imagem ilustrativa de medicamento, não representa a embalagem do produto" })).toHaveCount(3);
      await expect.poll(() => servedAssets.has("/brand/medicamento-sem-foto.webp")).toBe(true);
      await fit(page, `distributors ${width}`);
      await page.screenshot({ path: `${output}/distribuidoras-${width}.png`, fullPage: true });

      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#home-care[aria-roledescription='carrossel'], #home-otc[aria-roledescription='carrossel'], #home-affordable[aria-roledescription='carrossel']")).toHaveCount(3);
      for (const [key, id] of [["care", "home-care"], ["otc", "home-otc"], ["affordable", "home-affordable"]] as const) {
        const carousel = page.locator(`#${id}`);
        await expect(carousel.locator("[data-home-product-card]")).toHaveCount(15);
        assert.ok((await carousel.textContent())?.includes("sintético"), "Synthetic item names must retain UTF-8 accents");
        const sourceImages = await carousel.locator("img").evaluateAll(elements => elements.map(element => element.getAttribute("src")));
        assert.deepEqual(sourceImages, collections[key].map(product => product.imageUrl));
        const button = page.locator(`button[aria-controls="${id}"]`).last();
        await expect(button).toBeEnabled();
        await button.click();
        await expect.poll(() => carousel.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
        await carousel.evaluate(element => { element.scrollLeft = 0; });
      }
      await loadedImages(page);
      await fit(page, `home ${width}`);
      await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
      await page.locator("#home-care").locator("..").locator("..").screenshot({ path: `${output}/carrossel-${width}.png` });
      assert.deepEqual(errors, [], "React/browser errors");
      assert.ok(mutations.every(request => request === "POST /api/miauby/carrinho"), "Only the explicitly aborted cart background notice may attempt a write");
      assert.deepEqual(blockedExternal, [], "No external network requests should be attempted");
      assert.deepEqual(missingAssets, [], "Local branding and institutional assets must resolve");
      results.push({ width, login: "failure preservation, password visibility and ADMIN redirect via mock", catalog: "compact origin tabs, visible multi-selection and cancel-only bulk preview", home: "three collections of 15 synthetic items with matching generated images and working arrows", overflow: false, networkWrites: 0, abortedBackgroundWrites: mutations, externalRequests: 0, browserErrors: 0 });
      await context.close();
    }
    await fs.writeFile(`${output}/ui-audit.json`, `${JSON.stringify({ synthetic: true, frameworkMocks: ["next/image", "next/link", "next/navigation", "next-auth/react"], dataMocks: ["whatsappTestimonials=[]"], cssFiles, results }, null, 2)}\n`);
    console.log(JSON.stringify({ output, results }));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
