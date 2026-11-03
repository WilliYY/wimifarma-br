import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { build } from "esbuild";

test("cards identify one commercial package while preserving price and cart quantity", async () => {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=>React.createElement('a',props,children);",
    "next/image": "export default ()=>null;",
    "@/components/site/product-image-placeholder": "export const ProductImagePlaceholder=()=>null;",
    "@/components/site/product-card-actions": "import React from 'react';export const ProductCardActions=({product})=>React.createElement('div',{'data-price':product.unitPriceCents,'data-stock':product.stock});",
    "@/components/site/product-cashback": "export const ProductCashback=()=>null;",
    "./catalog-shipping-preview": "export const CatalogShippingButton=()=>null;",
  };
  const bundle = await build({
    entryPoints: ["src/components/site/public-product-card.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "multipack-card", setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx" }));
    } }],
  });
  const loaded = { exports: {} as { PublicProductCard(props: { product: unknown }): ReactElement } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url) });
  const base = { id: "synthetic", slug: "synthetic", brand: "Marca sintética", category: "Higiene", imageUrl: null, price: "12.00", promotionalPrice: null, activeIngredients: [], searchTerms: [], requiresPrescription: false, prescriptionType: "UNREVIEWED", stock: 4, isPopularPharmacy: false };
  for (const [name, label] of [
    ["Sabonete Protex BALANCE SAUDAVEL85gL6P5", "Para 1 pacote com 6 barras."],
    ["Esmalte Colorama Gabriele caixa com 6 frascos de 8 ml", "Para 1 caixa com 6 frascos."],
    ["Absorvente Intimus Leve8Pague7", "Para 1 pacote com 8 absorventes."],
    ["Sabonete sintético 85g", "Para 1 unidade."],
  ]) {
    const html = renderToStaticMarkup(loaded.exports.PublicProductCard({ product: { ...base, name } }));
    assert.ok(html.includes(label), label);
    assert.match(html, /data-price="1200" data-stock="4"/);
  }
});
