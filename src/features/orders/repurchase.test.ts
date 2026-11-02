import assert from "node:assert/strict";
import test from "node:test";
import type { CartItem, CartProduct } from "@/components/site/cart-provider";
import { createRepurchasePlan, type RepurchaseItem } from "./repurchase";
import { requestCartProducts } from "@/features/products/cart-review";

const product: CartProduct = { id: "synthetic-product", name: "Produto atual", slug: "produto-atual", category: null, imageUrl: null, unitPriceCents: 899, originalPriceCents: null, stock: 10, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
const source: RepurchaseItem = { productId: product.id, productName: "Produto antigo", quantity: 4 };

test("repurchase uses current products and groups repeated IDs without mutating history or cart", () => {
  const history = [{ ...source }, { ...source, quantity: 2 }];
  const cart: CartItem[] = [{ ...product, unitPriceCents: 100, quantity: 1 }];
  const plan = createRepurchasePlan(history, [product], cart);
  assert.deepEqual(plan.additions, [{ product, quantity: 6 }]);
  assert.equal(plan.additions[0].product.unitPriceCents, 899);
  assert.equal(cart[0].unitPriceCents, 100);
  assert.equal(cart[0].quantity, 1);
  assert.equal(history[0].quantity, 4);
  assert.deepEqual(plan.notices, []);
});

test("missing links and deleted products never match a product by historical name", () => {
  const plan = createRepurchasePlan([{ ...source, productId: null }, { ...source, productId: "deleted" }], [{ ...product, name: source.productName }], []);
  assert.deepEqual(plan.additions, []);
  assert.equal(plan.notices.length, 2);
  assert.match(plan.notices[0].message, /vínculo/i);
  assert.match(plan.notices[1].message, /indisponível/i);
});

test("current restrictions block controlled, unreviewed prescription and Popular Pharmacy products", () => {
  for (const current of [
    { ...product, prescriptionType: "CONTROLLED" as const },
    { ...product, requiresPrescription: true },
    { ...product, isPopularPharmacy: true },
  ]) {
    const plan = createRepurchasePlan([source], [current], []);
    assert.deepEqual(plan.additions, []);
    assert.match(plan.notices[0].message, /assistido/i);
  }
  for (const prescriptionType of ["ORDINARY", "ANTIMICROBIAL"] as const) {
    assert.equal(createRepurchasePlan([source], [{ ...product, requiresPrescription: true, prescriptionType }], []).additions.length, 1);
  }
});

test("stock and quantities already in cart reduce only the additional quantity", () => {
  const plan = createRepurchasePlan([source], [{ ...product, stock: 5 }], [{ ...product, quantity: 3 }]);
  assert.equal(plan.additions[0].quantity, 2);
  assert.match(plan.notices[0].message, /reduzida/i);
  const full = createRepurchasePlan([source], [{ ...product, stock: 3 }], [{ ...product, quantity: 3 }]);
  assert.equal(full.additions.length, 0);
  assert.equal(full.notices.length, 1);
  for (const inventorySource of ["PHARMACY", "DISTRIBUTOR"] as const) {
    const empty = createRepurchasePlan([source], [{ ...product, stock: 0, inventorySource, supplierDemandAllowed: true }], []);
    assert.equal(empty.additions.length, 0);
    assert.match(empty.notices[0].message, /estoque/i);
  }
});

test("quantity policy preserves current 999 ceiling and supplier demand permission", () => {
  for (const current of [product, { ...product, inventorySource: "DISTRIBUTOR" as const, supplierDemandAllowed: false }]) {
    assert.equal(createRepurchasePlan([{ ...source, quantity: 40 }], [current], []).additions[0].quantity, 10);
  }
  const supplier = { ...product, inventorySource: "DISTRIBUTOR" as const, supplierDemandAllowed: true, stock: 1 };
  assert.equal(createRepurchasePlan([{ ...source, quantity: 40 }], [supplier], []).additions[0].quantity, 40);
  assert.equal(createRepurchasePlan([{ ...source, quantity: 1100 }], [supplier], [{ ...supplier, quantity: 2 }]).additions[0].quantity, 997);
  assert.equal(createRepurchasePlan([{ ...source, quantity: 1100 }], [{ ...product, stock: 2000 }], []).additions[0].quantity, 999);
});

test("thirty cart types still allow additions to existing products and cap newly planned types", () => {
  const cart = Array.from({ length: 30 }, (_, i) => ({ ...product, id: `existing-${i}`, quantity: 1 }));
  const existing = { ...product, id: cart[0].id };
  const plan = createRepurchasePlan([source, { ...source, productId: existing.id }], [product, existing], cart);
  assert.deepEqual(plan.additions, [{ product: existing, quantity: 4 }]);
  assert.match(plan.notices[0].message, /30/);
  const other = { ...product, id: "other" };
  const next = createRepurchasePlan([source, { ...source, productId: other.id }], [product, other], cart.slice(0, 29));
  assert.equal(next.additions.length, 1);
  assert.equal(next.notices.length, 1);
});

test("product lookup sends only IDs, supports cancellation and rejects tampered responses", async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await requestCartProducts([product.id], async (url, init) => {
    assert.equal(url, "/api/carrinho/revisao");
    assert.equal(init?.signal, signal);
    assert.equal(init?.cache, "no-store");
    assert.deepEqual(JSON.parse(String(init?.body)), { productIds: [product.id] });
    return Response.json({ data: { products: [product] } });
  }, signal), [product]);
  for (const products of [[product, product], [{ ...product, id: "unsolicited" }], [{ ...product, unitPriceCents: -1 }], [{ ...product, prescriptionType: "UNKNOWN" }]]) {
    await assert.rejects(requestCartProducts([product.id], async () => Response.json({ data: { products } })), /Não foi possível revisar o carrinho/);
  }
  await assert.rejects(requestCartProducts([product.id], async () => { throw new Error("private"); }), /Não foi possível revisar o carrinho/);
  assert.deepEqual(await requestCartProducts([product.id], async () => Response.json({ data: { products: [] } })), []);
});
