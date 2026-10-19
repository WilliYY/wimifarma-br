import assert from "node:assert/strict";
import test from "node:test";
import { medicineIllustrationUrl, productImageAlt } from "./image-placeholder";
import { buildMiaubySystemPrompt, miaubyReplyProducts, rankMiaubyCatalogProducts } from "../miauby/assistant";
import { publicProductImageUrl, publicProductImageUrls } from "../product-images/private-supplier-policy";
import { toSaleProduct } from "../supplier-catalog/commerce";

const photo = "/uploads/products/synthetic-real.webp";
const privateUrl = "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp";
const classification = (medicineClass: string, ethical = false) => ({ kind: "MEDICINE", medicineClass, ethical, otc: false });

test("retained-prescription illustrations use an explicit type without changing medicine class or purchase rules", () => {
  for (const [prescriptionType, asset] of [["ANTIMICROBIAL", "antibiotico"], ["CONTROLLED", "controlado"]]) {
    const raw = { requiresPrescription: true, prescriptionType, imageUrl: photo, catalogClassification: classification("GENERIC") };
    const expected = `/brand/medicamento-${asset}-ilustrativo.webp`;
    assert.equal(medicineIllustrationUrl(raw), expected);
    assert.equal(publicProductImageUrl(raw), expected);
    assert.match(productImageAlt("Produto sintético", expected), /Imagem ilustrativa/);
    assert.equal(raw.catalogClassification.medicineClass, "GENERIC");
  }
  assert.equal(medicineIllustrationUrl({ requiresPrescription: true, prescriptionType: "ORDINARY", catalogClassification: classification("GENERIC") }), "/brand/medicamento-sem-foto.webp");
});

test("institutional illustrations use explicit class, never brand or ethical as reference", () => {
  for (const [medicineClass, expected] of [["GENERIC", "medicamento-sem-foto"], ["SIMILAR", "medicamento-similar-ilustrativo"], ["REFERENCE", "medicamento-etico-ilustrativo"], ["UNCLASSIFIED", "medicamento-ilustrativo"]]) {
    assert.equal(medicineIllustrationUrl({ catalogClassification: classification(medicineClass) }), `/brand/${expected}.webp`);
  }
  assert.equal(medicineIllustrationUrl({ catalogClassification: classification("UNCLASSIFIED", true) }), "/brand/medicamento-etico-ilustrativo.webp");
  assert.equal(medicineIllustrationUrl({ catalogClassification: classification("GENERIC", true) }), "/brand/medicamento-sem-foto.webp");
  assert.equal(medicineIllustrationUrl({ catalogClassification: classification("SIMILAR", true) }), "/brand/medicamento-similar-ilustrativo.webp");
  assert.equal(medicineIllustrationUrl({ category: "Genéricos" }), "/brand/medicamento-ilustrativo.webp");
});

test("Rx public DTO hides originals, galleries and asset identifiers without mutating physical records", () => {
  for (const inventorySource of ["PHARMACY", "DISTRIBUTOR"] as const) {
    const raw = { inventorySource, requiresPrescription: true, imageUrl: photo, imageUrls: [photo, privateUrl], imageAsset: { originalName: photo }, imageAssetId: "private-asset", catalogClassification: classification("SIMILAR"), stock: 3, price: "10.00", promotionalPrice: null };
    const before = structuredClone(raw);
    const first = toSaleProduct(raw);
    const repeated = toSaleProduct(first);
    assert.equal(first.imageUrl, "/brand/medicamento-similar-ilustrativo.webp");
    assert.deepEqual(first.imageUrls, []);
    assert.equal(first.imageAsset, null);
    assert.equal("imageAssetId" in first, false);
    assert.deepEqual(repeated.catalogClassification, raw.catalogClassification);
    assert.equal(repeated.imageUrl, first.imageUrl);
    assert.equal(JSON.stringify(first).includes(photo), false);
    assert.deepEqual(raw, before);
  }
});

test("OTC and perfumery keep real public photos; internal URLs are always private", () => {
  for (const category of ["Medicamentos", "Perfumaria"]) {
    const raw = { category, requiresPrescription: false, imageUrl: photo, imageUrls: [photo, privateUrl] };
    assert.equal(publicProductImageUrl(raw), photo);
    assert.deepEqual(publicProductImageUrls(raw), [photo]);
  }
  for (const requiresPrescription of [true, false]) {
    const raw = { requiresPrescription, imageUrl: privateUrl, imageUrls: [privateUrl] };
    assert.notEqual(publicProductImageUrl(raw), privateUrl);
    assert.deepEqual(publicProductImageUrls(raw), []);
  }
});

test("visual class never changes physical purchase availability, stock or prices", () => {
  for (const medicineClass of ["GENERIC", "SIMILAR", "REFERENCE", "UNCLASSIFIED"]) {
    const sale = toSaleProduct({ requiresPrescription: true, catalogClassification: classification(medicineClass), stock: 3, price: "10.00" });
    assert.equal(sale.stock, 3);
    assert.equal(sale.price, "10.00");
    assert.equal(sale.availableForPurchase, true);
  }
});

test("Miauby repeated DTO and inference retain class but exclude Rx photo metadata and galleries", () => {
  const raw = { id: "synthetic", slug: "synthetic", name: "Produto sintético", category: "Medicamentos", brand: null,
    requiresPrescription: true, isPopularPharmacy: false, catalogClassification: classification("SIMILAR"),
    price: "10.00", promotionalPrice: null, imageUrl: photo, imageUrls: [photo, privateUrl], imageAsset: { originalName: photo },
    activeIngredients: [], searchTerms: [], searchText: "produto sintetico" };
  const ranked = rankMiaubyCatalogProducts("Produto sintético", [raw]);
  const reply = miaubyReplyProducts("Produto sintético", ranked);
  assert.equal(reply[0].imageUrl, "/brand/medicamento-similar-ilustrativo.webp");
  assert.deepEqual(reply[0].catalogClassification, raw.catalogClassification);
  for (const result of [JSON.stringify(miaubyReplyProducts("Produto sintético", [raw])), buildMiaubySystemPrompt([raw])]) {
    assert.equal(result.includes(photo), false);
    assert.equal(result.includes(privateUrl), false);
    assert.equal(result.includes("imageAsset"), false);
    assert.equal(result.includes("imageUrls"), false);
  }
  assert.match(productImageAlt(raw.name, reply[0].imageUrl), /Imagem ilustrativa.*não representa/);
  assert.equal(productImageAlt(raw.name, photo), raw.name);
});
