import assert from "node:assert/strict";
import test from "node:test";
import { estimateOwnerMedicineScenario, ownerMedicineScenariosSchema } from "./owner-medicine-scenario";
import type { AverageEstimateIdentity } from "./average-estimate";

const gtin = "00000000000017";
const input: AverageEstimateIdentity = { gtin, name: "Losartana 50 mg 30 comprimidos", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };
const kinds = ["ORAL_SOLID_1_TO_30", "ORAL_SOLID_31_TO_60", "ORAL_SOLID_61_TO_120", "ORAL_LIQUID_UP_TO_60ML", "ORAL_LIQUID_61_TO_150ML", "TOPICAL_MASS_UP_TO_60G"] as const;
function manifest(kind: typeof kinds[number] = kinds[0], extra = {}) {
  return { id: "owner-oral", label: "Hipótese autorizada", kind, memberGtins: [gtin], hypothesizedRetailSidesCm: [15, 9, 4], geometryMarginCm: 3, outerBoxCm: [24, 15, 10], rationale: "Estimativa autorizada pelo lojista.", packingHypothesis: "Conferir proteção e recipiente antes de preparar.", ...extra };
}
const estimate = (name = input.name, kind: typeof kinds[number] = kinds[0], extra = {}) => estimateOwnerMedicineScenario({ ...input, name, ...extra }, [manifest(kind)]);

test("manifesto estrito: limites, GTIN, IDs e membros disjuntos", () => {
  assert.ok(ownerMedicineScenariosSchema.safeParse([manifest()]).success);
  for (const patch of [{ unknown: true }, { memberGtins: [] }, { memberGtins: [gtin, gtin] }, { memberGtins: ["00000000000000"] }, { memberGtins: Array(501).fill(gtin) }, { geometryMarginCm: 0 }, { geometryMarginCm: 4 }, { geometryMarginCm: 1.5 }, { hypothesizedRetailSidesCm: [4, 15, 9] }, { hypothesizedRetailSidesCm: [201, 9, 4] }, { hypothesizedRetailSidesCm: [15, 9, 0] }, { outerBoxCm: { lengthCm: 25, widthCm: 15, heightCm: 10 } }, { rationale: "a" }, { packingHypothesis: "x".repeat(2001) }]) {
    assert.equal(ownerMedicineScenariosSchema.safeParse([manifest(kinds[0], patch)]).success, false, JSON.stringify(patch));
  }
  assert.equal(ownerMedicineScenariosSchema.safeParse([manifest(), manifest()]).success, false);
  assert.equal(ownerMedicineScenariosSchema.safeParse([manifest(), manifest(kinds[1], { id: "other" })]).success, false);
  assert.equal(ownerMedicineScenariosSchema.safeParse(Array(101).fill(manifest())).success, false);
});

for (const [count, kind] of [[1, kinds[0]], [30, kinds[0]], [31, kinds[1]], [60, kinds[1]], [61, kinds[2]], [120, kinds[2]]] as const) {
  test(`contagem ${count}: faixa exclusiva e peso individual`, () => {
    const result = estimate(`Losartana 50 mg ${count} comprimidos`, kind);
    assert.ok(result);
    assert.equal(result.declaredContent, count);
    assert.equal(result.draft.weightGrams, Math.ceil((Math.ceil((count * 1.5 + 30) / 10) * 10 + 100) / 10) * 10);
    for (const other of kinds.filter(value => value !== kind)) assert.equal(estimate(`Losartana 50 mg ${count} comprimidos`, other), null);
  });
}
test("formas sólidas e doses não se confundem com massa bruta", () => {
  for (const name of ["Losartana 500 mg 30 comprimidos", "Losartana 500 mcg 30 cápsulas", "Losartana 1 mg 30 drágeas", "Losartana XR 500 mg 30 comprimidos", "Losartana SR 30 comprimidos"]) assert.equal(estimate(name)?.draft.weightGrams, 180, name);
  assert.equal(estimate("Losartana + Hidroclorotiazida 50 mg + 12,5 mg 30 comprimidos", kinds[0], { activeIngredients: ["Losartana", "Hidroclorotiazida"] })?.draft.weightGrams, 180);
  for (const name of ["Losartana 121 comprimidos", "Losartana 0 comprimidos", "Losartana 30,5 comprimidos", "Losartana 30 cápsulas moles", "Losartana 30 cápsulas softgel", "Losartana 30 comprimidos SL", "Losartana 30 comprimidos sublinguais", "Losartana 30 comprimidos orodispersíveis", "Losartana frasco 30 comprimidos", "Losartana pote 30 comprimidos", "Losartana kit 30 comprimidos", "Losartana 30 comprimidos vidro", "Losartana 30 comprimidos injetável", "Losartana + brinde 30 comprimidos"]) assert.equal(estimate(name), null, name);
});
test("faixas de líquidos orais e tópicos não extrapolam", () => {
  for (const [name, kind, size] of [["Medicamento solução oral 20 mg/ml 60 ml", kinds[3], 60], ["Medicamento suspensão oral 60,5 ml", kinds[4], 60.5], ["Medicamento xarope 150 ml", kinds[4], 150], ["Medicamento creme 60 g", kinds[5], 60]] as const) assert.equal(estimate(name, kind)?.declaredContent, size);
  for (const [name, kind] of [["Medicamento xarope 60 ml", kinds[4]], ["Medicamento xarope 60,5 ml", kinds[3]], ["Medicamento xarope 151 ml", kinds[4]], ["Medicamento solução nasal 60 ml", kinds[3]], ["Medicamento solução oftálmica 60 ml", kinds[3]], ["Medicamento creme 60 ml", kinds[3]], ["Medicamento creme 61 g", kinds[5]], ["Medicamento pote creme 60 g", kinds[5]], ["Medicamento refil gel 60 g", kinds[5]], ["Medicamento kit pomada 60 g", kinds[5]] ] as const) assert.equal(estimate(name, kind), null, name);
});
test("bloqueios de receita, carga e categoria não dependem da flag contraditória", () => {
  for (const prescriptionType of ["CONTROLLED", "ANTIMICROBIAL"]) {
    for (const requiresPrescription of [false, true]) assert.equal(estimate(input.name, kinds[0], { prescriptionType, requiresPrescription }), null);
  }
  assert.equal(estimate(input.name, kinds[0], { prescriptionType: "UNREVIEWED", requiresPrescription: true }), null);
  assert.equal(estimate(input.name, kinds[0], { isPopularPharmacy: true }), null);
  assert.equal(estimate(input.name, kinds[0], { category: "Suplementos", requiresPrescription: false }), null);
  assert.equal(estimate("Losartana refrigerada 30 comprimidos"), null);
});

test("UNREVIEWED sem exigência de receita conserva a política individual e a classificação", () => {
  for (const [name, kind] of [["Losartana 50 mg 30 comprimidos", kinds[0]], ["Medicamento solução oral 60 ml", kinds[3]], ["Medicamento creme 60 g", kinds[5]]] as const) {
    const candidate = { ...input, name, prescriptionType: "UNREVIEWED", requiresPrescription: false };
    const before = structuredClone(candidate);
    const result = estimateOwnerMedicineScenario(candidate, [manifest(kind)]);
    assert.ok(result, name);
    assert.equal(result.weightComputation.policyVersion, "weight-only-v4");
    assert.deepEqual(candidate, before);
    assert.equal("prescriptionType" in result, false);
    assert.equal("catalogClassification" in result, false);
    assert.doesNotMatch(result.explanation, /\bMIP\b/);
    assert.equal(estimateOwnerMedicineScenario({ ...candidate, requiresPrescription: true }, [manifest(kind)]), null);
  }
  assert.equal(estimate("Daflon 30 envelopes 10 ml", kinds[3], { prescriptionType: "UNREVIEWED", requiresPrescription: false }), null);
});

test("líquido com indicação tópica contraditória não recebe hipótese oral", () => {
  assert.equal(estimate("Medicamento solução oral uso tópico 60 ml", kinds[3]), null);
});

function evidence(weightBasis: "gross_explicit" | "net" = "gross_explicit", sidesMm: number[] | null = null) {
  return { version: 1, gtin, review: { confirmed: false, note: "" }, observations: [{ id: "own", source: { gtin, url: "https://example.com/medicine", sha256: "a".repeat(64), capturedAt: "2026-10-29T00:00:00Z", excerpt: "Peso da unidade comercial" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 81, weightBasis, sidesMm, dimensionsBasis: "labeled_axes", notes: "", sideOrder: ["altura", "largura", "profundidade"] }] };
}
test("peso bruto próprio tem prioridade; líquido não é bruto; geometria própria defere", () => {
  const result = estimate(input.name, kinds[0], { logisticsEvidence: evidence() });
  assert.ok(result);
  assert.equal(result.draft.weightGrams, 190);
  assert.equal(result.weightBasis, "EXACT_GTIN_GROSS");
  assert.equal(result.weightComputation.retailPackagingReserveGrams, 0);
  assert.deepEqual(result.sourceGtins, [gtin]);
  assert.deepEqual(result.sourceObservationIds, [`${gtin}:own`]);
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: evidence("net") })?.draft.weightGrams, 180);
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: evidence("gross_explicit", [60, 40, 20]) }), null);
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: {} }), null);
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: { ...evidence(), gtin: "07896000123420" } }), null);
  const conflict = evidence(); conflict.observations[0].identityConflict = true;
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: conflict }), null);
  const differing = evidence(); differing.observations.push({ ...differing.observations[0], id: "second", weightGrams: 82 });
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: differing }), null);
  assert.equal(estimate("Losartana kit 30 comprimidos", kinds[0], { logisticsEvidence: evidence() }), null);
});
test("margem total aplicada uma vez, igualdade bloqueada e saída sem falsa evidência", () => {
  for (const geometryMarginCm of [1, 2, 3]) {
    const result = estimateOwnerMedicineScenario(input, [manifest(kinds[0], { geometryMarginCm })]);
    assert.ok(result);
    assert.deepEqual(result.operationalUpperSidesCm, [15 + geometryMarginCm, 9 + geometryMarginCm, 4 + geometryMarginCm]);
  }
  assert.equal(estimateOwnerMedicineScenario(input, [manifest(kinds[0], { hypothesizedRetailSidesCm: [21, 9, 4] })]), null);
  const before = JSON.stringify(input); const manifests = [manifest()]; const beforeManifest = JSON.stringify(manifests);
  const result = estimateOwnerMedicineScenario(input, manifests)!;
  assert.deepEqual(result, estimateOwnerMedicineScenario(input, manifests));
  assert.equal(JSON.stringify(input), before); assert.equal(JSON.stringify(manifests), beforeManifest);
  assert.equal(result.geometrySource, "OWNER_AUTHORIZED_HYPOTHESIS");
  assert.deepEqual(result.geometrySourceGtins, []); assert.equal(result.geometrySampleCount, 0);
  assert.deepEqual(result.ownerExampleRetailBoxCm, [6, 4, 2]);
  assert.equal(result.ownerExampleUnitCount, null); assert.equal(result.ownerExampleGtin, null);
  assert.deepEqual(result.sourceGtins, []); assert.deepEqual(result.sourceObservationIds, []); assert.deepEqual(result.sourceSha256, []);
  assert.equal(result.packingFitConfirmed, false); assert.equal(result.protectionCalibrated, false);
  assert.equal(result.innerDimensions, null); assert.equal(result.tare, null); assert.equal(result.material, null); assert.equal(result.closure, null);
  assert.equal(result.outerBoxSource, "OWNER_DECLARED");
  assert.deepEqual(result.draft, { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 180, lengthCm: 24, widthCm: 15, heightCm: 10, reference: null, approvedServiceIds: [] });
  assert.equal(result.policyVersion, "owner-package-hypothesis-v1"); assert.equal(result.basis, "OWNER_PACKAGE_HYPOTHESIS");
  assert.equal("meanRetailSidesCm" in result, false); assert.equal("logisticsEvidence" in result, false);
});

test("fontes inativas não ancoram; eixos sem identificação não promovem geometria", () => {
  const inactive = { ...evidence("gross_explicit", [60, 40, 20]), sourceDecisions: [{ observationId: "own", state: "rejected", reason: "Fonte rejeitada na revisão" }] };
  const result = estimate(input.name, kinds[0], { logisticsEvidence: inactive });
  assert.ok(result); assert.equal(result.draft.weightGrams, 180); assert.deepEqual(result.sourceGtins, []);
  const unlabeled = evidence("net", [60, 40, 20]); unlabeled.observations[0].dimensionsBasis = "unlabeled";
  assert.ok(estimate(input.name, kinds[0], { logisticsEvidence: unlabeled }));
  const master = evidence("gross_explicit", [600, 400, 200]); master.observations[0].packagingLevel = "master_case";
  assert.equal(estimate(input.name, kinds[0], { logisticsEvidence: master })?.draft.weightGrams, 180);
});
