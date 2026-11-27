import assert from "node:assert/strict";
import test from "node:test";
import { resolveSupplierOffer, toSaleProduct } from "./commerce";
import { MAX_ORDER_ITEM_QUANTITY, orderQuantityLimit } from "@/features/products/quantity";

const now = Date.parse("2026-10-19T18:00:00Z");
const offer = { id: "offer", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 100, retailCeilingCents: 1000, available: true, stockQuantity: 100, allocationQuantity: 5, reservedQuantity: 8, committedQuantity: 15, observedAt: new Date(now - 1000), validUntil: new Date(now + 60000) };
const product = { inventorySource: "DISTRIBUTOR" as const, ean: "1234567890128", stock: 3, price: "9.00", supplierOffers: [offer] };

test("política autorizada aceita demanda maior que cota e quantidade observada sem inventar saldo físico", () => {
  const selected = resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, 150, now);
  assert.ok(selected);
  assert.equal(selected.purchaseLimit, MAX_ORDER_ITEM_QUANTITY);
  assert.equal(selected.stockQuantity, 100);
  assert.equal(selected.reservedQuantity, 8);
  assert.equal(resolveSupplierOffer(product, 150, now), null);
  const sale = toSaleProduct(product, now);
  assert.equal(sale.supplierDemandAllowed, true);
  assert.equal(orderQuantityLimit(sale), MAX_ORDER_ITEM_QUANTITY);
  assert.equal(product.stock, 3);
  const zeroStock = { ...product, supplierOffers: [{ ...offer, stockQuantity: 0 }] };
  assert.equal(toSaleProduct(zeroStock, now).availableForPurchase, true);
  assert.equal(resolveSupplierOffer(zeroStock, 1, now), null);
});

test("demanda exige oferta aprovada, compatível com o EAN e com o teto de venda", () => {
  for (const changes of [{ available: false }, { validUntil: offer.observedAt }, { observedAt: new Date(now + 1) }, { eanNormalized: "11234567890125" }, { retailCeilingCents: 159 }, { stockQuantity: -1 }]) {
    assert.equal(resolveSupplierOffer({ ...product, requiresPrescription: true, supplierDemandAllowed: true, supplierOffers: [{ ...offer, ...changes }] }, 50, now), null);
  }
  assert.equal(resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, Infinity, now), null);
  assert.equal(resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, MAX_ORDER_ITEM_QUANTITY + 1, now), null);
  assert.equal(orderQuantityLimit({ stock: 3, inventorySource: "PHARMACY", supplierDemandAllowed: true }), 3);
});
