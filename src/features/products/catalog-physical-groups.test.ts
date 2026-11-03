import assert from "node:assert/strict";
import test from "node:test";
import { catalogPhysicalGroups, PHYSICAL_REVIEW_KEY } from "./catalog-physical-groups";

const source = { title: "Ficha sintética", url: "https://example.test/ficha", evidence: "Dados físicos sintéticos para teste isolado." };
const fixture = (id: string) => ({
  id, name: "Loção sintética frasco 200 ml", sku: `TEST-${id}`, inventorySource: "PHARMACY" as "PHARMACY" | "DISTRIBUTOR",
  catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
  shippingProfile: {
    enabled: false, transportReviewed: false, measurementBasis: "estimated",
    weightGrams: 300, lengthCm: 10, widthCm: 5, heightCm: 18,
    reference: {
      productName: "Loção sintética frasco 200 ml", packageLevel: "retail_unit",
      weightGrams: 300, lengthCm: 10, widthCm: 5, heightCm: 18,
      weightSource: source, dimensionsSource: source, researchedAt: "2026-11-02T12:00:00.000Z", warnings: [],
      estimate: { comparableName: "Frasco sintético", packageDescription: "Frasco plástico fechado", productFamily: "Loção sintética", packageMaterial: "Plástico", targetSource: source, source, confidence: "low", assumptions: ["Hipótese sintética para teste."], weightGrams: null, lengthCm: null, widthCm: null, heightCm: null },
    },
  },
});

test("agrupa somente igualdade física e embalagem compatível, preservando cada SKU e objeto", () => {
  const products = [fixture("a"), fixture("b")];
  const snapshot = structuredClone(products);
  const groups = catalogPhysicalGroups(products);
  assert.equal(groups.length, 1);
  assert.notEqual(groups[0].key, PHYSICAL_REVIEW_KEY);
  assert.deepEqual(groups[0].productIds, ["a", "b"]);
  assert.deepEqual(products, snapshot);
});

test("não encadeia proximidade: cada peso diferente permanece separado", () => {
  const products = [300, 301, 302].map((weight, index) => {
    const product = fixture(String(index));
    product.shippingProfile.weightGrams = weight;
    product.shippingProfile.reference.weightGrams = weight;
    return product;
  });
  assert.equal(catalogPhysicalGroups(products).length, 3);
});

test("fontes, identidade, apresentação, SKU e perfil incompletos ficam a conferir", () => {
  const invalid = [
    { ...fixture("missing"), shippingProfile: null },
    { ...fixture("sku"), sku: null },
    { ...fixture("count"), name: "Loção sintética frasco" },
    { ...fixture("kit"), name: "Kit 2 frascos 200 ml" },
    { ...fixture("class"), catalogClassification: null },
  ];
  const mismatch = fixture("mismatch");
  mismatch.shippingProfile.weightGrams = 400;
  const noSource = fixture("source");
  const profile = { ...noSource.shippingProfile, reference: { ...noSource.shippingProfile.reference, weightSource: null } };
  const groups = catalogPhysicalGroups([...invalid, mismatch, { ...noSource, shippingProfile: profile }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, PHYSICAL_REVIEW_KEY);
  assert.equal(groups[0].productIds.length, 7);
});

test("separa conteúdo, material e classificação; exclui distribuidoras", () => {
  const base = fixture("base");
  const material = fixture("material");
  material.shippingProfile.reference.estimate.packageMaterial = "Vidro";
  const content = fixture("content");
  content.name = "Loção sintética frasco 400 ml";
  content.shippingProfile.reference.productName = content.name;
  const distributor = { ...fixture("supplier"), inventorySource: "DISTRIBUTOR" as const };
  const classification = fixture("classification");
  classification.catalogClassification.kind = "PERFUMERY";
  const groups = catalogPhysicalGroups([base, material, content, classification, distributor]);
  assert.equal(groups.length, 4);
  assert.equal(groups.flatMap(group => group.productIds).includes("supplier"), false);
});
