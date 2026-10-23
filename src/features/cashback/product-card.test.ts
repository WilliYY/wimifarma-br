import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import type { CashbackListProduct } from "./client";

const bundle = build({ entryPoints: ["src/components/admin/cashback-product-card.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
const product: CashbackListProduct = { id: "synthetic", name: "Synthetic", brand: null, imageUrl: null, status: "ACTIVE", price: "36.90", promotionalPrice: null,
  cashbackEnabled: true, cashbackRateBps: 200, updatedAt: "2026-10-23T12:00:00.000Z", requiresPrescription: false, isPopularPharmacy: false };

async function render(extra: Partial<CashbackListProduct>) {
  const loaded = { exports: {} as { CashbackProductCard: ComponentType<{ product: CashbackListProduct; disabled: boolean; saving: boolean; onSave: () => Promise<boolean> }> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), console });
  return renderToStaticMarkup(createElement(loaded.exports.CashbackProductCard, { product: { ...product, ...extra }, disabled: false, saving: false, onSave: async () => true }));
}

test("cashback sem oferta mostra preço indisponível sem valor zero/histórico e permite configurar", async () => {
  for (const price of [null, "36.90"]) {
    const html = await render({ price, priceAvailable: false });
    assert.match(html, /Preço indisponível/);
    assert.match(html, /Sem preço atual/);
    assert.doesNotMatch(html, /R\$|36,90/);
    assert.doesNotMatch(html.match(/<select[^>]*>/)?.[0] ?? "", /\sdisabled(?:=|\s|>)/);
  }
});

test("cashback calcula somente o preço efetivo e preserva promoção física", async () => {
  const distributor = await render({ price: "24.34", priceAvailable: true });
  assert.match(distributor, /24,34/); assert.match(distributor, /0,49/);
  const pharmacy = await render({ price: "20.50", promotionalPrice: "15.12" });
  assert.match(pharmacy, /15,12/); assert.match(pharmacy, /0,30/);
});
