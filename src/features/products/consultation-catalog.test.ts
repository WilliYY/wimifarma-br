import assert from "node:assert/strict";
import test from "node:test";
import type { PublicCatalogIdentity } from "../catalog-identities/types";
import { consultationSearchRecord, mergeConsultationCatalog, paginateConsultationCatalog, searchConsultationCatalog } from "./consultation-catalog";

function identity(ean = "7891800002829", name = "Algodão 50 g"): PublicCatalogIdentity {
  const gtinCanonical = ean.padStart(14, "0");
  return { kind: "CONSULTATION", id: `catalog:${gtinCanonical}`, gtinCanonical, ean, name,
    categoryName: "Higiene e beleza", categorySlug: "higiene-e-beleza", href: `/catalogo/item/${ean}` };
}

test("mixed catalog preserves commercial ordering and paginates after the merge", () => {
  const sales = Array.from({ length: 25 }, (_, i) => ({ id: `sale-${i}`, name: `Produto ${i}`, price: "10.00" }));
  const consultation = identity();
  const page = paginateConsultationCatalog(sales, [consultation], { page: 2, pageSize: 24 });
  assert.equal(page.count, 26);
  assert.deepEqual(page.products.map(item => item.id), ["sale-24", consultation.id]);
  assert.deepEqual(mergeConsultationCatalog(sales, []).map(item => item.id), sales.map(item => item.id));
});

test("canonical GTIN dedupe accepts UPC/EAN zero variants but preserves package indicators", () => {
  const sale = { id: "sale-upc", name: "Unidade", ean: "036000291452", price: "5.00" };
  const duplicate = identity("0036000291452", "Unidade duplicada");
  const packageIdentity = identity("10036000291459", "Caixa distinta");
  const merged = mergeConsultationCatalog([sale], [duplicate, packageIdentity]);
  assert.deepEqual(merged.map(item => item.id), [sale.id, packageIdentity.id]);
});

test("exact barcode consultation takes precedence over unrelated textual commercial matches", () => {
  const consultation = identity();
  const sale = { id: "sale-text", name: "Outro resultado", ean: "7891800002812", price: "7.00" };
  assert.equal(mergeConsultationCatalog([sale], [consultation], { query: consultation.ean })[0].id, consultation.id);
});

test("consultation projection never adds zero price or stock and drops unexpected private fields", () => {
  const consultation = Object.freeze({ ...identity(), sourceRecord: { factoryPriceCents: 99999 }, cost: "999.99" });
  const [projected] = mergeConsultationCatalog([], [consultation]);
  assert.equal("price" in projected, false);
  assert.equal("stock" in projected, false);
  assert.equal("sourceRecord" in projected, false);
  assert.equal("cost" in projected, false);
  assert.equal(JSON.stringify(projected).includes("99999"), false);
});

test("duplicate consultation rows are counted once and malformed barcode projections are excluded", () => {
  const consultation = identity();
  const invalid = { ...consultation, ean: "123", gtinCanonical: "00000000000123" };
  const result = paginateConsultationCatalog([], [consultation, consultation, invalid], { page: 1, pageSize: 24 });
  assert.equal(result.count, 1);
  assert.deepEqual(result.products, [consultation]);
});

test("invalid pagination is bounded without mutating source collections", () => {
  const sales = Object.freeze([{ id: "sale-a", name: "A", price: "1.00" }]);
  const consultations = Object.freeze([Object.freeze(identity())]);
  const result = paginateConsultationCatalog(sales, consultations, { page: Number.NaN, pageSize: 9999 });
  assert.equal(result.count, 2);
  assert.equal(result.products.length, 2);
  assert.equal(sales.length, 1);
  assert.equal(consultations.length, 1);
});

test("public identities are searchable by literal name and canonical barcode without private source fields", () => {
  const item = identity("7891010044985", "ESCOVA DENTAL JOHNSON'S ACCESS REACH MACIA TAMANHO 40 GRANDE");
  assert.deepEqual(searchConsultationCatalog([item], "reach").map(row => row.id), [item.id]);
  assert.deepEqual(searchConsultationCatalog([item], item.gtinCanonical).map(row => row.id), [item.id]);
  assert.equal(consultationSearchRecord(item).name, item.name);
  assert.equal("price" in consultationSearchRecord(item), false);
  assert.deepEqual(searchConsultationCatalog([item], "losartana"), []);
});

test("consultation search does not independently correct a typo or enter clinical topic recommendations", () => {
  const item = identity("7891800002829", "Shampoo sintético");
  assert.deepEqual(searchConsultationCatalog([item], "shampu sintético"), []);
  assert.deepEqual(searchConsultationCatalog([item], "para pressão"), []);
});
