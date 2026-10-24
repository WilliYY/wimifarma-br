import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import type { ProductCashback as ProductCashbackComponent } from "@/components/site/product-cashback";
import { productCashbackCents } from "./rules";

test("cashback de compra Rx elegivel nao cria selo promocional publico", async () => {
  const loaded = { exports: {} as { ProductCashback: typeof ProductCashbackComponent } };
  const bundle = await build({ entryPoints: ["src/components/site/product-cashback.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url) });
  const { ProductCashback } = loaded.exports;
  const product = { cashbackEnabled: true, cashbackRateBps: 100, requiresPrescription: true, prescriptionType: "ORDINARY",
    catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false } };
  assert.equal(productCashbackCents(product, 2000), 20);
  for (const variant of [{}, { compact: true }, { details: true }]) {
    assert.equal(renderToStaticMarkup(createElement(ProductCashback, { product, unitPriceCents: 2000, ...variant })), "");
  }
  const ordinaryMerchandise = { cashbackEnabled: true, cashbackRateBps: 200, requiresPrescription: false };
  assert.match(renderToStaticMarkup(createElement(ProductCashback, { product: ordinaryMerchandise, unitPriceCents: 2000 })), /cashback/);
});
