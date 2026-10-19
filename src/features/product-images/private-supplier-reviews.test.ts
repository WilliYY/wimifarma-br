import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

test("customer review page uses institutional Rx illustration and preserves non-Rx public photos", async () => {
  const bundle = await build({ entryPoints: ["src/app/(site)/minha-conta/avaliacoes/page.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "private-review-fixtures", setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/(image|link|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>({user:{id:'synthetic-customer',role:'CUSTOMER'}});"
      : args.path.endsWith("prisma") ? "export const getPrisma=()=>fixture.db;"
        : args.path === "next/navigation" ? "export function redirect(){throw new Error('Unexpected redirect')}"
          : args.path === "next/image" ? "import React from 'react'; export default props=>React.createElement('img',{src:props.src,alt:props.alt});"
            : "import React from 'react'; export default props=>React.createElement('a',{href:props.href},props.children);" }));
  } }] });
  const base = { name: "Synthetic product", slug: "synthetic", requiresPrescription: false, isPopularPharmacy: false, reviews: [] };
  const products = [
    { ...base, id: "private", imageUrl: "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp", inventorySource: "PHARMACY" },
    { ...base, id: "rx", imageUrl: "/legacy-rx-photo.webp", inventorySource: "DISTRIBUTOR", requiresPrescription: true },
    { ...base, id: "public", imageUrl: "/public-product.webp", inventorySource: "PHARMACY" },
  ];
  const loaded = { exports: {} as { default(context: { searchParams: Promise<object> }): Promise<ReactElement> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL,
    fixture: { db: { customer: { findFirst: async () => ({ id: "synthetic-customer" }) }, product: { findMany: async () => products } } } });
  const html = renderToStaticMarkup(await loaded.exports.default({ searchParams: Promise.resolve({}) }));
  assert.doesNotMatch(html, /api\/admin\/fornecedores\/imagens/);
  assert.doesNotMatch(html, /legacy-rx-photo.webp/);
  assert.match(html, /medicamento-ilustrativo.webp/);
  assert.match(html, /Imagem ilustrativa de medicamento/);
  assert.match(html, /public-product.webp/);
});
