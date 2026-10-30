import assert from "node:assert/strict";
import test from "node:test";
import { estimateWeightOnly } from "./base-estimate";

const medicine = { gtin: "07890000000000", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };

test("peso individual não transforma conteúdo de um sachê no pacote inteiro", () => {
  for (const pack of ["28 sachês de 1 g", "28 sachês de 0,5 g", "28 sache de 1 g", "28 sachets de 1 g", "28 envelopes de 1 g"]) {
    assert.equal(estimateWeightOnly({ ...medicine, name: `Gel sintético 1 mg/g ${pack}` }), null, pack);
  }
  const single = estimateWeightOnly({ ...medicine, name: "Gel sintético 1 mg/g 1 g" });
  assert.ok(single); assert.equal(single.declaredContent, 1); assert.equal(single.declaredUnit, "g");
});

test("bruto documental próprio continua prioritário para o conjunto de sachês", () => {
  const source = { version: 1, gtin: medicine.gtin, sourceDecisions: [], review: { confirmed: false, note: "" }, observations: [{ id: "gross", source: {
    url: "https://example.org/ficha", capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin: medicine.gtin, excerpt: "Peso bruto do pacote completo: 400 gramas" },
    packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 400, weightBasis: "gross_explicit", sidesMm: null, dimensionsBasis: "unlabeled", sideOrder: ["a", "b", "c"], notes: "" }] };
  const before = JSON.stringify(source);
  const result = estimateWeightOnly({ ...medicine, name: "Gel sintético 1 mg/g 28 sachês de 1 g", logisticsEvidence: source });
  assert.equal(result?.family, "EXACT_GROSS_REFERENCE");
  assert.equal(result?.retailPackagingReserveGrams, 0);
  assert.equal(result?.draft.weightGrams, 500);
  assert.equal(result?.draft.enabled, false);
  assert.equal(result?.draft.transportReviewed, false);
  assert.equal(JSON.stringify(source), before);
});
