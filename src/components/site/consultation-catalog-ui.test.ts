import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const item = {
  kind: "CONSULTATION", id: "catalog:07890000000004", gtinCanonical: "07890000000004",
  ean: "7890000000004", name: "Absorvente sintético 40GRANDE", categoryName: "Higiene",
  categorySlug: "higiene", href: "/catalogo/item/7890000000004",
};

async function load(file: string, extras: Record<string, string> = {}) {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=>React.createElement('a',props,children);",
    "next/navigation": "export function notFound(){throw new Error('NOT_FOUND_TEST')}",
    "./public-product-card": "export function PublicProductCard(){throw new Error('COMMERCIAL_CARD_REACHED')}",
    "@/features/catalog-identities/public-query": `export async function getPublicCatalogIdentityByGtin(){return ${JSON.stringify(item)}}`,
    ...extras,
  };
  const bundle = await build({
    entryPoints: [file], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "consultation-ui", setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
    } }],
  });
  const loaded = { exports: {} as Record<string, (props: Record<string, unknown>) => ReactElement | Promise<ReactElement>> };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, URLSearchParams,
  });
  return loaded.exports;
}

function assertConsultation(html: string) {
  assert.ok(html.includes(item.name), "preserves literal package name, including 40GRANDE");
  assert.ok(html.includes(item.ean));
  assert.ok(html.includes("Preço e disponibilidade sob consulta"));
  assert.ok(html.includes("Foto indisponível"));
  assert.doesNotMatch(html, /R\$|Adicionar|cashback|frete|parcelamento|schema.org|itemprop="offers"|<img/);
}

test("consultation cards bypass commercial cards, including topic searches", async () => {
  const card = await load("src/components/site/catalog-product-card.tsx");
  for (const topicSearch of [true, false]) {
    const html = renderToStaticMarkup(await card.CatalogProductCard({ product: item, topicSearch }));
    assertConsultation(html);
    assert.ok(html.includes(`href="${item.href}"`));
  }
});

test("search suggestions show consultation identity without a fabricated offer", async () => {
  const search = await load("src/components/site/product-search-results.tsx");
  const html = renderToStaticMarkup(await search.ProductSearchResults({
    activeId: item.id, error: null, id: "proof", isLoading: false,
    onActiveChange() {}, onChoose() {}, optionIdPrefix: "proof-option",
    products: [item], query: "sintético", relatedProducts: [],
  }));
  assertConsultation(html);
  assert.ok(html.includes('role="option"'));
  assert.ok(html.includes(`href="${item.href}"`));
});

test("consultation detail offers contact with exact identity and no commercial claims", async () => {
  const detail = await load("src/app/(site)/catalogo/item/[ean]/page.tsx");
  const html = renderToStaticMarkup(await detail.default({ params: Promise.resolve({ ean: item.ean }) }));
  assertConsultation(html);
  assert.ok(html.includes("https://wa.me/"));
  assert.ok(html.includes(encodeURIComponent(item.name)));
});

test("consultation detail returns notFound when public reader denies identity", async () => {
  const detail = await load("src/app/(site)/catalogo/item/[ean]/page.tsx", {
    "@/features/catalog-identities/public-query": "export async function getPublicCatalogIdentityByGtin(){return null}",
  });
  await assert.rejects(async () => detail.default({ params: Promise.resolve({ ean: item.ean }) }), /NOT_FOUND_TEST/);
});
