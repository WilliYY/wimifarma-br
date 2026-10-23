import assert from "node:assert/strict";
import test from "node:test";
import { toSaleProduct } from "../supplier-catalog/commerce";

const now = Date.parse("2026-10-23T20:00:00Z");
const catalogClassification = { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false };
const reference = {
  version: 1, eanNormalized: "07896181915638", product: "MEDICAMENTO SINTÉTICO",
  presentation: "50 MG COM CT BL AL X 30", laboratory: "LABORATÓRIO SINTÉTICO", registration: "1234567890123",
  sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file",
  sourceSha256: "a".repeat(64), publishedOn: "2026-10-09", observedAt: "2026-10-23T19:00:00Z",
  rates: [{ label: "PMC 0 %", cents: 1000 }, { label: "PMC 19,5 %", cents: 1250 }],
};

test("CMED is a separate public reference and never replaces the pharmacy price or stock", () => {
  const product = { ean: "7896181915638", stock: 3, price: "6.87", promotionalPrice: "6.00", catalogClassification, cmedReference: reference };
  const sale = toSaleProduct(product, now);
  assert.equal(sale.pmcReference?.amountCents, 1000);
  assert.equal(sale.price, "6.87");
  assert.equal(sale.promotionalPrice, "6.00");
  assert.equal(sale.stock, 3);
  assert.equal("cmedReference" in sale, false);
  assert.doesNotMatch(JSON.stringify(sale), /sourceSha256|eanNormalized/);
});

test("CMED is discarded on EAN mismatch or stale edition without changing purchase data", () => {
  for (const cmedReference of [{ ...reference, eanNormalized: "07896004708539" }, { ...reference, publishedOn: "2026-08-01" }]) {
    const sale = toSaleProduct({ ean: "7896181915638", stock: 2, price: "6.87", catalogClassification, cmedReference }, now);
    assert.equal(sale.pmcReference, null);
    assert.equal(sale.price, "6.87");
    assert.equal(sale.stock, 2);
    assert.equal("cmedReference" in sale, false);
  }
});

test("CMED does not change the supplier markup, purchase limit or private offer boundary", () => {
  const sale = toSaleProduct({ ean: "7896181915638", stock: 99, price: "7.50", inventorySource: "DISTRIBUTOR",
    supplierMarkupBps: 5000, requiresPrescription: false, catalogClassification, cmedReference: reference,
    supplierOffers: [{ id: "synthetic-offer", supplier: "ANB", eanNormalized: "07896181915638", unitCostCents: 200,
      available: true, stockQuantity: 7, allocationQuantity: 5, reservedQuantity: 1, committedQuantity: 0,
      observedAt: "2026-10-23T18:00:00Z", validUntil: "2026-10-24T18:00:00Z" }],
  }, now);
  assert.equal(sale.price, "3.00");
  assert.equal(sale.pmcReference?.amountCents, 1000);
  assert.equal(sale.availableForPurchase, true);
  assert.doesNotMatch(JSON.stringify(sale), /unitCostCents|supplierOffers|supplierMarkupBps|sourceSha256/);
});

test("CMED is hidden after reclassification or entry into Popular without changing prices", () => {
  for (const patch of [{ catalogClassification: { kind: "HYGIENE" } }, { catalogClassification: null }, { isPopularPharmacy: true }]) {
    const sale = toSaleProduct({ ean: "7896181915638", stock: 2, price: "6.87", catalogClassification, cmedReference: reference, ...patch }, now);
    assert.equal(sale.pmcReference, null);
    assert.equal(sale.price, "6.87");
    assert.equal(sale.stock, 2);
  }
});
