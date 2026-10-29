import assert from "node:assert/strict";
import test from "node:test";
import type { AverageEstimateIdentity } from "./average-estimate";
import { estimateOwnerPackagingHypothesis, ownerPackagingHypothesesSchema } from "./owner-packaging-hypothesis";

const gtin = "00000000000017";
const input: AverageEstimateIdentity = { gtin, name: "Produto sem conteúdo identificado", requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
function manifest(extra = {}, product = input) {
  return { id: "hypothesis", label: "Hipótese autorizada de embalagem", container: "CARTON", members: [{ gtin: product.gtin, expectedName: product.name }],
    hypothesizedRetailSidesCm: [15, 9, 4], geometryMarginCm: 3, outerBoxCm: [24, 15, 10], grossPackageHypothesisGrams: 500, weightMarginPercent: 20,
    cargoKinds: ["unspecified"], rationale: "Hipótese autorizada para conferir antes da postagem.", weightHypothesis: "Peso bruto hipotético já inclui embalagens comercial e externa.", packingHypothesis: "Preparação precisa de conferência física.", ...extra };
}
function estimate(product = input, extra = {}) { return estimateOwnerPackagingHypothesis(product, [manifest(extra, product)]); }

test("manifesto estrito exige GTIN, nome, limites de grupos e membros e justificativas", () => {
  assert.ok(ownerPackagingHypothesesSchema.safeParse([manifest()]).success);
  for (const patch of [{ unexpected: true }, { members: [] }, { members: [{ gtin: "00000000000000", expectedName: input.name }] }, { members: [{ gtin, expectedName: "" }] }, { members: [{ gtin, expectedName: input.name, unknown: true }] }, { members: Array(501).fill({ gtin, expectedName: input.name }) },
    { container: "UNKNOWN" }, { cargoKinds: [] }, { cargoKinds: ["liquid", "liquid"] }, { cargoKinds: ["unknown"] }, { cargoKinds: undefined }, { hypothesizedRetailSidesCm: [9, 15, 4] }, { outerBoxCm: [15, 24, 10] }, { outerBoxCm: [201, 15, 10] },
    { geometryMarginCm: 0 }, { geometryMarginCm: 4 }, { geometryMarginCm: 1.5 }, { grossPackageHypothesisGrams: 0 }, { grossPackageHypothesisGrams: 25001 }, { grossPackageHypothesisGrams: 500.5 }, { weightMarginPercent: 9 }, { weightMarginPercent: 31 }, { weightMarginPercent: 20.5 }, { rationale: "x".repeat(2001) }, { weightHypothesis: "x".repeat(2001) }, { packingHypothesis: "x".repeat(2001) }]) {
    assert.equal(ownerPackagingHypothesesSchema.safeParse([manifest(patch)]).success, false, JSON.stringify(patch));
  }
  assert.equal(ownerPackagingHypothesesSchema.safeParse(Array(201).fill(manifest())).success, false);
  assert.equal(ownerPackagingHypothesesSchema.safeParse([manifest(), manifest()]).success, false);
  assert.equal(ownerPackagingHypothesesSchema.safeParse([manifest(), manifest({ id: "other" })]).success, false);
  assert.equal(ownerPackagingHypothesesSchema.safeParse([manifest({ members: [{ gtin, expectedName: input.name }, { gtin, expectedName: "Outro título" }] })]).success, false);
});

test("membro exige correspondência exata de GTIN e nome, sem normalização de identidade", () => {
  const manifests = [manifest()];
  for (const patch of [{ gtin: "00000000000024" }, { gtin: "00000000000018" }, { gtin: "0000000000017" }, { name: input.name.toUpperCase() }, { name: `${input.name} ` }, { name: "Outro título" }]) assert.equal(estimateOwnerPackagingHypothesis({ ...input, ...patch }, manifests), null);
});

test("fallback desconhecido é bruto completo: margem uma vez e nenhuma reserva repetida", () => {
  const result = estimate()!;
  assert.ok(result);
  assert.equal(result.policyVersion, "owner-packaging-hypothesis-v1");
  assert.equal(result.basis, "OWNER_PACKAGING_HYPOTHESIS");
  assert.equal(result.weightBasis, "OWNER_PACKAGE_GROSS_HYPOTHESIS");
  assert.equal(result.basePackageWeightGrams, 500);
  assert.equal(result.weightMarginPercent, 20);
  assert.equal(result.draft.weightGrams, 600);
  assert.equal(result.weightComputation, null);
  assert.equal(result.declaredContent, null); assert.equal(result.declaredUnit, null);
  assert.deepEqual(result.draft.cargoKinds, ["unspecified"]);
  assert.equal(result.draft.enabled, false); assert.equal(result.draft.transportReviewed, false);
  assert.equal(result.draft.measurementBasis, "estimated"); assert.equal(result.draft.reference, null);
  assert.deepEqual(result.draft.approvedServiceIds, []);
});

test("dosagens mg/mcg e concentrações não viram peso ou conteúdo no fallback", () => {
  for (const name of ["Produto 500 mg", "Produto 500 mcg", "Produto 50 mg/ml", "Produto dose não identificada"]) {
    const result = estimate({ ...input, name })!;
    assert.equal(result.draft.weightGrams, 600); assert.equal(result.declaredContent, null); assert.equal(result.declaredUnit, null);
  }
});

test("v4 individual mantém reservas e cálculo; nova margem incide no total uma vez", () => {
  const product = { ...input, name: "Losartana 50 mg 30 comprimidos", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY" };
  const result = estimate(product)!;
  assert.equal(result.weightBasis, "WEIGHT_POLICY");
  assert.equal(result.basePackageWeightGrams, 180); assert.equal(result.draft.weightGrams, 220);
  assert.equal(result.weightComputation?.retailPackagingReserveGrams, 30);
  assert.equal(result.weightComputation?.externalPackagingReserveGrams, 100);
  assert.equal(result.weightComputation?.roundingStepGrams, 10);
  assert.equal(result.weightComputation?.policyVersion, "weight-only-v4");
  assert.equal(result.declaredContent, 30); assert.equal(result.declaredUnit, "count");
  assert.deepEqual(result.draft.cargoKinds, ["unspecified", "medication"]);
});

function evidence(weightBasis: "gross_explicit" | "net" = "gross_explicit", sidesMm: number[] | null = null) {
  return { version: 1, gtin, review: { confirmed: false, note: "" }, observations: [{ id: "own", source: { gtin, url: "https://example.com/product", sha256: "a".repeat(64), capturedAt: "2026-10-29T00:00:00Z", excerpt: "Peso da unidade comercial" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 81, weightBasis, sidesMm, dimensionsBasis: "labeled_axes", notes: "", sideOrder: ["altura", "largura", "profundidade"] }] };
}

test("bruto próprio tem prioridade quando elegível; fonte líquida não é bruto", () => {
  const result = estimate({ ...input, logisticsEvidence: evidence() })!;
  assert.equal(result.weightBasis, "EXACT_GTIN_GROSS");
  assert.equal(result.basePackageWeightGrams, 190); assert.equal(result.draft.weightGrams, 230);
  assert.equal(result.weightComputation?.retailPackagingReserveGrams, 0);
  assert.deepEqual(result.sourceGtins, [gtin]); assert.deepEqual(result.sourceObservationIds, [`${gtin}:own`]); assert.deepEqual(result.sourceSha256, ["a".repeat(64)]);
  const net = estimate({ ...input, logisticsEvidence: evidence("net") })!;
  assert.equal(net.weightBasis, "OWNER_PACKAGE_GROSS_HYPOTHESIS"); assert.equal(net.draft.weightGrams, 600); assert.deepEqual(net.sourceGtins, []);
});

test("evidência inválida, divergente ou conflitante bloqueia fallback", () => {
  for (const logisticsEvidence of [{}, { ...evidence(), gtin: "00000000000024" }]) assert.equal(estimate({ ...input, logisticsEvidence }), null);
  const identityConflict = evidence(); identityConflict.observations[0].identityConflict = true;
  assert.equal(estimate({ ...input, logisticsEvidence: identityConflict }), null);
  const weights = evidence(); weights.observations.push({ ...weights.observations[0], id: "second", weightGrams: 82 });
  assert.equal(estimate({ ...input, logisticsEvidence: weights }), null);
  const dimensions = evidence("net", [60, 40, 20]); dimensions.observations.push({ ...dimensions.observations[0], id: "second", sidesMm: [70, 40, 20] });
  assert.equal(estimate({ ...input, logisticsEvidence: dimensions }), null);
});

test("dimensões próprias ativas identificadas deferem; rejeitadas, master e unlabeled não ancoram", () => {
  assert.equal(estimate({ ...input, logisticsEvidence: evidence("net", [60, 40, 20]) }), null);
  const rejected = { ...evidence("gross_explicit", [60, 40, 20]), sourceDecisions: [{ observationId: "own", state: "rejected", reason: "Fonte rejeitada na revisão" }] };
  const result = estimate({ ...input, logisticsEvidence: rejected })!;
  assert.equal(result.weightBasis, "OWNER_PACKAGE_GROSS_HYPOTHESIS"); assert.deepEqual(result.sourceGtins, []);
  const unlabeled = evidence("net", [60, 40, 20]); unlabeled.observations[0].dimensionsBasis = "unlabeled";
  assert.ok(estimate({ ...input, logisticsEvidence: unlabeled }));
  const master = evidence("gross_explicit", [600, 400, 200]); master.observations[0].packagingLevel = "master_case";
  assert.equal(estimate({ ...input, logisticsEvidence: master })?.weightBasis, "OWNER_PACKAGE_GROSS_HYPOTHESIS");
});

test("controlados, antimicrobianos, Popular e receita pendente continuam bloqueados", () => {
  for (const prescriptionType of ["CONTROLLED", "ANTIMICROBIAL"]) for (const requiresPrescription of [false, true]) assert.equal(estimate({ ...input, prescriptionType, requiresPrescription }), null);
  assert.equal(estimate({ ...input, isPopularPharmacy: true }), null);
  assert.equal(estimate({ ...input, requiresPrescription: true, prescriptionType: "UNREVIEWED" }), null);
  assert.equal(estimate({ ...input, requiresPrescription: true, prescriptionType: null }), null);
  assert.ok(estimate(input));
});

test("hipóteses de sprays, aerossóis, dispositivos e kits não aprovam transporte", () => {
  for (const [name, container] of [["Desodorante aerossol 150 ml", "AEROSOL"], ["Produto spray 50 ml", "BOTTLE"], ["Kit creme + shampoo 2 unidades", "KIT"], ["Aparelho digital", "DEVICE"], ["Produto sachê", "POUCH"], ["Produto blister", "BLISTER"], ["Produto bisnaga", "TUBE"]]) {
    const result = estimate({ ...input, name }, { container })!;
    assert.ok(result, name); assert.equal(result.weightBasis, "OWNER_PACKAGE_GROSS_HYPOTHESIS");
    assert.equal(result.hypothesis.assumedContainer, container); assert.equal(result.draft.enabled, false);
    assert.deepEqual(result.draft.cargoKinds, ["unspecified"]); assert.deepEqual(result.draft.approvedServiceIds, []);
  }
  const medication = estimate({ ...input, category: "Medicamentos", name: "Medicamento spray" }, { cargoKinds: ["unspecified", "aerosol", "medication"] })!;
  assert.deepEqual(medication.draft.cargoKinds, ["unspecified", "aerosol", "medication"]);
});

test("folga geométrica incide uma vez; caixa maior é hipótese sem confirmação", () => {
  for (const geometryMarginCm of [1, 2, 3]) {
    const result = estimate(input, { geometryMarginCm })!;
    assert.deepEqual(result.operationalUpperSidesCm, [15 + geometryMarginCm, 9 + geometryMarginCm, 4 + geometryMarginCm]);
    assert.equal(result.outerBoxSource, "OWNER_DECLARED"); assert.equal(result.largerBoxRequired, false);
  }
  for (const hypothesizedRetailSidesCm of [[21, 9, 4], [15, 12, 4], [15, 9, 7]]) assert.equal(estimate(input, { hypothesizedRetailSidesCm }), null);
  const larger = estimate(input, { hypothesizedRetailSidesCm: [30, 20, 12], outerBoxCm: [35, 25, 20] })!;
  assert.equal(larger.outerBoxSource, "PLANNED_NOT_CONFIRMED"); assert.equal(larger.largerBoxRequired, true);
  assert.deepEqual([larger.draft.lengthCm, larger.draft.widthCm, larger.draft.heightCm], [35, 25, 20]);
});

test("margem percentual limitada, arredondamento em 10 g e teto de 30 kg", () => {
  for (const [grossPackageHypothesisGrams, weightMarginPercent, expected] of [[500, 10, 550], [500, 30, 650], [501, 20, 610], [25000, 20, 30000], [1, 10, 10]]) assert.equal(estimate(input, { grossPackageHypothesisGrams, weightMarginPercent })?.draft.weightGrams, expected);
  assert.equal(estimate(input, { grossPackageHypothesisGrams: 25000, weightMarginPercent: 30 }), null);
});

test("resultado determinístico sem mutação, amostras fictícias ou fatos físicos inferidos", () => {
  const manifests = [manifest()]; const before = structuredClone({ input, manifests });
  const result = estimateOwnerPackagingHypothesis(input, manifests)!;
  assert.deepEqual(result, estimateOwnerPackagingHypothesis(input, manifests)); assert.deepEqual({ input, manifests }, before);
  assert.equal(result.geometrySource, "OWNER_AUTHORIZED_HYPOTHESIS"); assert.equal(result.geometrySampleCount, 0); assert.deepEqual(result.geometrySourceGtins, []);
  assert.deepEqual(result.sourceGtins, []); assert.deepEqual(result.sourceObservationIds, []); assert.deepEqual(result.sourceSha256, []);
  assert.equal(result.material, null); assert.equal(result.closure, null); assert.equal(result.tare, null); assert.equal(result.innerDimensions, null);
  assert.equal(result.packingFitConfirmed, false); assert.equal(result.protectionCalibrated, false);
  for (const field of ["logisticsEvidence", "observations", "meanRetailSidesCm", "PackagingRecipe"]) assert.equal(field in result, false);
  assert.match(result.explanation, /hipótese/i); assert.match(result.explanation, /não.*(?:medid|medição)/i);
});

test("manifesto documental exige uma referência explícita e um único membro", () => {
  assert.ok(ownerPackagingHypothesesSchema.safeParse([manifest({ geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "own" })]).success);
  for (const extra of [{ geometryObservationId: "own" }, { geometryMode: "OWNER_HYPOTHESIS", geometryObservationId: "own" }, { geometryMode: "OWN_DOCUMENTARY_REFERENCE" },
    { geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "" }, { geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "own", members: [{ gtin, expectedName: input.name }, { gtin: "00000000000024", expectedName: "Outro produto" }] }]) {
    assert.equal(ownerPackagingHypothesesSchema.safeParse([manifest(extra)]).success, false, JSON.stringify(extra));
  }
});

test("documentos labeled_axes e carton_die fornecem geometria própria sem promover peso unspecified", () => {
  for (const [dimensionsBasis, weightGrams] of [["labeled_axes", 227], ["carton_die", 36]] as const) {
    const document = evidence("net", [40, 60, 20]);
    Object.assign(document.observations[0], { weightBasis: "unspecified", weightGrams, dimensionsBasis });
    const product = { ...input, logisticsEvidence: document };
    const result = estimate(product, { geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "own", hypothesizedRetailSidesCm: [6, 4, 2] });
    assert.ok(result);
    assert.equal(result.geometrySource, "OWN_DOCUMENTARY_REFERENCE");
    assert.deepEqual(result.geometryReference, { gtin, observationId: "own", sourceSha256: "a".repeat(64), dimensionsBasis, sourceSidesMm: [40, 60, 20], orderedSidesCm: [6, 4, 2], physicalMeasurementConfirmed: false });
    assert.equal(result.geometrySampleCount, 0); assert.deepEqual(result.geometrySourceGtins, []);
    assert.deepEqual(result.sourceGtins, []); assert.deepEqual(result.sourceObservationIds, []); assert.deepEqual(result.sourceSha256, []);
    assert.equal(result.weightBasis, "OWNER_PACKAGE_GROSS_HYPOTHESIS"); assert.equal(result.draft.weightGrams, 600);
    assert.match(result.explanation, /documental/i); assert.match(result.explanation, /históric/i);
    if (dimensionsBasis === "carton_die") assert.match(result.explanation, /carton_die/);
    assert.equal(estimate(product), null);
  }
});

test("documento geométrico não exclui bruto próprio nem a política v4 individual", () => {
  const result = estimate({ ...input, logisticsEvidence: evidence("gross_explicit", [40, 60, 20]) }, { geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "own", hypothesizedRetailSidesCm: [6, 4, 2] })!;
  assert.equal(result.weightBasis, "EXACT_GTIN_GROSS"); assert.equal(result.draft.weightGrams, 230);
  assert.deepEqual(result.sourceObservationIds, [`${gtin}:own`]); assert.equal(result.geometryReference?.observationId, "own");
  const medicine = { ...input, name: "Losartana 50 mg 30 comprimidos", category: "Medicamentos", logisticsEvidence: evidence("net", [60, 40, 20]) };
  const policy = estimate(medicine, { geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "own", hypothesizedRetailSidesCm: [6, 4, 2] })!;
  assert.equal(policy.weightBasis, "WEIGHT_POLICY"); assert.equal(policy.draft.weightGrams, 220); assert.deepEqual(policy.sourceGtins, []);
  assert.equal(estimate()?.geometryReference, null);
});

test("falha documental nunca recai na geometria hipotética, inclusive documento inativo ou ambiguamente identificado", () => {
  const options = { geometryMode: "OWN_DOCUMENTARY_REFERENCE", geometryObservationId: "own", hypothesizedRetailSidesCm: [6, 4, 2] };
  assert.equal(estimate(input, options), null);
  const product = { ...input, logisticsEvidence: evidence("net", [60, 40, 20]) };
  assert.equal(estimate(product, { ...options, geometryObservationId: "missing" }), null);
  assert.equal(estimate(product, { ...options, hypothesizedRetailSidesCm: [6.1, 4, 2] }), null);
  assert.equal(estimate(product, { ...options, outerBoxCm: [9, 7, 5] }), null);
  for (const patch of [{ packagingLevel: "master_case" }, { units: 2 }, { units: null }, { identityConflict: true }, { sidesMm: null }, { sidesMm: [0, 40, 20] }, { dimensionsBasis: "unlabeled" }]) {
    const document = evidence("net", [60, 40, 20]); Object.assign(document.observations[0], patch);
    assert.equal(estimate({ ...input, logisticsEvidence: document }, options), null, JSON.stringify(patch));
  }
  const rejected = { ...evidence("net", [60, 40, 20]), sourceDecisions: [{ observationId: "own", state: "rejected", reason: "Documento rejeitado na revisão" }] };
  assert.equal(estimate({ ...input, logisticsEvidence: rejected }, options), null);
  const divergent = evidence("net", [60, 40, 20]); divergent.observations[0].source.gtin = "00000000000024";
  assert.equal(estimate({ ...input, logisticsEvidence: divergent }, options), null);
  const conflict = evidence("net", [60, 40, 20]); conflict.observations.push({ ...conflict.observations[0], id: "other", sidesMm: [70, 40, 20] });
  assert.equal(estimate({ ...input, logisticsEvidence: conflict }, options), null);
});
