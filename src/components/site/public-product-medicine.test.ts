import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

test("cartão mostra pares completos e mantém nome inalatório no DTO de compra", async () => {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default p=>React.createElement('a',{href:p.href,title:p.title},p.children);",
    "next/image": "export default ()=>null;",
    "@/components/site/product-card-actions": "import React from 'react';export const ProductCardActions=p=>React.createElement('button',{'data-cart-name':p.product.name});",
    "@/components/site/product-cashback": "export const ProductCashback=()=>null;",
    "./catalog-shipping-preview": "export const CatalogShippingButton=()=>null;",
  };
  const bundle = await build({
    entryPoints: ["src/components/site/public-product-card.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "medicine-card", setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx" }));
    } }],
  });
  const loaded = { exports: {} as { PublicProductCard: ComponentType<{ product: unknown }> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url) });
  const base = { id: "synthetic", slug: "synthetic", brand: "Teste", category: "Medicamentos", imageUrl: "/synthetic.webp", price: "10.00", promotionalPrice: null, stock: 5, requiresPrescription: false, isPopularPharmacy: false };
  const render = (name: string, activeIngredients: string[]) => renderToStaticMarkup(createElement(loaded.exports.PublicProductCard, { product: { ...base, name, activeIngredients } }));
  const dorilax = render("Dorilax DT 450 mg + 50 mg + 35 mg 12 comprimidos", ["CITRATO DE ORFENADRINA", "CAFEÍNA ANIDRA", "PARACETAMOL"]);
  assert.match(dorilax, />Paracetamol 450 mg \+ Cafeína anidra 50 mg \+ Citrato de orfenadrina 35 mg<\/span>/);
  assert.doesNotMatch(dorilax, /class="[^"]*(?:truncate|line-clamp)[^"]*"[^>]*>Paracetamol 450 mg/u);
  assert.match(render("Buscoduo 10 mg + 500 mg 20 comprimidos revestidos", ["PARACETAMOL", "BUTILBROMETO DE ESCOPOLAMINA"]), />Butilbrometo de escopolamina 10 mg \+ Paracetamol 500 mg<\/span>/);
  const alenia = render("Alenia 6 mcg + 200 mcg 60 cápsulas dura", ["BUDESONIDA", "FUMARATO DE FORMOTEROL DIIDRATADO"]);
  assert.match(alenia, /data-cart-name="Alenia 6 mcg \+ 200 mcg 60 cápsulas dura · pó para inalação"/);
  assert.doesNotMatch(alenia, /com inalador|refil/iu);
});
