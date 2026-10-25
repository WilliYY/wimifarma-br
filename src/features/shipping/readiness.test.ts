import assert from "node:assert/strict";
import test from "node:test";
import { shippingReadiness, summarizeShippingReadiness } from "./readiness";

const base = { category: "Higiene", requiresPrescription: false, prescriptionType: "UNREVIEWED" as const, isPopularPharmacy: false, shippingProfile: null as unknown };
test("fila distingue falta de dados, revisão, desativação e cadastro configurado", () => {
  const valid = { enabled: true, transportReviewed: true, weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 20 };
  const rows = [base, { ...base, shippingProfile: { ...valid, transportReviewed: false } }, { ...base, shippingProfile: { ...valid, enabled: false } }, { ...base, shippingProfile: valid }];
  assert.deepEqual(rows.map(shippingReadiness), ["missing", "review", "disabled", "configured"]);
  assert.deepEqual(summarizeShippingReadiness(rows), { total: 4, missing: 1, review: 1, disabled: 1, configured: 1, assisted: 0 });
});
test("cadastro configurado não mascara item de atendimento assistido ou medida inválida", () => {
  assert.equal(shippingReadiness({ ...base, isPopularPharmacy: true }), "assisted");
  assert.equal(shippingReadiness({ ...base, shippingProfile: { enabled: true, transportReviewed: true, weightGrams: 0 } }), "review");
});
