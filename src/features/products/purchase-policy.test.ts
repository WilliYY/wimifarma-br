import assert from "node:assert/strict";
import test from "node:test";
import { requiresPrescriptionReview, requiresPurchaseAssistance, resolvePrescriptionType } from "./purchase-policy";
import { productCreateSchema, productUpdateSchema } from "./schema";

test("ordinary prescriptions permit an order but keep a dispensing review", () => {
  const product = { requiresPrescription: true, isPopularPharmacy: false, prescriptionType: "ORDINARY" as const };
  assert.equal(requiresPurchaseAssistance(product), false);
  assert.equal(requiresPrescriptionReview(product), true);
});

test("unclassified, controlled and Popular Pharmacy items cannot use ordinary checkout", () => {
  for (const prescriptionType of [undefined, "UNREVIEWED", "CONTROLLED"] as const) {
    const product = { requiresPrescription: true, isPopularPharmacy: false, prescriptionType };
    assert.equal(requiresPurchaseAssistance(product), true);
    assert.equal(requiresPrescriptionReview(product), false);
  }
  const popular = { requiresPrescription: true, isPopularPharmacy: true, prescriptionType: "ORDINARY" as const };
  assert.equal(requiresPurchaseAssistance(popular), true);
  assert.equal(requiresPrescriptionReview(popular), false);
});

test("ordinary merchandise does not acquire a prescription requirement", () => {
  assert.equal(requiresPurchaseAssistance({ requiresPrescription: false, isPopularPharmacy: false }), false);
  assert.equal(requiresPrescriptionReview({ requiresPrescription: false, isPopularPharmacy: false }), false);
});

test("an inconsistent checkbox cannot remove an explicit prescription classification", () => {
  assert.equal(requiresPurchaseAssistance({ requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "CONTROLLED" }), true);
  assert.equal(requiresPrescriptionReview({ requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "ORDINARY" }), true);
});

test("product forms reject prescription classifications without the corresponding requirement", () => {
  for (const prescriptionType of ["ORDINARY", "CONTROLLED"] as const) {
    const fields = { name: "Produto sintético", price: 10, prescriptionType, cashbackEnabled: true, cashbackRateBps: 200 };
    assert.equal(productCreateSchema.safeParse(fields).success, false);
    assert.equal(productUpdateSchema.safeParse({ ...fields, expectedUpdatedAt: new Date(0).toISOString() }).success, false);
    assert.equal(productCreateSchema.safeParse({ ...fields, requiresPrescription: true, cashbackEnabled: false }).success, true);
  }
});

test("a replacement product cannot inherit the previous medicine's purchase classification", () => {
  const changed = resolvePrescriptionType("ORDINARY", undefined, true);
  assert.equal(requiresPurchaseAssistance({ requiresPrescription: true, isPopularPharmacy: false, prescriptionType: changed }), true);
  assert.equal(resolvePrescriptionType("ORDINARY", undefined, false), "ORDINARY");
  assert.equal(resolvePrescriptionType("UNREVIEWED", "ORDINARY", true), "ORDINARY", "only an authorized explicit classification is accepted by the route");
});
