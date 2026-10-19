import assert from "node:assert/strict";
import test from "node:test";
import { gtinVariants, normalizeGtin, resolveSupplierOffer, withCommerceAvailability } from "./commerce";

const now = Date.parse("2026-10-17T15:00:00Z");
const offer = { id: "offer-a", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 1000, retailCeilingCents: 2000, available: true, stockQuantity: null, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 1000), validUntil: new Date(now + 1000) };
const product = { inventorySource: "DISTRIBUTOR" as const, ean: "1234567890128", eanNormalized: offer.eanNormalized, stock: 17, price: "99.00", promotionalPrice: "98.00", supplierOffers: [offer] };

test("normaliza GTIN válido sem misturar apresentações de embalagem", () => {
  assert.equal(normalizeGtin("1234567890128"), "01234567890128");
  assert.equal(normalizeGtin("1234567890129"), null);
  assert.equal(normalizeGtin("abc1234567890128"), null);
  assert.deepEqual(gtinVariants("1234567890128"), ["1234567890128", "01234567890128"]);
  assert.deepEqual(gtinVariants("11234567890125"), ["11234567890125"]);
});

test("resolve menor custo elegível e respeita cota, saldo real e validade", () => {
  assert.equal(resolveSupplierOffer(product, 5, now)?.unitPriceCents, 1600);
  assert.equal(resolveSupplierOffer(product, 6, now), null);
  for (const changes of [{ available: false }, { stockQuantity: 0 }, { reservedQuantity: 5 }, { committedQuantity: 5 }, { observedAt: new Date(now + 1) }, { validUntil: new Date(now) }, { eanNormalized: "11234567890125" }, { unitCostCents: -1 }]) {
    assert.equal(resolveSupplierOffer({ ...product, supplierOffers: [{ ...offer, ...changes }] }, 1, now), null);
  }
  const best = resolveSupplierOffer({ ...product, supplierOffers: [{ ...offer, id: "b", supplier: "PROFARMA" }, { ...offer, id: "a", supplier: "ANB" }] }, 1, now);
  assert.equal(best?.id, "a");
});

test("DTO público oculta custos e imagem interna, preservando estoque físico", () => {
  const dto = withCommerceAvailability({ ...product, requiresPrescription: true, imageUrl: "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp", imageAsset: { id: "img" } }, now);
  assert.equal(dto.stock, 17);
  assert.equal(dto.price, "16.00");
  assert.equal(dto.promotionalPrice, null);
  assert.equal(dto.purchaseLimit, 5);
  assert.equal(dto.availableForPurchase, true);
  assert.equal(dto.imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.equal(dto.imageAsset, null);
  assert.equal("supplierOffers" in dto, false);
  const expired = withCommerceAvailability(product, now + 2000);
  assert.equal(expired.purchaseLimit, 0);
  assert.equal(expired.availableForPurchase, false);
});

test("foto pública Rx permanece interna e o DTO usa ilustração sem alterar compra", () => {
  const dto = withCommerceAvailability({ ...product, requiresPrescription: true, imageUrl: "/uploads/products/approved.webp", imageAsset: { originalName: "internal-source.png" } }, now);
  assert.equal(dto.imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.equal(dto.imageAsset, null);
  assert.equal(dto.price, "16.00");
  assert.equal(dto.purchaseLimit, 5);
});

test("produto físico legado mantém preço e estoque", () => {
  const dto = withCommerceAvailability({ stock: 3, price: "10.00", promotionalPrice: "9.00" }, now);
  assert.equal(dto.price, "10.00");
  assert.equal(dto.promotionalPrice, "9.00");
  assert.equal(dto.stock, 3);
  assert.equal(dto.purchaseLimit, 3);
  assert.equal(dto.inventorySource, "PHARMACY");
});

test("receita exige teto CMED e não vende quando o acréscimo ultrapassa o limite",()=>{
  assert.equal(resolveSupplierOffer({...product,requiresPrescription:true,supplierOffers:[{...offer,retailCeilingCents:null}]},1,now),null);
  assert.equal(resolveSupplierOffer({...product,requiresPrescription:true,supplierOffers:[{...offer,retailCeilingCents:1599}]},1,now),null);
  assert.equal(resolveSupplierOffer({...product,requiresPrescription:true},1,now)?.unitPriceCents,1600);
});
