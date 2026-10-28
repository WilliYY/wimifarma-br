import assert from "node:assert/strict";
import test from "node:test";
import { estimateAverageShipping, type AverageEstimateIdentity } from "./average-estimate";

const medicine = { name: "Medicamento sintético 50 mg 30 comprimidos", category: "Medicamentos", activeIngredients: ["substância sintética"], requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };
function gtin(number: number) {
  const body = `0789000000${String(number).padStart(3, "0")}`;
  const sum = [...body].reverse().reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
  return body + (10 - sum % 10) % 10;
}
function sample(number: number, sidesMm = [80, 50, 20], weightGrams = 30): AverageEstimateIdentity {
  const code = gtin(number);
  return { ...medicine, gtin: code, logisticsEvidence: { version: 1, gtin: code, sourceDecisions: [], review: { confirmed: false, note: "" }, observations: [{ id: `sample-${number}`, source: { url: `https://example.org/synthetic-${number}`, capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin: code, excerpt: "Dimensões e peso bruto da unidade comercial sintética" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams, weightBasis: "gross_explicit", sidesMm, dimensionsBasis: "labeled_axes", sideOrder: ["comprimento", "largura", "altura"], notes: "" }] } };
}
const target = { ...medicine, gtin: gtin(99), logisticsEvidence: null };
const catalog = [sample(1, [70, 50, 20], 24), sample(2, [90, 55, 25], 30), sample(3, [80, 60, 30], 36)];

test("averages keep raw means but reserve the largest observed envelope and explicit protection", () => {
  const before = JSON.stringify(catalog);
  const result = estimateAverageShipping(target, catalog);
  assert.ok(result);
  assert.equal(result.basis, "ORAL_SOLID_COHORT");
  assert.deepEqual(result.meanRetailSidesCm, [8, 5.5, 2.5]);
  assert.equal(result.meanRetailWeightGrams, 30);
  assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], [11, 8, 5]);
  assert.equal(result.draft.weightGrams, 140);
  assert.equal(result.draft.enabled, false);
  assert.equal(result.draft.transportReviewed, false);
  assert.equal(result.draft.measurementBasis, "estimated");
  assert.equal(result.draft.reference, null);
  assert.equal(result.sourceGtins.length, 3);
  assert.match(result.explanation, /não.*garant/i);
  assert.equal(JSON.stringify(catalog), before);
  assert.deepEqual(estimateAverageShipping(target, [...catalog].reverse()), result);
});

test("exact current retail dimensions take precedence over averages without repeating retail tare", () => {
  const own = sample(99, [100, 40, 20], 22);
  const result = estimateAverageShipping(own, catalog);
  assert.equal(result?.basis, "EXACT_RETAIL_DIMENSIONS");
  assert.deepEqual(result?.sourceGtins, [own.gtin]);
  assert.deepEqual([result?.draft.lengthCm, result?.draft.widthCm, result?.draft.heightCm], [12, 6, 4]);
  assert.equal(result?.draft.weightGrams, 130);
});

test("own exact gross weight still takes precedence when only dimensions come from a cohort", () => {
  const own = sample(99, [100, 40, 20], 150);
  const evidence = own.logisticsEvidence as { observations: Array<{ sidesMm: number[] | null }> };
  evidence.observations[0].sidesMm = null;
  const result = estimateAverageShipping(own, catalog);
  assert.equal(result?.basis, "ORAL_SOLID_COHORT");
  assert.equal(result?.draft.weightGrams, 250);
  assert.equal(result?.weightBasis, "EXACT_GTIN_GROSS");
  assert.ok(result?.sourceObservationIds.includes(`${own.gtin}:sample-99`));
});

test("cohorts need distinct products, matching composition/counts/forms and bounded dispersion", () => {
  for (const members of [catalog.slice(0, 1), [catalog[0], catalog[0]], [catalog[0], { ...catalog[1], name: "Medicamento sintético 50 mg 60 comprimidos" }], [catalog[0], sample(3, [300, 150, 100], 500)]]) {
    assert.equal(estimateAverageShipping(target, members), null);
  }
  assert.equal(estimateAverageShipping({ ...target, activeIngredients: ["outra substância"] }, catalog), null);
  assert.equal(estimateAverageShipping({ ...target, activeIngredients: [] }, catalog), null);
  for (const name of ["Medicamento sintético 50 mg 20 comprimidos", "Medicamento sintético 50 mg 30 cápsulas", "Medicamento sintético 50 mg 30 drágeas", "Medicamento sintético XR 30 comprimidos", "Medicamento sintético frasco 30 comprimidos", "Kit medicamento 30 comprimidos", "Medicamento 30 comprimidos efervescentes", "Shampoo sintético 200ml", "Medicamento sem contagem"]) assert.equal(estimateAverageShipping({ ...target, name }, catalog), null, name);
});

test("conflicting, master, net-only, unlabeled and withdrawn observations never calibrate a cohort", () => {
  for (const patch of [{ packagingLevel: "master_case", units: 12 }, { weightBasis: "net" }, { dimensionsBasis: "unlabeled" }, { identityConflict: true }]) {
    const altered = structuredClone(catalog[2]);
    const e = altered.logisticsEvidence as { observations: object[] };
    Object.assign(e.observations[0], patch);
    assert.equal(estimateAverageShipping(target, [catalog[0], altered]), null);
  }
  const withdrawn = structuredClone(catalog[2]);
  (withdrawn.logisticsEvidence as { sourceDecisions: object[] }).sourceDecisions = [{ observationId: "sample-3", state: "rejected", reason: "Fonte sintética retirada" }];
  assert.equal(estimateAverageShipping(target, [catalog[0], withdrawn]), null);
  const conflict = sample(99);
  const e = conflict.logisticsEvidence as { observations: object[] };
  e.observations.push({ ...e.observations[0], id: "conflict", weightGrams: 300 });
  assert.equal(estimateAverageShipping(conflict, catalog), null);
});

test("sanitary and cargo exclusions persist even with exact dimensions", () => {
  for (const patch of [{ isPopularPharmacy: true }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "UNREVIEWED" }, { name: "Álcool sintético 100 ml" }, { name: "Desodorante aerossol 150ml" }]) assert.equal(estimateAverageShipping({ ...sample(99), ...patch }, catalog), null);
});
