import assert from "node:assert/strict";
import test from "node:test";
import { estimateFamilyShipping, familyGroupSchema, familyGroupsSchema } from "./family-estimate";
import type { AverageEstimateIdentity } from "./average-estimate";

function gtin(n: number) {
  const body = `0789000000${String(n).padStart(3, "0")}`;
  const sum = [...body].reverse().reduce((s, d, i) => s + Number(d) * (i % 2 ? 1 : 3), 0);
  return body + (10 - sum % 10) % 10;
}
const identity = { name: "Medicamento sintético 50 mg 30 comprimidos", brand: "Marca sintética", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false };
const target = { ...identity, gtin: gtin(99), logisticsEvidence: null };
function sample(n: number, weightGrams: number | null = null, sidesMm = [80, 50, 20]): AverageEstimateIdentity {
  const code = gtin(n);
  return { ...identity, gtin: code, logisticsEvidence: { version: 1, gtin: code, review: { confirmed: false, note: "" }, sourceDecisions: [], observations: [{ id: `sample-${n}`, source: { url: `https://example.org/synthetic-${n}`, capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin: code, excerpt: "Dimensões da unidade sintética" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams, weightBasis: weightGrams === null ? "unspecified" : "gross_explicit", sidesMm, dimensionsBasis: "labeled_axes", sideOrder: ["comprimento", "largura", "altura"], notes: "" }] } };
}
const group = { id: "synthetic-tablets", label: "Comprimidos sintéticos", brands: ["Marca sintética"], kind: "ORAL_TABLETS" as const, quantity: 30, memberGtins: [gtin(99), gtin(1), gtin(2), gtin(3)], referenceGtins: [gtin(1), gtin(2)], rationale: "Comparação revisada de apresentações com mesma contagem.", packagingHypothesis: "Cenário de cartucho externo; recipiente e encaixe não confirmados fisicamente." };
const catalog = [sample(1), sample(2, null, [90, 60, 30])];

test("reviewed family uses dimension-only references, own weight policy and explicit scenario", () => {
  const before = JSON.stringify(catalog);
  const result = estimateFamilyShipping(target, catalog, [group]);
  assert.ok(result);
  assert.equal(result.policyVersion, "reviewed-family-v1");
  assert.equal(result.basis, "REVIEWED_FAMILY");
  assert.equal(result.weightBasis, "WEIGHT_POLICY");
  assert.equal(result.draft.weightGrams, 180);
  assert.deepEqual(result.minimumRetailSidesCm, [8, 5, 2]);
  assert.deepEqual(result.meanRetailSidesCm, [8.5, 5.5, 2.5]);
  assert.deepEqual(result.maximumRetailSidesCm, [9, 6, 3]);
  assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], [11, 8, 5]);
  assert.equal(result.meanRetailWeightGrams, null);
  assert.equal(result.draft.enabled, false);
  assert.equal(result.draft.transportReviewed, false);
  assert.equal(result.draft.measurementBasis, "estimated");
  assert.equal(result.draft.reference, null);
  assert.deepEqual(result.sourceObservationIds, [`${gtin(1)}:sample-1`, `${gtin(2)}:sample-2`]);
  assert.match(result.explanation, /não confirmad/i);
  assert.equal(JSON.stringify(catalog), before);
  assert.deepEqual(estimateFamilyShipping(target, [...catalog].reverse(), [group]), result);
});

test("manifest is strict, bounded, explicit and rejects ambiguous memberships", () => {
  for (const patch of [{ unexpected: true }, { packagingHypothesis: "" }, { referenceGtins: [gtin(1)] }, { referenceGtins: [gtin(1), gtin(1)] }, { referenceGtins: [gtin(1), gtin(88)] }, { memberGtins: Array(501).fill(gtin(1)) }]) assert.equal(familyGroupSchema.safeParse({ ...group, ...patch }).success, false);
  assert.equal(familyGroupsSchema.safeParse([group, group]).success, false);
  assert.equal(familyGroupsSchema.safeParse([group, { ...group, id: "other" }]).success, false);
  assert.equal(familyGroupsSchema.safeParse(Array(501).fill(group)).success, false);
  assert.equal(estimateFamilyShipping({ ...target, gtin: gtin(77) }, catalog, [group]), null);
  assert.equal(estimateFamilyShipping(target, [...catalog, catalog[0]], [group]), null);
});

test("own dimensions defer to exact estimator; own gross is separate from geometry", () => {
  assert.equal(estimateFamilyShipping(sample(99), catalog, [group]), null);
  const own = sample(99, 250);
  const evidence = own.logisticsEvidence as { observations: Array<{ sidesMm: number[] | null }> };
  evidence.observations[0].sidesMm = null;
  const result = estimateFamilyShipping(own, catalog, [group]);
  assert.equal(result?.draft.weightGrams, 350);
  assert.equal(result?.weightBasis, "EXACT_GTIN_GROSS");
  assert.ok(result?.sourceObservationIds.includes(`${own.gtin}:sample-99`));
});

test("tablets require exact count and whitelist, preserve sanitary guards and reject special forms", () => {
  for (const patch of [{ brand: "Outra marca" }, { isPopularPharmacy: true }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "ANTIMICROBIAL" }, { name: "Medicamento 60 comprimidos" }, ...["cápsulas", "drágeas", "comprimidos XR", "comprimidos sublinguais", "comprimidos mastigáveis", "comprimidos efervescentes", "comprimidos frasco", "comprimidos pote", "comprimidos liberação prolongada", "comprimidos LP", "comprimidos gastrorresistentes"].map(form => ({ name: `Medicamento 30 ${form}` }))]) assert.equal(estimateFamilyShipping({ ...target, ...patch }, catalog, [group]), null, JSON.stringify(patch));
  assert.ok(estimateFamilyShipping({ ...target, activeIngredients: ["outra composição"] }, catalog, [group]));
});

test("references require current labelled retail geometry and bounded spread, independently of gross", () => {
  for (const patch of [{ packagingLevel: "master_case", units: 12 }, { dimensionsBasis: "unlabeled" }, { identityConflict: true }, { sidesMm: [300, 50, 20] }]) {
    const altered = structuredClone(catalog[1]);
    Object.assign((altered.logisticsEvidence as { observations: object[] }).observations[0], patch);
    assert.equal(estimateFamilyShipping(target, [catalog[0], altered], [group]), null);
  }
  for (const state of ["rejected", "superseded"]) {
    const altered = structuredClone(catalog[1]);
    (altered.logisticsEvidence as { sourceDecisions: object[] }).sourceDecisions = [{ observationId: "sample-2", state, reason: "Retirada sintética" }];
    assert.equal(estimateFamilyShipping(target, [catalog[0], altered], [group]), null);
  }
  assert.equal(estimateFamilyShipping(target, [catalog[0], { ...catalog[1], brand: "Outra" }], [group]), null);
});

test("body lotion requires exact ml and corporal identity; tubes and other cosmetics are excluded", () => {
  const lotion = { ...target, name: "Loção hidratante corporal 200ml", category: "Higiene", requiresPrescription: false };
  const references = catalog.map(item => ({ ...item, ...lotion, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  const lotionGroup = { ...group, kind: "BODY_LOTION" as const, quantity: 200 };
  assert.ok(estimateFamilyShipping(lotion, references, [lotionGroup]));
  for (const name of ["Loção facial 200ml", "Hidratante corporal solar 200ml", "Shampoo corporal 200ml", "Loção corporal tubo 200ml", "Loção corporal 400ml", "Kit loção corporal 200ml", "Loção corporal labial 200ml"]) assert.equal(estimateFamilyShipping({ ...lotion, name }, references, [lotionGroup]), null, name);
});

test("wipes require 48 units, hygiene, brand and at least two bounded gross weights", () => {
  const wipes = { ...target, name: "Lenços umedecidos 48 unidades", category: "Higiene infantil", requiresPrescription: false };
  const references = [sample(1, 200), sample(2, 300)].map(item => ({ ...item, ...wipes, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  const wipesGroup = { ...group, kind: "WIPES" as const, quantity: 48 };
  const result = estimateFamilyShipping(wipes, references, [wipesGroup]);
  assert.equal(result?.draft.weightGrams, 400);
  assert.equal(result?.weightBasis, "FAMILY_ENVELOPE");
  assert.equal(result?.minimumRetailWeightGrams, 200);
  assert.equal(result?.meanRetailWeightGrams, 250);
  assert.equal(result?.maximumRetailWeightGrams, 300);
  assert.equal(estimateFamilyShipping(wipes, [references[0], { ...references[1], logisticsEvidence: sample(2).logisticsEvidence }], [wipesGroup]), null);
  for (const patch of [{ category: "Medicamentos" }, { name: "Lenços umedecidos 48 unidades álcool" }, { name: "Lenços umedecidos 48 unidades perfume" }, { name: "Kit lenços umedecidos 48 unidades" }, { name: "Lenços umedecidos 48 unidades 200ml" }, { name: "Lenços umedecidos 2x48 unidades" }, { name: "Lenços umedecidos 48 unidades 100g" }, { name: "Lenços umedecidos 50 unidades" }]) assert.equal(estimateFamilyShipping({ ...wipes, ...patch }, references, [wipesGroup]), null);
});

test("roll-on family accepts exact branded volume and rejects other packaging or cargo", () => {
  const rollon = { ...target, name: "Desodorante roll-on sintético 50ml", category: "Higiene", requiresPrescription: false };
  const references = catalog.map(item => ({ ...item, ...rollon, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  references[1].name = "Desodorante rollon outra linha 50ml";
  const rollonGroup = { ...group, kind: "ROLL_ON" as const, quantity: 50 };
  assert.ok(estimateFamilyShipping(rollon, references, [rollonGroup]));
  for (const name of ["Desodorante roll-on tubo 50ml", "Desodorante roll-on aerossol 50ml", "Desodorante roll-on spray 50ml", "Desodorante roll-on vidro 50ml", "Desodorante roll-on perfume 50ml", "Desodorante roll-on inflamável 50ml", "Desodorante roll-on 50g", "Desodorante roll-on 100ml"]) assert.equal(estimateFamilyShipping({ ...rollon, name }, references, [rollonGroup]), null, name);
});

test("roll-on promotional L3P2 packs cannot be targets or dimensional references", () => {
  const rollon = { ...target, name: "Desodorante roll-on sintético 50ml", category: "Higiene", requiresPrescription: false };
  const references = catalog.map(item => ({ ...item, ...rollon, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  const rollonGroup = { ...group, kind: "ROLL_ON" as const, quantity: 50 };
  assert.ok(estimateFamilyShipping(rollon, references, [rollonGroup]));
  for (const promotion of ["L3P2", "L 3 P 2"]) {
    const name = `Desodorante roll-on sintético ${promotion} 50ml`;
    assert.equal(estimateFamilyShipping({ ...rollon, name }, references, [rollonGroup]), null, `target ${promotion}`);
    assert.equal(estimateFamilyShipping(rollon, [references[0], { ...references[1], name }], [rollonGroup]), null, `reference ${promotion}`);
  }
});

test("reference weight dispersion cannot replace own weight; geometry rounds conservatively", () => {
  const references = [sample(1, 10, [81, 51, 21]), sample(2, 1000, [89, 59, 29])];
  const result = estimateFamilyShipping(target, references, [group]);
  assert.equal(result?.draft.weightGrams, 180);
  assert.equal(result?.weightBasis, "WEIGHT_POLICY");
  assert.deepEqual([result?.draft.lengthCm, result?.draft.widthCm, result?.draft.heightCm], [11, 8, 5]);
  const conflict = structuredClone(references[1]);
  const evidence = conflict.logisticsEvidence as { observations: Array<Record<string, unknown>> };
  evidence.observations.push({ ...evidence.observations[0], id: "other-source", sidesMm: [90, 60, 30] });
  assert.equal(estimateFamilyShipping(target, [references[0], conflict], [group]), null);
  const wipes = { ...target, name: "Lenços umedecidos 48 unidades", category: "Higiene", requiresPrescription: false };
  const wipeReferences = references.map(item => ({ ...item, ...wipes, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  assert.equal(estimateFamilyShipping(wipes, wipeReferences, [{ ...group, kind: "WIPES", quantity: 48 }]), null);
});

test("counted wipes never bypass special cargo guards when using their gross reference", () => {
  const wipes = { ...sample(99, 250), name: "Lenços umedecidos 48 unidades termolábil", category: "Higiene", requiresPrescription: false };
  const ownEvidence = wipes.logisticsEvidence as { observations: Array<{ sidesMm: number[] | null }> };
  ownEvidence.observations[0].sidesMm = null;
  const references = [sample(1, 200), sample(2, 300)].map(item => ({ ...item, name: "Lenços umedecidos 48 unidades", category: "Higiene", requiresPrescription: false }));
  assert.equal(estimateFamilyShipping(wipes, references, [{ ...group, kind: "WIPES", quantity: 48 }]), null);
});

test("explicit reviewed groups accept abbreviated lotion titles and counted wet towels", () => {
  const lotion = { ...target, name: "Hidratante Marca sintética MILK HIDRA PROF 400ML", category: "Higiene", requiresPrescription: false };
  const lotionReferences = catalog.map(item => ({ ...item, ...lotion, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  assert.ok(estimateFamilyShipping(lotion, lotionReferences, [{ ...group, kind: "BODY_LOTION", quantity: 400 }]));
  for (const token of ["FAC", "LAB", "banho", "FPS", "sun", "refil", "pote"]) assert.equal(estimateFamilyShipping({ ...lotion, name: `${lotion.name} ${token}` }, lotionReferences, [{ ...group, kind: "BODY_LOTION", quantity: 400 }]), null, token);
  const wipes = { ...target, name: "Toalhas umedecidas sintéticas 48 unidades", category: "Lenços e toalhas umedecidas", requiresPrescription: false };
  const wipeReferences = [sample(1, 200), sample(2, 300)].map(item => ({ ...item, ...wipes, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  assert.ok(estimateFamilyShipping(wipes, wipeReferences, [{ ...group, kind: "WIPES", quantity: 48 }]));
});

test("non-prescription hygiene wipes accept default UNREVIEWED without bypassing prescription guards", () => {
  const wipes = { ...target, name: "Toalhas umedecidas sintéticas 48 unidades", category: "Lenços e toalhas umedecidas", requiresPrescription: false, prescriptionType: "UNREVIEWED" };
  const references = [sample(1, 200), sample(2, 300)].map(item => ({ ...item, ...wipes, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
  const wipesGroup = { ...group, kind: "WIPES" as const, quantity: 48 };
  assert.ok(estimateFamilyShipping(wipes, references, [wipesGroup]));
  assert.equal(estimateFamilyShipping({ ...wipes, requiresPrescription: true }, references, [wipesGroup]), null);
  assert.equal(estimateFamilyShipping({ ...wipes, prescriptionType: "CONTROLLED" }, references, [wipesGroup]), null);
  assert.equal(estimateFamilyShipping({ ...wipes, prescriptionType: "ANTIMICROBIAL" }, references, [wipesGroup]), null);
});

const dental = { ...target, name: "Creme dental sintético 90g", category: "Higiene bucal", requiresPrescription: false, prescriptionType: "UNREVIEWED" };
const dentalGroup = { ...group, kind: "DENTAL_CREAM", quantity: 90 };
function dentalSamples(weight: number | null = null) {
  return [sample(1, weight, [170, 46, 38]), sample(2, weight, [170, 46, 38])].map(item => ({ ...item, ...dental, gtin: item.gtin, logisticsEvidence: item.logisticsEvidence }));
}

test("dental cream extends reviewed-family-v1 with exact branded grams and independent geometry", () => {
  assert.equal(familyGroupSchema.safeParse(dentalGroup).success, true);
  const references = dentalSamples();
  const result = estimateFamilyShipping(dental, references, [dentalGroup]);
  assert.ok(result);
  assert.equal(result.policyVersion, "reviewed-family-v1");
  assert.equal(result.weightBasis, "WEIGHT_POLICY");
  assert.equal(result.draft.weightGrams, 220);
  assert.equal(result.meanRetailWeightGrams, null);
  assert.deepEqual([result.draft.lengthCm, result.draft.widthCm, result.draft.heightCm], [19, 7, 6]);
  assert.equal(result.draft.enabled, false);
  assert.equal(result.draft.transportReviewed, false);
  assert.equal(result.draft.measurementBasis, "estimated");
  for (const name of ["Gel dental sintético bisnaga 90g", "Pasta dental sintética tubo 90g"]) assert.ok(estimateFamilyShipping({ ...dental, name }, references, [dentalGroup]), name);
  assert.equal(estimateFamilyShipping(dental, [references[0]], [dentalGroup]), null);
  assert.equal(estimateFamilyShipping(dental, [references[0], references[0]], [dentalGroup]), null);
});

test("dental own gross takes precedence while dimensions come from separate GTINs", () => {
  const own = { ...sample(99, 110), ...dental, gtin: gtin(99), logisticsEvidence: sample(99, 110).logisticsEvidence };
  const evidence = own.logisticsEvidence as { observations: Array<{ sidesMm: number[] | null }> };
  evidence.observations[0].sidesMm = null;
  const result = estimateFamilyShipping(own, dentalSamples(109), [dentalGroup]);
  assert.equal(result?.weightBasis, "EXACT_GTIN_GROSS");
  assert.equal(result?.draft.weightGrams, 210);
  assert.ok(result?.sourceObservationIds.includes(`${own.gtin}:sample-99`));
  assert.deepEqual(result?.maximumRetailSidesCm, [17, 4.6, 3.8]);
});

test("dental family rejects mismatches, multiple packs, prescription and special cargo", () => {
  const references = dentalSamples();
  for (const patch of [{ brand: "Outra marca" }, { requiresPrescription: true, prescriptionType: "ORDINARY" }, { prescriptionType: "CONTROLLED" }, { isPopularPharmacy: true }, { category: "Medicamentos" }, { category: "Categoria desconhecida" }, ...["Creme dental 90ml", "Creme dental 100g", "Creme corporal 90g", "Creme dental refil 90g", "Creme dental pote 90g", "Creme dental 90g 3 doses", "Creme dental 90g porção", "Kit creme dental 90g", "Combo creme dental 90g", "Creme dental L3P2 90g", "Creme dental L 3 P 2 90g", "Creme dental leve3pague2 90g", "Creme dental 2x90g", "Creme dental 90g4un", "Creme dental vidro 90g", "Creme dental aerossol 90g", "Creme dental refrigerado 90g"].map(name => ({ name }))]) assert.equal(estimateFamilyShipping({ ...dental, ...patch }, references, [dentalGroup]), null, JSON.stringify(patch));
  assert.equal(estimateFamilyShipping(dental, [references[0], { ...references[1], name: "Creme dental L3P2 90g" }], [dentalGroup]), null);
});
