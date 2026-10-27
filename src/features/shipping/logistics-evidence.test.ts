import assert from "node:assert/strict";
import test from "node:test";
import { logisticsEvidenceSchema, evidenceStatus, mergeLogisticsEvidence, normalizeLogisticsGtin } from "./logistics-evidence";
import { packagingRecipeSchema, prepareProtectedDraft } from "./packaging-recipe";

export const evidenceFixture = {
  version: 1, gtin: "07890000000000", observations: [{ id: "source-a", source: { url: "https://example.invalid/ficha", capturedAt: "2026-10-27T12:00:00.000Z", sha256: "a".repeat(64), gtin: "07890000000000", excerpt: "Unidade comercial fechada; peso bruto 100 g; altura 10, largura 20 e profundidade 30 mm." },
    packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 100, weightBasis: "gross_explicit", sidesMm: [10, 20, 30], sideOrder: ["altura", "largura", "profundidade"], dimensionsBasis: "labeled_axes", notes: "" }],
  review: { confirmed: true, note: "Conferido com a apresentação comercial." },
};
export const recipeFixture = { version: 1, name: "Caixa sintética", compatibleGtins: [evidenceFixture.gtin], innerSidesMm: [50, 60, 70], outerSidesMm: [55, 65, 75], containerTareGrams: 20, protectionTareGrams: 5, clearanceMm: [5, 5, 5], protectionDescription: "Proteção sintética em todos os lados", calibrated: true, calibratedAt: "2026-10-27T12:00:00.000Z", calibrationNote: "Tara e encaixe medidos; proteção incluída.", allowedOrientations: [[0, 1, 2]], unitSideOrder: ["altura", "largura", "profundidade"] };

test("physical evidence keeps exact GTIN, source and meaning; rejects unknown keys and unsafe URLs", () => {
  assert.equal(normalizeLogisticsGtin("78923454"), "00000078923454");
  assert.equal(normalizeLogisticsGtin("78923455"), null);
  assert.equal(logisticsEvidenceSchema.safeParse(evidenceFixture).success, true);
  assert.equal(logisticsEvidenceSchema.safeParse({ ...evidenceFixture, enabled: true }).success, false);
  for (const url of ["javascript:alert(1)", "https://user:secret@example.invalid/ficha", "https://example.invalid/ficha?token=secret"]) {
    const value = structuredClone(evidenceFixture); value.observations[0].source.url = url;
    assert.equal(logisticsEvidenceSchema.safeParse(value).success, false);
  }
  const mismatch = structuredClone(evidenceFixture); mismatch.observations[0].source.gtin = "07890000000017";
  assert.equal(logisticsEvidenceSchema.safeParse(mismatch).success, false);
});

test("gross unknown, net, master, partial, identity conflict and divergent sources never become complete", () => {
  assert.equal(evidenceStatus(evidenceFixture), "complete_reference");
  for (const change of [{ weightBasis: "unspecified" }, { weightBasis: "net" }, { packagingLevel: "master_case", units: 12 }, { sidesMm: null }, { dimensionsBasis: "unlabeled" }]) {
    const value = structuredClone(evidenceFixture); Object.assign(value.observations[0], change);
    assert.equal(evidenceStatus(value), "partial");
  }
  const conflict = structuredClone(evidenceFixture); conflict.observations[0].identityConflict = true;
  assert.equal(evidenceStatus(conflict), "conflict");
  const divergent = structuredClone(evidenceFixture); divergent.observations.push({ ...divergent.observations[0], id: "other", weightGrams: 101 });
  assert.equal(evidenceStatus(divergent), "conflict");
  for (const change of [{ packagingLevel: "master_case", units: 12 }, { weightBasis: "net" }, { weightBasis: "unspecified" }, { packagingLevel: "unknown" }]) {
    const mixed = structuredClone(evidenceFixture); mixed.observations.push({ ...mixed.observations[0], id: "other", ...change } as typeof mixed.observations[number]);
    assert.equal(prepareProtectedDraft({ evidence: mixed, recipe: recipeFixture, cargoKinds: ["general"], freightEligible: true, existingProfile: null }).draft, null);
  }
});

test("merge preserves review on no-op, invalidates on new evidence and never replaces a source silently", () => {
  const value = logisticsEvidenceSchema.parse(evidenceFixture);
  assert.deepEqual(mergeLogisticsEvidence(value, value), value);
  const incoming = structuredClone(value); incoming.observations[0].id = "other";
  assert.equal(mergeLogisticsEvidence(value, incoming).review.confirmed, false);
  const collision = structuredClone(value); collision.observations[0].weightGrams = 101;
  assert.throws(() => mergeLogisticsEvidence(value, collision), /identificador/);
});

test("auditable source decisions preserve provenance and allow recovering a conflicting or superseded reference", () => {
  const conflicting = structuredClone(evidenceFixture);
  conflicting.observations.push({ ...conflicting.observations[0], id: "outdated", weightGrams: 90 });
  assert.equal(evidenceStatus(conflicting), "conflict");
  const resolved = { ...conflicting, sourceDecisions: [{ observationId: "outdated", state: "superseded", reason: "Ficha de apresentação antiga; fonte vigente conferida." }] };
  assert.equal(evidenceStatus(resolved), "complete_reference");
  const prepared = prepareProtectedDraft({ evidence: resolved, recipe: recipeFixture, cargoKinds: ["general"], freightEligible: true, existingProfile: null });
  assert.equal(prepared.draft?.weightGrams, 125);
  assert.equal(logisticsEvidenceSchema.parse(resolved).observations.length, 2);
  assert.equal(logisticsEvidenceSchema.safeParse({ ...resolved, sourceDecisions: [{ observationId: "outdated", state: "rejected", reason: "" }] }).success, false);
  assert.equal(logisticsEvidenceSchema.safeParse({ ...resolved, sourceDecisions: [...resolved.sourceDecisions, ...resolved.sourceDecisions] }).success, false);
  assert.equal(evidenceStatus({ ...resolved, sourceDecisions: [] }), "conflict");
  const net = structuredClone(resolved); net.observations[1].weightBasis = "net";
  assert.equal(prepareProtectedDraft({ evidence: net, recipe: recipeFixture, cargoKinds: ["general"], freightEligible: true, existingProfile: null }).draft?.weightGrams, 125);
  const merged = mergeLogisticsEvidence(logisticsEvidenceSchema.parse(resolved), { ...resolved, sourceDecisions: [] });
  assert.deepEqual(merged.sourceDecisions, resolved.sourceDecisions);
  assert.deepEqual(mergeLogisticsEvidence(null, resolved).sourceDecisions, []);
});

test("calibrated recipe yields disabled preview with a single addition of external protection tare", () => {
  const result = prepareProtectedDraft({ evidence: evidenceFixture, recipe: recipeFixture, cargoKinds: ["general"], freightEligible: true, existingProfile: null });
  assert.deepEqual(result.blockers, []);
  assert.equal(result.draft?.weightGrams, 125);
  assert.equal(result.draft?.lengthCm, 7.5);
  assert.equal(result.draft?.enabled, false);
  assert.equal(result.draft?.transportReviewed, false);
  assert.equal(result.draft?.measurementBasis, "estimated");
});

test("preview blocks missing calibration, tare, clearance, compatibility, cargo, eligibility, fit and legacy profile", () => {
  for (const recipe of [{ ...recipeFixture, calibrated: false }, { ...recipeFixture, containerTareGrams: null }, { ...recipeFixture, protectionTareGrams: null }, { ...recipeFixture, clearanceMm: null }, { ...recipeFixture, compatibleGtins: [] }, { ...recipeFixture, innerSidesMm: [1, 2, 3] }]) {
    assert.equal(prepareProtectedDraft({ evidence: evidenceFixture, recipe, cargoKinds: ["general"], freightEligible: true, existingProfile: null }).draft, null);
  }
  for (const changes of [{ cargoKinds: [] }, { cargoKinds: ["unspecified"] }, { freightEligible: false }, { existingProfile: { weightGrams: 120 } }, { evidence: { ...evidenceFixture, review: { confirmed: false, note: "" } } }]) {
    assert.equal(prepareProtectedDraft({ evidence: evidenceFixture, recipe: recipeFixture, cargoKinds: ["general"], freightEligible: true, existingProfile: null, ...changes }).draft, null);
  }
  assert.equal(packagingRecipeSchema.safeParse({ ...recipeFixture, outerSidesMm: [1, 2, 3] }).success, false);
  assert.equal(packagingRecipeSchema.safeParse({ ...recipeFixture, allowedOrientations: [] }).success, false);
  assert.equal(packagingRecipeSchema.safeParse({ ...recipeFixture, allowedOrientations: [[0, 0, 2]] }).success, false);
  const reordered = structuredClone(evidenceFixture); reordered.observations[0].sideOrder = ["largura", "altura", "profundidade"];
  assert.equal(prepareProtectedDraft({ evidence: reordered, recipe: recipeFixture, cargoKinds: ["liquid"], freightEligible: true, existingProfile: null }).draft, null);
});
