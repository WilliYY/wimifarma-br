import assert from "node:assert/strict";
import test from "node:test";
import type { AverageEstimateIdentity } from "./average-estimate";
import { estimatePlannedContainer, plannedContainerSchema, plannedContainersSchema } from "./planned-container";

function gtin(n: number) {
  const body = `0789000000${String(n).padStart(3, "0")}`;
  const sum = [...body].reverse().reduce((s, d, i) => s + Number(d) * (i % 2 ? 1 : 3), 0);
  return body + (10 - sum % 10) % 10;
}
const medicine = { name: "Medicamento sintético 30 comprimidos", category: "Medicamentos", brand: "Marca alvo", activeIngredients: ["substância alvo"], requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };
const target: AverageEstimateIdentity = { ...medicine, gtin: gtin(99), logisticsEvidence: null };
function sample(n: number, count = 30, sidesMm = [100, 60, 20], weightGrams: number | null = null): AverageEstimateIdentity {
  const code = gtin(n);
  return { ...medicine, name: `Medicamento sintético ${count} comprimidos`, brand: `Marca referência ${n}`, activeIngredients: [`substância ${n}`], gtin: code, logisticsEvidence: { version: 1, gtin: code, review: { confirmed: false, note: "" }, sourceDecisions: [], observations: [{ id: `sample-${n}`, source: { url: `https://example.org/synthetic-${n}`, capturedAt: "2026-10-28T00:00:00Z", sha256: String(n % 10).repeat(64), gtin: code, excerpt: "Geometria sintética da unidade comercial" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams, weightBasis: weightGrams === null ? "unspecified" : "gross_explicit", sidesMm, dimensionsBasis: "labeled_axes", sideOrder: ["comprimento", "largura", "altura"], notes: "" }] } };
}
const references = [sample(1, 4, [100, 60, 20], 10), sample(2, 8, [110, 65, 25], 1000), sample(3, 20, [120, 70, 30]), sample(4, 30, [145, 85, 35])];
const manifest = { id: "planned-tablets", label: "Caixa planejada de comprimidos", kind: "NORMAL_TABLETS_1_TO_30", countMin: 1, countMax: 30, geometryMarginCm: 2, outerBoxCm: [24, 15, 10], memberGtins: [target.gtin], referenceGtins: references.map(item => item.gtin), rationale: "Cenário operacional autorizado para a caixa externa informada.", packingHypothesis: "Caixa planejada sem calibração da proteção, tara ou medição interna." };

test("planned box separates cross-brand geometry from individual weight and preserves inputs", () => {
  const before = JSON.stringify({ target, references, manifest });
  const result = estimatePlannedContainer(target, references, [manifest]);
  assert.ok(result);
  assert.equal(result.policyVersion, "planned-container-v2");
  assert.equal(result.basis, "PLANNED_OUTER_BOX");
  assert.equal(result.draft.weightGrams, 180);
  assert.equal(result.weightBasis, "WEIGHT_POLICY");
  assert.deepEqual(result.weightComputation, { policyVersion: "weight-only-v4", family: "ORAL_SOLID", declaredContent: 30, declaredUnit: "count", densityHypothesisGramsPerMl: null, estimatedRetailGrams: 80, retailPackagingReserveGrams: 30, externalPackagingReserveGrams: 100, roundingStepGrams: 10 });
  assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], [24, 15, 10]);
  assert.equal(result.sampleCount, 4);
  assert.deepEqual(result.observedCounts, [4, 8, 20, 30]);
  assert.deepEqual(result.minimumRetailSidesCm, [10, 6, 2]);
  assert.deepEqual(result.maximumRetailSidesCm, [14.5, 8.5, 3.5]);
  assert.deepEqual(result.meanRetailSidesCm, [11.875, 7, 2.75]);
  assert.equal(result.externalBoxSource, "OWNER_DECLARED");
  assert.equal(result.innerDimensions, null);
  assert.equal(result.tare, null);
  assert.equal(result.packingFitConfirmed, false);
  assert.equal(result.protectionCalibrated, false);
  assert.equal(result.draft.enabled, false);
  assert.equal(result.draft.transportReviewed, false);
  assert.equal(result.draft.reference, null);
  assert.deepEqual(result.draft.approvedServiceIds, []);
  assert.equal(result.draft.measurementBasis, "estimated");
  assert.equal("meanRetailWeightGrams" in result, false);
  assert.match(result.explanation, /não.*(?:comprova|confirmad)/i);
  assert.deepEqual(estimatePlannedContainer(target, [...references].reverse(), [manifest]), result);
  assert.equal(JSON.stringify({ target, references, manifest }), before);
});

test("planned manifests are strict, fixed and bounded while references may be shared", () => {
  assert.equal(plannedContainerSchema.safeParse(manifest).success, true);
  for (const patch of [{ unknown: true }, { countMin: 2 }, { countMax: 31 }, { outerBoxCm: [25, 15, 10] }, { outerBoxCm: [24, 10, 15] }, { kind: "ORAL_TABLETS" }, { packingHypothesis: "" }, { memberGtins: [] }, { memberGtins: [target.gtin, target.gtin] }, { memberGtins: Array(501).fill(target.gtin) }, { referenceGtins: [gtin(1)] }, { referenceGtins: [gtin(1), gtin(1)] }, { referenceGtins: Array(101).fill(gtin(1)) }]) assert.equal(plannedContainerSchema.safeParse({ ...manifest, ...patch }).success, false, JSON.stringify(patch));
  assert.equal(plannedContainersSchema.safeParse([manifest, manifest]).success, false);
  assert.equal(plannedContainersSchema.safeParse([manifest, { ...manifest, id: "other" }]).success, false);
  assert.equal(plannedContainersSchema.safeParse([manifest, { ...manifest, id: "other", memberGtins: [gtin(88)] }]).success, true);
  assert.equal(plannedContainersSchema.safeParse(Array(101).fill(manifest)).success, false);
  assert.equal(estimatePlannedContainer({ ...target, gtin: gtin(88) }, references, [manifest]), null);
});

test("own labelled dimensions defer and own exact gross remains individual", () => {
  const own = { ...sample(99, 30, [80, 50, 20], 250), brand: target.brand };
  assert.equal(estimatePlannedContainer(own, references, [manifest]), null);
  const evidence = own.logisticsEvidence as { observations: Array<{ sidesMm: number[] | null }> };
  evidence.observations[0].sidesMm = null;
  const result = estimatePlannedContainer(own, references, [manifest]);
  assert.equal(result?.draft.weightGrams, 350);
  assert.equal(result?.weightBasis, "EXACT_GTIN_GROSS");
  assert.ok(result?.sourceObservationIds.includes(`${own.gtin}:sample-99`));
});

test("invalid and conflicting target evidence never permits a planned box", () => {
  assert.equal(estimatePlannedContainer({ ...target, logisticsEvidence: {} }, references, [manifest]), null);
  assert.equal(estimatePlannedContainer({ ...target, logisticsEvidence: sample(1).logisticsEvidence }, references, [manifest]), null);
  const own = sample(99);
  const evidence = own.logisticsEvidence as { observations: Array<Record<string, unknown>> };
  evidence.observations.push({ ...evidence.observations[0], id: "conflict", sidesMm: [150, 60, 20] });
  assert.equal(estimatePlannedContainer(own, references, [manifest]), null);
});

test("normal tablet range keeps sanitary, presentation and multipack guards", () => {
  for (const count of [1, 10, 30]) assert.ok(estimatePlannedContainer({ ...target, name: `Medicamento ${count} comprimidos` }, references, [manifest]));
  for (const patch of [{ isPopularPharmacy: true }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "UNREVIEWED" }, ...["Medicamento 31 comprimidos", "Medicamento 0 comprimidos", "Medicamento 1,5 comprimidos", "Medicamento 30 cápsulas", "Medicamento 30 drágeas", "Medicamento frasco 30 comprimidos", "Medicamento pote 30 comprimidos", "Medicamento sachê 30 comprimidos", "Medicamento 30 comprimidos sublinguais", "Medicamento LP 30 comprimidos", "Medicamento EC 30 comprimidos", "Medicamento XR 30 comprimidos", "Medicamento 30 comprimidos mastigáveis", "Medicamento 30 comprimidos efervescentes", "Kit medicamento 30 comprimidos", "Medicamento L3P2 30 comprimidos", "Medicamento L 3 P 2 30 comprimidos", "Medicamento 2x30 comprimidos", "Medicamento 30 comprimidos 2un", "Medicamento refrigerado 30 comprimidos", "Medicamento vidro 30 comprimidos"].map(name => ({ name }))]) assert.equal(estimatePlannedContainer({ ...target, ...patch }, references, [manifest]), null, JSON.stringify(patch));
});

test("references require distinct current retail geometry including a 30-tablet sample", () => {
  assert.equal(estimatePlannedContainer(target, references.slice(0, 3), [manifest]), null);
  assert.equal(estimatePlannedContainer(target, [references[3]], [manifest]), null);
  assert.equal(estimatePlannedContainer(target, [references[0], references[3], references[3]], [manifest]), null);
  for (const patch of [{ packagingLevel: "master_case", units: 12 }, { dimensionsBasis: "unlabeled" }, { identityConflict: true }, { sidesMm: null }]) {
    const altered = structuredClone(references[3]);
    Object.assign((altered.logisticsEvidence as { observations: object[] }).observations[0], patch);
    assert.equal(estimatePlannedContainer(target, [references[0], altered], [manifest]), null, JSON.stringify(patch));
  }
  for (const state of ["rejected", "superseded"]) {
    const altered = structuredClone(references[3]);
    (altered.logisticsEvidence as { sourceDecisions: object[] }).sourceDecisions = [{ observationId: "sample-4", state, reason: "Fonte sintética retirada" }];
    assert.equal(estimatePlannedContainer(target, [references[0], altered], [manifest]), null);
  }
  assert.equal(estimatePlannedContainer(target, [references[0], { ...references[3], name: "Medicamento LP 30 comprimidos" }], [manifest]), null);
  assert.equal(estimatePlannedContainer(target, [references[0], { ...references[3], logisticsEvidence: {} }], [manifest]), null);
  const die = structuredClone(references[3]);
  (die.logisticsEvidence as { observations: Array<{ dimensionsBasis: string }> }).observations[0].dimensionsBasis = "carton_die";
  assert.ok(estimatePlannedContainer(target, [references[0], die], [manifest]));
  const conflict = structuredClone(references[3]);
  const evidence = conflict.logisticsEvidence as { observations: Array<Record<string, unknown>> };
  evidence.observations.push({ ...evidence.observations[0], id: "conflict", sidesMm: [150, 90, 40] });
  assert.equal(estimatePlannedContainer(target, [references[0], conflict], [manifest]), null);
});

test("observed geometry plus protection must remain strictly below the outer box and within spread", () => {
  assert.ok(estimatePlannedContainer(target, [sample(1, 4), sample(4, 30, [200, 60, 20])], [manifest]));
  for (const sides of [[220, 80, 30], [150, 130, 30], [150, 90, 80], [201, 60, 20]]) {
    const small = sample(1, 4, [100, 60, 20]);
    const big = sample(4, 30, sides);
    assert.equal(estimatePlannedContainer(target, [small, big], [manifest]), null, JSON.stringify(sides));
  }
});

test("partial net evidence stays partial and cannot become a gross weight or new retail evidence", () => {
  const own = sample(99, 30, [80, 50, 20], 5);
  const ownEvidence = own.logisticsEvidence as { observations: Array<{ sidesMm: number[] | null; weightBasis: string }> };
  ownEvidence.observations[0].sidesMm = null;
  ownEvidence.observations[0].weightBasis = "net";
  const sources = references.map(item => structuredClone(item));
  for (const source of sources) (source.logisticsEvidence as { observations: Array<{ weightBasis: string }> }).observations[0].weightBasis = "net";
  const before = JSON.stringify({ own, sources });
  const result = estimatePlannedContainer(own, sources, [manifest]);
  assert.equal(result?.draft.weightGrams, 180);
  assert.equal(result?.weightBasis, "WEIGHT_POLICY");
  assert.equal(result?.sourceGtins.includes(own.gtin), false);
  assert.equal(JSON.stringify({ own, sources }), before);
});

test("planned box excludes inconsistent antimicrobial flags", () => {
  assert.equal(estimatePlannedContainer({ ...target, requiresPrescription: false, prescriptionType: "ANTIMICROBIAL" }, references, [manifest]), null);
});

test("planned box excludes spaced special-release forms as targets and references", () => {
  for (const release of ["gastro-resistente", "gastro resistente"]) {
    const name = `Medicamento 30 comprimidos ${release}`;
    assert.equal(estimatePlannedContainer({ ...target, name }, references, [manifest]), null, name);
    assert.equal(estimatePlannedContainer(target, [references[0], { ...references[3], name }], [manifest]), null, `reference ${name}`);
  }
});

test("geometry margin is required, integral from one to three, and added only once", () => {
  for (const geometryMarginCm of [1, 2, 3]) {
    const result = estimatePlannedContainer(target, references, [{ ...manifest, geometryMarginCm }]);
    assert.ok(result);
    assert.equal(result.geometryMarginCm, geometryMarginCm);
    assert.deepEqual(result.operationalUpperSidesCm, [14.5 + geometryMarginCm, 8.5 + geometryMarginCm, 3.5 + geometryMarginCm]);
    assert.deepEqual(result.maximumRetailSidesCm, [14.5, 8.5, 3.5]);
    assert.equal("operationalLowerSidesCm" in result, false);
    assert.equal("protectionPerAxisCm" in result, false);
  }
  for (const geometryMarginCm of [undefined, null, 0, 4, 1.5, "2"]) assert.equal(plannedContainerSchema.safeParse({ ...manifest, geometryMarginCm }).success, false);
});

test("the operational upper envelope must be strictly below the box at every margin", () => {
  for (const geometryMarginCm of [1, 2, 3]) {
    const peers = [sample(1, 20, [150, 60, 30]), sample(4, 30, [(24 - geometryMarginCm) * 10, 85, 35])];
    assert.equal(estimatePlannedContainer(target, peers, [{ ...manifest, geometryMarginCm }]), null);
    const below = [peers[0], sample(4, 30, [(23.9 - geometryMarginCm) * 10, 85, 35])];
    assert.ok(estimatePlannedContainer(target, below, [{ ...manifest, geometryMarginCm }]));
  }
});

const dentalTarget = { ...target, name: "Creme dental sintético 120g", category: "Higiene", requiresPrescription: false, prescriptionType: "UNREVIEWED" };
const dentalManifest = { id: "planned-dental", label: "Caixa planejada dental até 140 g", kind: "DENTAL_TUBE_UP_TO_140G", contentMaxGrams: 140, geometryMarginCm: 3, outerBoxCm: [24, 15, 10], memberGtins: [target.gtin], referenceGtins: [gtin(1), gtin(4)], rationale: manifest.rationale, packingHypothesis: "Cenário revisado de tubos dentais individuais; caixa e proteção não calibradas." };
const dentalReferences = [sample(1, 20, [170, 46, 38], 109), sample(4, 30, [203, 46, 38], 166)].map((item, index) => ({ ...item, name: `Creme dental sintético ${index === 0 ? 90 : 140}g`, category: "Higiene bucal", requiresPrescription: false, prescriptionType: "UNREVIEWED" }));

test("dental tube scenario accepts distinct 90 and 140 gram references without aggregated weights", () => {
  const before = JSON.stringify({ dentalTarget, dentalManifest, dentalReferences });
  assert.equal(plannedContainerSchema.safeParse(dentalManifest).success, true);
  assert.equal(plannedContainerSchema.safeParse({ ...dentalManifest, countMax: 30 }).success, false);
  assert.equal(plannedContainerSchema.safeParse({ ...dentalManifest, contentMaxGrams: 180 }).success, false);
  const result = estimatePlannedContainer(dentalTarget, dentalReferences, [dentalManifest]);
  assert.ok(result);
  assert.equal(result.policyVersion, "planned-container-v2");
  assert.equal(result.draft.weightGrams, 250);
  assert.equal(result.weightBasis, "WEIGHT_POLICY");
  assert.deepEqual(result.weightComputation, { policyVersion: "weight-only-v4", family: "HYGIENE_MASS", declaredContent: 120, declaredUnit: "g", densityHypothesisGramsPerMl: null, estimatedRetailGrams: 150, retailPackagingReserveGrams: 30, externalPackagingReserveGrams: 100, roundingStepGrams: 10 });
  assert.deepEqual(result.maximumRetailSidesCm, [20.3, 4.6, 3.8]);
  assert.deepEqual(result.operationalUpperSidesCm, [23.3, 7.6, 6.8]);
  assert.deepEqual(result.observedContentsGrams, [90, 140]);
  assert.deepEqual(result.observedCounts, []);
  assert.deepEqual(result.draft.approvedServiceIds, []);
  assert.equal(result.packingFitConfirmed, false);
  for (const name of ["Gel dental tubo sintético 140g", "Pasta dental bisnaga sintética 90g"]) assert.ok(estimatePlannedContainer({ ...dentalTarget, name }, dentalReferences, [dentalManifest]), name);
  const only90 = dentalReferences.map(item => ({ ...item, name: "Creme dental sintético 90g" }));
  assert.equal(estimatePlannedContainer(dentalTarget, only90, [dentalManifest]), null);
  assert.deepEqual(estimatePlannedContainer(dentalTarget, [...dentalReferences].reverse(), [dentalManifest]), result);
  assert.equal(JSON.stringify({ dentalTarget, dentalManifest, dentalReferences }), before);
});

test("dental scenario keeps clinical, retail-unit, contradiction and own-reference guards", () => {
  for (const patch of [{ requiresPrescription: true, prescriptionType: "ORDINARY" }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "ANTIMICROBIAL" }, { isPopularPharmacy: true }, { category: "Medicamentos" }, { category: "Categoria desconhecida" }, ...["Creme dental 180g", "Creme dental pote 120g", "Creme dental refil 120g", "Kit creme dental 120g", "Creme dental L3P2 120g", "Creme dental 2x120g", "Creme dental 120g4un", "Creme dental clínico 120g", "Creme dental profissional 120g", "Creme dental 120ml", "Creme dental aerossol 120g", "Creme dental vidro 120g", "Creme dental refrigerado 120g"].map(name => ({ name }))]) assert.equal(estimatePlannedContainer({ ...dentalTarget, ...patch }, dentalReferences, [dentalManifest]), null, JSON.stringify(patch));
  const unknownUnit = structuredClone(dentalReferences[1]);
  Object.assign((unknownUnit.logisticsEvidence as { observations: object[] }).observations[0], { packagingLevel: "unknown", units: null });
  assert.equal(estimatePlannedContainer(dentalTarget, [dentalReferences[0], unknownUnit], [dentalManifest]), null);
  const own = { ...sample(99, 30, [200, 46, 38], 150), ...dentalTarget, logisticsEvidence: sample(99, 30, [200, 46, 38], 150).logisticsEvidence };
  assert.equal(estimatePlannedContainer(own, dentalReferences, [dentalManifest]), null);
  const ownEvidence = own.logisticsEvidence as { observations: Array<Record<string, unknown>> };
  ownEvidence.observations[0].sidesMm = null;
  assert.equal(estimatePlannedContainer(own, dentalReferences, [dentalManifest])?.draft.weightGrams, 250);
  ownEvidence.observations.push({ ...ownEvidence.observations[0], id: "conflict", weightGrams: 900 });
  assert.equal(estimatePlannedContainer(own, dentalReferences, [dentalManifest]), null);
  const altered = structuredClone(dentalReferences[1]);
  (altered.logisticsEvidence as { sourceDecisions: object[] }).sourceDecisions = [{ observationId: "sample-4", state: "superseded", reason: "Fonte sintética retirada" }];
  assert.equal(estimatePlannedContainer(dentalTarget, [dentalReferences[0], altered], [dentalManifest]), null);
});

const shampooTarget = { ...target, name: "Shampoo sintético frasco plástico 200ml", category: "Cabelos", requiresPrescription: false, prescriptionType: "UNREVIEWED" };
const shampooContainer = { id: "planned-shampoo", label: "Caixa planejada de shampoo até 400 ml", kind: "SHAMPOO_BOTTLE_UP_TO_400ML", contentMaxMl: 400, geometryMarginCm: 3, outerBoxCm: manifest.outerBoxCm, memberGtins: manifest.memberGtins, referenceGtins: [gtin(1), gtin(4)], rationale: manifest.rationale, packingHypothesis: "Cenário revisado de frascos plásticos individuais com tampa convencional; encaixe e proteção não calibrados." };
const shampooReferences = [sample(1, 20, [204, 82, 43], 400), sample(4, 30, [178, 96.5, 48.5], 500)].map(item => ({ ...item, name: "Shampoo sintético frasco plástico 400ml", category: "Higiene infantil", requiresPrescription: false, prescriptionType: "UNREVIEWED" }));
(shampooReferences[0].logisticsEvidence as { observations: Array<{ weightBasis: string }> }).observations[0].weightBasis = "net";

test("shampoo bottle scenario uses ml density individually and net references only for geometry", () => {
  const before = JSON.stringify({ shampooTarget, shampooContainer, shampooReferences });
  assert.equal(plannedContainerSchema.safeParse(shampooContainer).success, true);
  assert.equal(plannedContainerSchema.safeParse({ ...shampooContainer, contentMaxMl: 500 }).success, false);
  const result = estimatePlannedContainer(shampooTarget, shampooReferences, [shampooContainer]);
  assert.ok(result);
  assert.equal(result.policyVersion, "planned-container-v2");
  assert.equal(result.draft.weightGrams, 390);
  assert.equal(result.weightBasis, "WEIGHT_POLICY");
  assert.deepEqual(result.weightComputation, { policyVersion: "weight-only-v4", family: "HYGIENE_VOLUME", declaredContent: 200, declaredUnit: "ml", densityHypothesisGramsPerMl: 1.3, estimatedRetailGrams: 290, retailPackagingReserveGrams: 30, externalPackagingReserveGrams: 100, roundingStepGrams: 10 });
  assert.deepEqual(result.maximumRetailSidesCm, [20.4, 9.65, 4.85]);
  assert.deepEqual(result.operationalUpperSidesCm, [23.4, 12.65, 7.85]);
  assert.deepEqual(result.observedContentsMl, [400]);
  assert.deepEqual(result.observedContentsGrams, []);
  assert.deepEqual(result.observedCounts, []);
  assert.equal(result.packingFitConfirmed, false);
  assert.equal(result.protectionCalibrated, false);
  assert.deepEqual(estimatePlannedContainer(shampooTarget, [...shampooReferences].reverse(), [shampooContainer]), result);
  assert.equal(JSON.stringify({ shampooTarget, shampooContainer, shampooReferences }), before);
});

test("shampoo requires two retail references, a 400 ml anchor and ordinary individual bottles", () => {
  assert.equal(estimatePlannedContainer(shampooTarget, shampooReferences.slice(0, 1), [shampooContainer]), null);
  assert.equal(estimatePlannedContainer(shampooTarget, shampooReferences.map(item => ({ ...item, name: "Shampoo sintético 200ml" })), [shampooContainer]), null);
  for (const patch of [{ brand: null }, { brand: "Não informado" }, { category: "Medicamentos" }, { category: "Categoria desconhecida" }, { requiresPrescription: true, prescriptionType: "ORDINARY" }, { prescriptionType: "ANTIMICROBIAL" }, { prescriptionType: "CONTROLLED" }, { isPopularPharmacy: true }, ...["Shampoo 500ml", "Shampoo 200g", "Condicionador 200ml", "Sh sintético 200ml", "Shampoo refil 200ml", "Kit shampoo 200ml", "Shampoo L3P2 200ml", "Shampoo 2x200ml", "Shampoo 200ml4un", "Shampoo pump 200ml", "Shampoo válvula 200ml", "Shampoo dosador 200ml", "Shampoo sachê 200ml", "Shampoo vidro 200ml", "Shampoo sólido 200ml", "Shampoo barra 200ml", "Shampoo medicinal 200ml", "Shampoo aerossol 200ml", "Shampoo refrigerado 200ml", "Shampoo tubo 200ml", "Shampoo bisnaga 200ml"].map(name => ({ name }))]) assert.equal(estimatePlannedContainer({ ...shampooTarget, ...patch }, shampooReferences, [shampooContainer]), null, JSON.stringify(patch));
  const wrongUnit = structuredClone(shampooReferences[1]);
  Object.assign((wrongUnit.logisticsEvidence as { observations: object[] }).observations[0], { packagingLevel: "unknown", units: null });
  assert.equal(estimatePlannedContainer(shampooTarget, [shampooReferences[0], wrongUnit], [shampooContainer]), null);
  assert.equal(estimatePlannedContainer(shampooTarget, [shampooReferences[0], { ...shampooReferences[1], name: "Shampoo pump 400ml" }], [shampooContainer]), null);
});

test("own shampoo geometry defers and exact gross stays independent of reference weights", () => {
  const own = { ...sample(99, 30, [180, 80, 40], 500), ...shampooTarget, logisticsEvidence: sample(99, 30, [180, 80, 40], 500).logisticsEvidence };
  assert.equal(estimatePlannedContainer(own, shampooReferences, [shampooContainer]), null);
  const evidence = own.logisticsEvidence as { observations: Array<Record<string, unknown>> };
  evidence.observations[0].sidesMm = null;
  const result = estimatePlannedContainer(own, shampooReferences, [shampooContainer]);
  assert.equal(result?.draft.weightGrams, 600);
  assert.equal(result?.weightBasis, "EXACT_GTIN_GROSS");
  assert.equal(result?.weightComputation.retailPackagingReserveGrams, 0);
  evidence.observations.push({ ...evidence.observations[0], id: "conflict", weightGrams: 900 });
  assert.equal(estimatePlannedContainer(own, shampooReferences, [shampooContainer]), null);
});
