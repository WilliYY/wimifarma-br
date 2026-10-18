import assert from "node:assert/strict";
import test from "node:test";
import { estimateBaseShipping } from "./base-estimate";
import { shippingDraftSchema } from "./product-draft";

const medicine = { name: "Losartana potássica 50 mg 30 comprimidos", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };
const hygiene = { name: "Shampoo sintético 250 ml", category: "Higiene e perfumaria", requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };

test("simple oral solids get estimated disabled drafts with packaging and protection already included", () => {
  for (const [count, weight] of [[1, 500], [60, 500], [61, 750], [120, 750]]) {
    const result = estimateBaseShipping({ ...medicine, name: `Losartana 50 mg ${count} comprimidos` });
    assert.ok(result);
    assert.equal(result.family, "ORAL_SOLID");
    assert.equal(result.draft.weightGrams, weight);
    assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], [20.8, 20.8, 21.6]);
    assert.equal(result.draft.enabled, false);
    assert.equal(result.draft.transportReviewed, false);
    assert.equal(result.draft.measurementBasis, "estimated");
    assert.equal(result.draft.reference, null);
    assert.equal(shippingDraftSchema.safeParse(result.draft).success, true);
    assert.match(result.explanation, /caixa e proteção/i);
    assert.match(result.explanation, /antes da postagem/i);
  }
});

test("dosage is never a gross weight or a tablet count", () => {
  for (const name of ["Losartana 50 mg", "Losartana 500mg", "Losartana 30 mg sem contagem", "Losartana 121 comprimidos", "Losartana 1120 comprimidos", "Losartana 0 comprimidos", "Losartana 30,5 comprimidos", "Losartana 1.000 comprimidos"]) {
    assert.equal(estimateBaseShipping({ ...medicine, name }), null, name);
  }
  assert.equal(estimateBaseShipping({ ...medicine, name: "Losartana 50mg 30cp" })?.draft.weightGrams, 500);
  assert.equal(estimateBaseShipping({ ...medicine, name: "Medicamento sintético 0,5 mg 90 cápsulas" })?.draft.weightGrams, 750);
});

test("hygiene volume uses conservative density plus packaging rounded up to 100 grams", () => {
  for (const [volume, weight, dimensions] of [[1, 600, [20.8, 20.8, 21.6]], [250, 900, [20.8, 20.8, 21.6]], [251, 900, [33, 33, 33]], [500, 1200, [33, 33, 33]]] as const) {
    const result = estimateBaseShipping({ ...hygiene, name: `Shampoo sintético ${volume} ml` });
    assert.ok(result);
    assert.equal(result.family, "HYGIENE_VOLUME");
    assert.equal(result.draft.weightGrams, weight);
    assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], dimensions);
    assert.match(result.explanation, /1,3/);
    assert.match(result.explanation, /não comprova/i);
  }
});

test("hygiene declared mass includes packaging and never consumes milligrams", () => {
  assert.equal(estimateBaseShipping({ ...hygiene, name: "Sabonete sintético 90 g" })?.draft.weightGrams, 600);
  assert.equal(estimateBaseShipping({ ...hygiene, name: "Creme sintético 500 g" })?.draft.weightGrams, 1000);
  assert.equal(estimateBaseShipping({ ...hygiene, name: "Gel sintético 1 g" })?.draft.weightGrams, 500);
  for (const name of ["Creme 500 mg", "Shampoo", "Loção 501 ml", "Creme 501g", "Creme 0g", "Sabonete 1000g", "Shampoo 1250ml", "Sabonete 1 kg", "Creme 250 gramas de 500 g", "Shampoo 1.250ml", "Shampoo 250ml/1l", "Shampoo c/2 250ml"]) {
    assert.equal(estimateBaseShipping({ ...hygiene, name }), null, name);
  }
});

test("unsafe, unknown and multipack presentations do not produce a draft", () => {
  for (const patch of [{ prescriptionType: "CONTROLLED" }, { prescriptionType: "UNREVIEWED" }, { prescriptionType: undefined }, { isPopularPharmacy: true }]) {
    assert.equal(estimateBaseShipping({ ...medicine, ...patch }), null);
  }
  for (const name of ["Kit shampoo 250ml", "Shampoo 2x250ml", "Shampoo 250ml + condicionador 250ml", "Shampoo leve 3 pague 2 250ml", "Combo creme 250g", "Shampoo 250ml 2 unidades", "Shampoo 250ml/500ml", "Creme em vidro 250g", "Loção álcool 250ml", "Gel alcoólico 70% 500ml", "Perfume 250ml", "Loção spray 250ml", "Gel aerossol 250ml", "Shampoo refrigerado 250ml"]) {
    assert.equal(estimateBaseShipping({ ...hygiene, name }), null, name);
  }
  for (const name of ["Insulina 30 comprimidos", "Vacina 30 cápsulas", "Medicamento injetável 30 comprimidos", "Losartana 2 caixas 30 comprimidos", "Losartana 30 comprimidos + 30 comprimidos", "Losartana 30 comprimidos refrigerada"]) {
    assert.equal(estimateBaseShipping({ ...medicine, name }), null, name);
  }
  for (const name of ["Produto desconhecido 250ml", "Produto 30 unidades", "", "30 comprimidos", "Shampoo 250ml e 100g"]) {
    assert.equal(estimateBaseShipping({ ...hygiene, name }), null, name);
  }
});

test("clear hygiene families are accepted without mistaking category perfumaria for perfume", () => {
  for (const family of ["Shampoo", "Condicionador", "Sabonete", "Creme", "Loção", "Gel"]) {
    assert.ok(estimateBaseShipping({ ...hygiene, name: `${family} sintético 200ml` }), family);
  }
  assert.ok(estimateBaseShipping({ ...medicine, requiresPrescription: false, prescriptionType: "UNREVIEWED", name: "Paracetamol 20 comprimidos" }));
});
