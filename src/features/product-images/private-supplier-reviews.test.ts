import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const bundlePromise = build({ entryPoints: ["src/app/(site)/minha-conta/avaliacoes/page.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "private-review-fixtures", setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/(image|link|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>fixture.session;"
      : args.path.endsWith("prisma") ? "export const getPrisma=()=>fixture.db;"
        : args.path === "next/navigation" ? "export function redirect(url){throw new Error('Redirect: '+url)} export const useRouter=()=>({refresh(){}});"
          : args.path === "next/image" ? "import React from 'react'; export default props=>React.createElement('img',{src:props.src,alt:props.alt});"
            : "import React from 'react'; export default props=>React.createElement('a',{href:props.href},props.children);" }));
  } }] });

const base = { name: "Synthetic product", slug: "synthetic", requiresPrescription: false, isPopularPharmacy: false, reviews: [] as { id: string; rating: number; comment: string }[], imageUrl: "/public-product.webp", inventorySource: "PHARMACY" };
type ProductFixture = typeof base & { id: string };

async function renderPage(products: ProductFixture[], params: { page?: string; produto?: string } = {}, options: { session?: object | null; active?: boolean } = {}) {
  const bundle = await bundlePromise;
  const calls: { customer?: unknown; products?: unknown; productQueries: number } = { productQueries: 0 };
  const loaded = { exports: {} as { default(context: { searchParams: Promise<object> }): Promise<ReactElement> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL,
    fixture: { session: "session" in options ? options.session : { user: { id: "synthetic-customer", role: "CUSTOMER" } }, db: {
      customer: { findFirst: async (query: unknown) => { calls.customer = query; return options.active === false ? null : { id: "synthetic-customer" }; } },
      product: { findMany: async (query: unknown) => { calls.products = query; calls.productQueries++; return products; } },
    } } });
  const html = renderToStaticMarkup(await loaded.exports.default({ searchParams: Promise.resolve(params) }));
  return { html, calls };
}

test("customer review page uses institutional Rx illustration and preserves non-Rx public photos", async () => {
  const products = [
    { ...base, id: "private", imageUrl: "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp", inventorySource: "PHARMACY" },
    { ...base, id: "rx", imageUrl: "/legacy-rx-photo.webp", inventorySource: "DISTRIBUTOR", requiresPrescription: true },
    { ...base, id: "public", imageUrl: "/public-product.webp", inventorySource: "PHARMACY" },
  ];
  const { html } = await renderPage(products);
  assert.doesNotMatch(html, /api\/admin\/fornecedores\/imagens/);
  assert.doesNotMatch(html, /legacy-rx-photo.webp/);
  assert.match(html, /medicamento-ilustrativo.webp/);
  assert.match(html, /Imagem ilustrativa de medicamento/);
  assert.match(html, /public-product.webp/);
});

test("review page requires a customer session and an active customer", async () => {
  await assert.rejects(renderPage([], {}, { session: null }), /Redirect: \/login\?callbackUrl=%2Fminha-conta%2Favaliacoes/);
  await assert.rejects(renderPage([], {}, { session: { user: { id: "synthetic-staff", role: "ADMIN" } } }), /Redirect: \/login\?callbackUrl=/);
  await assert.rejects(renderPage([], {}, { active: false }), /Redirect: \/login$/);
});

test("review page keeps customer and paid completed purchase filters, own review data and pagination", async () => {
  const products = Array.from({ length: 25 }, (_, index) => ({ ...base, id: `product-${index}` }));
  const { html, calls } = await renderPage(products, { page: "2" });
  const query = JSON.parse(JSON.stringify(calls.products));
  assert.deepEqual(JSON.parse(JSON.stringify(calls.customer)), { where: { id: "synthetic-customer", status: "ACTIVE" }, select: { id: true } });
  assert.deepEqual(query.where, { status: "ACTIVE", orderItems: { some: { order: { customerId: "synthetic-customer", status: "COMPLETED", paymentStatus: "PAID" } } } });
  assert.deepEqual(query.select.reviews, { where: { customerId: "synthetic-customer" }, select: { id: true, rating: true, comment: true } });
  assert.equal(query.skip, 24);
  assert.equal(query.take, 25);
  assert.match(html, /href="\?page=1"/);
  assert.match(html, /href="\?page=3"/);
  assert.match(html, /href="\/minha-conta\/avaliacoes\?page=2&amp;produto=product-0#avaliar"/);
  assert.doesNotMatch(html, /produto=product-24|#avaliacoes|<form/);
});

test("only a selected visible purchased product opens one form with first-review bonus", async () => {
  const { html, calls } = await renderPage([{ ...base, id: "chosen", name: "Selected synthetic product" }, { ...base, id: "other" }], { produto: "chosen" });
  assert.equal((html.match(/<form/g) ?? []).length, 1);
  assert.match(html, /id="avaliar"/);
  assert.match(html, /Selected synthetic product/);
  assert.match(html, /Ganhe 1% de cashback/);
  assert.match(html, /Publicar avaliacao/);
  assert.equal(calls.productQueries, 1);
});

test("arbitrary and next-page product IDs cannot open a form", async () => {
  const products = Array.from({ length: 25 }, (_, index) => ({ ...base, id: `product-${index}` }));
  for (const produto of ["not-purchased", "product-24"]) {
    const { html, calls } = await renderPage(products, { produto });
    assert.doesNotMatch(html, /<form|id="avaliar"/);
    assert.equal(calls.productQueries, 1);
  }
});

test("editing the customer's review pre-fills comment and rating without another bonus", async () => {
  const { html } = await renderPage([{ ...base, id: "reviewed", reviews: [{ id: "own-review", rating: 3, comment: "Minha experiencia sintetica" }] }], { produto: "reviewed" });
  assert.match(html, /Atualize sua avaliacao/);
  assert.match(html, /Minha experiencia sintetica<\/textarea>/);
  assert.equal((html.match(/fill-amber-400/g) ?? []).length, 3);
  assert.match(html, /Salvar alteracoes/);
  assert.doesNotMatch(html, /Ganhe 1% de cashback/);
});

test("Rx and Popular Pharmacy selected products remain reviewable without a bonus", async () => {
  for (const restrictions of [{ requiresPrescription: true }, { isPopularPharmacy: true }]) {
    const { html } = await renderPage([{ ...base, ...restrictions, id: "restricted-bonus" }], { produto: "restricted-bonus" });
    assert.match(html, /Publicar avaliacao/);
    assert.doesNotMatch(html, /Ganhe 1% de cashback/);
  }
});
