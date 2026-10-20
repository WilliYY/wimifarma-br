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

test("GAM concorre pelo custo final do mesmo EAN sem alterar percentual, cotas ou estoque físico", () => {
  const gam = { ...offer, id: "gam", supplier: "GAM", unitCostCents: 800, reservedQuantity: 1, committedQuantity: 1 };
  const current = { ...product, supplierMarkupBps: 2000, supplierOffers: [offer,
    { ...offer, id: "dm", supplier: "DM", unitCostCents: 900 },
    { ...offer, id: "pf", supplier: "PROFARMA", unitCostCents: 500 }, gam] };
  const before = structuredClone(current);
  const best = resolveSupplierOffer(current, 3, now);
  assert.equal(best?.supplier, "GAM");
  assert.equal(best?.unitPriceCents, 960);
  assert.equal(best?.purchaseLimit, 3);
  assert.equal(resolveSupplierOffer(current, 4, now)?.supplier, "DM");
  for (const patch of [{ eanNormalized: "11234567890125" }, { validUntil: new Date(now) }, { available: false }]) {
    assert.equal(resolveSupplierOffer({ ...current, supplierOffers: [offer, { ...gam, ...patch }] }, 1, now)?.supplier, "ANB");
  }
  const physical = withCommerceAvailability({ ...current, inventorySource: "PHARMACY" }, now);
  assert.equal(physical.price, "99.00");
  assert.equal(physical.stock, 17);
  assert.deepEqual(current, before);
});

test("DM menor custo usa o mesmo markup e preserva o produto físico e a oferta anterior", () => {
  const dm = { ...offer, id: "dm", supplier: "DM", unitCostCents: 900 };
  const current = { ...product, supplierOffers: [offer, dm] };
  const before = structuredClone(current);
  assert.equal(resolveSupplierOffer(current, 1, now)?.supplier, "DM");
  const dto = withCommerceAvailability(current, now);
  assert.equal(dto.price, "14.40");
  assert.equal(dto.stock, 17);
  assert.equal("supplierOffers" in dto, false);
  assert.deepEqual(current, before);
  for (const changes of [{ eanNormalized: "11234567890125" }, { validUntil: new Date(now) },
    { retailCeilingCents: 1439 }, { available: false }, { stockQuantity: 0 }]) {
    assert.equal(resolveSupplierOffer({ ...current, supplierOffers: [offer, { ...dm, ...changes }] }, 1, now)?.supplier, "ANB");
  }
  const physical = withCommerceAvailability({ ...current, inventorySource: "PHARMACY" }, now);
  assert.equal(physical.stock, 17);
  assert.equal(physical.price, "99.00");
  assert.equal(physical.promotionalPrice, "98.00");
});

test("DTO público oculta custos e imagem interna, preservando estoque físico", () => {
  const dto = withCommerceAvailability({ ...product, requiresPrescription: true, imageUrl: "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp", imageAsset: { id: "img" } }, now);
  assert.equal(dto.stock, 17);
  assert.equal(dto.price, "16.00");
  assert.equal(dto.promotionalPrice, null);
  assert.equal(dto.purchaseLimit, 999);
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
  assert.equal(dto.purchaseLimit, 999);
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

test("medicamento Profarma sem ST perde para oferta válida do mesmo EAN", () => {
  const pf = { ...offer, id: "pf", supplier: "PROFARMA", unitCostCents: 500 };
  const medicine = { ...product, requiresPrescription: true, supplierOffers: [pf, offer] };
  assert.equal(resolveSupplierOffer(medicine, 1, now)?.supplier, "ANB");
  for (const substitutionTaxCents of [null, undefined, -1, 0.5, NaN]) {
    assert.equal(resolveSupplierOffer({ ...medicine, supplierOffers: [{ ...pf, substitutionTaxCents }] }, 1, now), null);
  }
  for (const substitutionTaxCents of [0, 95]) {
    const approved = resolveSupplierOffer({ ...medicine, supplierOffers: [{ ...pf, substitutionTaxCents }, offer] }, 1, now);
    assert.equal(approved?.supplier, "PROFARMA");
    assert.equal(approved?.unitPriceCents, 800); // Final cost already includes ST.
  }
  assert.equal(resolveSupplierOffer({ ...medicine, supplierOffers: [{ ...pf, substitutionTaxCents: 95, eanNormalized: "11234567890125" }, offer] }, 1, now)?.supplier, "ANB");
  const dto = withCommerceAvailability({ ...medicine, supplierOffers: [pf] }, now);
  assert.equal(dto.availableForPurchase, false);
  assert.equal("substitutionTaxCents" in dto, false);
});

test("trava de ST inclui MIP e preserva perfumaria, fraldas e estoque físico", () => {
  const pf = { ...offer, id: "pf", supplier: "PROFARMA" };
  const classification = { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true };
  assert.equal(resolveSupplierOffer({ ...product, catalogClassification: classification, supplierOffers: [pf] }, 1, now), null);
  for (const kind of ["PERFUMERY", "HYGIENE"]) {
    assert.equal(resolveSupplierOffer({ ...product, catalogClassification: { ...classification, kind, medicineClass: "UNCLASSIFIED", otc: false }, supplierOffers: [pf] }, 1, now)?.supplier, "PROFARMA");
  }
  const physical = withCommerceAvailability({ ...product, inventorySource: "PHARMACY", requiresPrescription: true, supplierOffers: [pf] }, now);
  assert.equal(physical.stock, 17);
  assert.equal(physical.price, "99.00");
  assert.equal(physical.availableForPurchase, true);
});

test("classe ausente, incompleta ou inválida não comprova dispensa de ST", () => {
  const pf = { ...offer, supplier: "PROFARMA" };
  for (const catalogClassification of [null, undefined, { kind: "MEDICINE" }, { kind: "PERFUMERY" }, { kind: "UNCLASSIFIED", medicineClass: "UNCLASSIFIED", ethical: false, otc: false }]) {
    assert.equal(resolveSupplierOffer({ ...product, catalogClassification, supplierOffers: [pf] }, 1, now), null);
  }
});
