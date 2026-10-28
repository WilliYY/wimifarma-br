import assert from "node:assert/strict";
import test from "node:test";
import { estimateWeightOnly } from "./base-estimate";

const medicine = { name: "Losartana 50 mg 30 comprimidos", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };
const hygiene = { ...medicine, name: "Shampoo sintético 200 ml", category: "Higiene", requiresPrescription: false };

test("weight-only estimates identify assumptions and never invent dimensions or approvals", () => {
  const result = estimateWeightOnly(medicine);
  assert.ok(result);
  assert.equal(result.draft.weightGrams, 180);
  assert.equal(result.estimatedRetailGrams, 80);
  assert.equal(result.externalPackagingReserveGrams, 100);
  assert.equal(result.draft.measurementBasis, "estimated");
  assert.equal(result.draft.enabled, false);
  assert.equal(result.draft.transportReviewed, false);
  assert.equal(result.draft.reference, null);
  assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], [null, null, null]);
  assert.match(result.explanation, /hipótese/i);
  assert.match(result.explanation, /não.*medid/i);
  assert.equal(estimateWeightOnly({ ...medicine, name: "Losartana 100 mg 30 comprimidos" })?.draft.weightGrams, 180);
});

test("unit conversions distinguish declared mass from hypothetical density", () => {
  const volume = estimateWeightOnly(hygiene);
  assert.ok(volume);
  assert.equal(volume.declaredContent, 200);
  assert.equal(volume.densityHypothesisGramsPerMl, 1.3);
  assert.equal(volume.draft.weightGrams, 390);
  assert.equal(estimateWeightOnly({ ...hygiene, name: "Shampoo sintético 0,5 L" })?.draft.weightGrams, 780);
  const mass = estimateWeightOnly({ ...hygiene, name: "Creme sintético 0,5 kg" });
  assert.equal(mass?.densityHypothesisGramsPerMl, null);
  assert.equal(mass?.draft.weightGrams, 630);
  assert.equal(estimateWeightOnly({ ...hygiene, name: "Sabonete sintético 85 g" })?.draft.weightGrams, 220);
});

test("oral liquids exclude concentration denominators from the declared package volume", () => {
  const result = estimateWeightOnly({ ...medicine, name: "Medicamento sintético 250 mg/5 ml suspensão oral 60 ml" });
  assert.equal(result?.family, "ORAL_LIQUID");
  assert.equal(result?.declaredContent, 60);
  assert.equal(result?.draft.weightGrams, 210);
  assert.equal(estimateWeightOnly({ ...medicine, name: "Medicamento 250mg/5ml suspensão oral" }), null);
  assert.equal(estimateWeightOnly({ ...medicine, name: "Medicamento 2 mg/mL suspensão oral 120 mL" })?.declaredContent, 120);
  for (const name of ["Creme sintético 10 g/100 g", "Gel sintético 1g/g", "Xarope sintético 20mg por5ml", "Xarope sintético 20mg em5ml"]) assert.equal(estimateWeightOnly({ ...hygiene, name }), null, name);
  assert.equal(estimateWeightOnly({ ...hygiene, name: "Creme sintético 10g/100g 30g" })?.declaredContent, 30);
  assert.equal(estimateWeightOnly({ ...medicine, name: "Medicamento sintético 50mg + 12,5mg 30 comprimidos" })?.draft.weightGrams, 180);
  assert.equal(estimateWeightOnly({ ...medicine, activeIngredients: ["Substância A", "substância B"], name: "Substância A + substância B 50mg + 12,5mg 30 comprimidos" })?.draft.weightGrams, 180);
  for (const name of ["Medicamento A + medicamento B 30 comprimidos", "Medicamento sintético + porta-comprimidos 30 comprimidos", "Medicamento sintético 50mg + nécessaire 30 comprimidos", "Substância A + substância B + porta-comprimidos 50mg + 12,5mg 30 comprimidos"]) assert.equal(estimateWeightOnly({ ...medicine, activeIngredients: ["Substância A", "substância B"], name }), null, name);
  assert.equal(estimateWeightOnly({ ...medicine, name: "Substância A + substância B 50mg + 12,5mg 30 comprimidos" }), null);
  for (const strength of ["0,5", "1", "1,5"]) {
    const solid = estimateWeightOnly({ ...medicine, name: `Medicamento sintético ${strength} g 30 comprimidos` });
    assert.equal(solid?.declaredUnit, "count");
    assert.equal(solid?.declaredContent, 30);
    assert.equal(solid?.draft.weightGrams, 180);
  }
  for (const name of ["Medicamento 2 g 30 comprimidos", "Medicamento A 30 comprimidos + brinde", "Kit medicamento A + medicamento B 30 comprimidos", "Medicamento A + medicamento B sem contagem"]) assert.equal(estimateWeightOnly({ ...medicine, name }), null, name);
  for (const name of ["Sérum sintético 50ml", "Hidratante sintético 200ml", "Desodorante sintético roll-on 50ml"]) assert.ok(estimateWeightOnly({ ...hygiene, name }), name);
});

test("ambiguous, special and unsupported packages remain pending", () => {
  for (const name of ["Medicamento 50 mg", "Medicamento 1 g 30 comprimidos", "Medicamento 30.5 comprimidos", "Medicamento 121 comprimidos", "Medicamento 30 comprimidos efervescentes", "Medicamento 30 comprimidos mastigáveis", "Kit shampoo 200ml", "Shampoo 2x200ml", "Shampoo 200ml + 100ml", "Shampoo 200ml/500ml", "Shampoo 1.000ml", "Shampoo -200ml", "Produto desconhecido 200ml", "Perfume 100ml", "Sabonete líquido em vidro 200ml", "Desodorante aerossol 150ml", "Shampoo 30000ml", "Shampoo 500mg", "Medicamento 0ml suspensão oral", "Medicamento suspensão oftálmica 5ml"]) {
    assert.equal(estimateWeightOnly({ ...hygiene, name }), null, name);
  }
  for (const patch of [{ isPopularPharmacy: true }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "UNREVIEWED" }]) assert.equal(estimateWeightOnly({ ...medicine, ...patch }), null);
});

test("exact retail gross source takes priority without altering evidence or doubling retail packaging", () => {
  const source = { version: 1, gtin: "07890000000000", sourceDecisions: [], review: { confirmed: false, note: "" }, observations: [{ id: "gross", source: { url: "https://example.org/ficha", capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin: "07890000000000", excerpt: "Peso bruto da unidade: 25 gramas" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 25, weightBasis: "gross_explicit", sidesMm: null, dimensionsBasis: "unlabeled", sideOrder: ["a", "b", "c"], notes: "" }] };
  const original = JSON.stringify(source);
  const result = estimateWeightOnly({ ...medicine, gtin: source.gtin, logisticsEvidence: source });
  assert.equal(result?.family, "EXACT_GROSS_REFERENCE");
  assert.equal(result?.estimatedRetailGrams, 25);
  assert.equal(result?.draft.weightGrams, 130);
  assert.equal(result?.retailPackagingReserveGrams, 0);
  assert.equal(JSON.stringify(source), original);
  assert.equal(estimateWeightOnly({ ...medicine, gtin: "00000000000000", logisticsEvidence: source }), null);
  assert.equal(estimateWeightOnly({ ...medicine, gtin: source.gtin, logisticsEvidence: { ...source, observations: [...source.observations, { ...source.observations[0], id: "different", weightGrams: 80 }] } }), null);
  const packet = estimateWeightOnly({ ...medicine, name: "Toalhas umedecidas sintéticas 48 unidades", category: "Higiene infantil", requiresPrescription: false, gtin: source.gtin, logisticsEvidence: { ...source, observations: [{ ...source.observations[0], weightGrams: 301 }] } });
  assert.equal(packet?.family, "EXACT_GROSS_REFERENCE");
  assert.equal(packet?.draft.weightGrams, 410);
  assert.equal(estimateWeightOnly({ ...medicine, name: "Toalhas umedecidas sintéticas 48 unidades", category: "Higiene infantil", requiresPrescription: false }), null);
});

test("identified hygiene categories and brands allow unambiguous abbreviated content without inventing dimensions", () => {
  for (const [name, category, weight] of [
    ["SUN PEH30 200ML", "Perfumaria", 390],
    ["ANTHELIOS UVMUNE INF200ML", "Dermocosméticos", 390],
    ["OLEO DEMAQ 125ML", "Higiene e beleza", 300],
    ["CREATINA 300G", "Suplementos", 430],
  ] as const) {
    const result = estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name, category });
    assert.equal(result?.policyVersion, "weight-only-v3");
    assert.equal(result?.draft.weightGrams, weight, name);
    assert.deepEqual([result?.draft.lengthCm, result?.draft.widthCm, result?.draft.heightCm], [null, null, null]);
    assert.equal(result?.draft.enabled, false);
    assert.equal(result?.draft.transportReviewed, false);
    assert.match(result?.explanation ?? "", /categoria.*marca/i);
  }
  for (const patch of [{ brand: undefined }, { brand: "" }, { brand: "Não informado" }, { category: "Outros" }, { category: "Medicamentos" }]) {
    assert.equal(estimateWeightOnly({ ...hygiene, name: "SUN PEH30 200ML", brand: "Marca sintética", category: "Perfumaria", ...patch }), null);
  }
  assert.equal(estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name: "Nutrição sintética 200ML", category: "Nutrição" }), null);
});

test("category fallback never bypasses abbreviated dangerous cargo, kit or ambiguous content guards", () => {
  for (const name of ["AERO PEARL150ML", "DEO150ML", "DESOD CLINICAL150ML", "EDT100ML", "COLONIA100ML", "ESMALTE8ML", "ACETONA100ML", "ALC70 100ML", "KIT SUN200ML", "SUN2X200ML", "SUN200ML+100ML", "DUO+M40ML", "SUN200ML/500ML", "SUN -200ML", "SUN0ML", "SUN3000ML", "SUN500MG"]) {
    assert.equal(estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name, category: "Perfumaria" }), null, name);
  }
  assert.ok(estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name: "Desodorante sintético roll-on 50ml", category: "Higiene pessoal" }));
});

test("nutrition dose, serving and sachet mass never become total packaged content", () => {
  for (const name of ["Creatina dose de 3 g", "Creatina 3g por porção", "Colágeno 10 g 30 sachês", "Colágeno10g 30sachês", "Colágeno10g20envelopes", "Creatina300g90doses"]) {
    assert.equal(estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name, category: "Suplementos" }), null, name);
  }
  assert.equal(estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name: "CREATINA300G", category: "Suplementos" })?.draft.weightGrams, 430);
  for (const form of ["pastilhas", "tabletes", "gomas", "gummies", "balas", "barras", "barrinhas", "tablets", "chews", "lozenges", "sticks", "shots", "unidades"]) {
    assert.equal(estimateWeightOnly({ ...hygiene, brand: "Marca sintética", name: `Vitamina sintética 1g 60${form}`, category: "Suplementos" }), null, form);
  }
});
