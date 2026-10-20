import assert from "node:assert/strict";
import test from "node:test";
import { assessCarrierCargo } from "./cargo-policy";
import { shippingProfileSchema } from "./schema";
import { invalidateShippingProfile, shippingDraftSchema } from "./product-draft";

test("carrier cargo matrix preserves prohibitions and unresolved conflicts", () => {
  assert.equal(assessCarrierCargo(1, ["unspecified"]).status, "unknown");
  assert.equal(assessCarrierCargo(1, []).status, "allowed", "legacy profiles retain their reviewed status");
  assert.equal(assessCarrierCargo(3, ["medication"]).status, "blocked");
  assert.equal(assessCarrierCargo(1, ["medication"]).status, "conditional");
  assert.equal(assessCarrierCargo(12, ["medication"]).status, "conditional");
  assert.equal(assessCarrierCargo(1, ["perfume"]).status, "blocked");
  assert.equal(assessCarrierCargo(3, ["perfume", "aerosol"]).status, "allowed");
  assert.equal(assessCarrierCargo(35, ["perfume"]).status, "conditional");
  assert.equal(assessCarrierCargo(3, ["perishable"]).status, "unknown");
  assert.equal(assessCarrierCargo(22, ["perishable"]).status, "conditional");
  assert.equal(assessCarrierCargo(33, ["industrialized_food"]).status, "conditional");
  assert.equal(assessCarrierCargo(31, ["industrialized_food"]).status, "blocked");
  assert.equal(assessCarrierCargo(3, ["liquid"]).status, "conditional");
  assert.equal(assessCarrierCargo(1, ["temperature_sensitive"]).status, "unknown");
  assert.equal(assessCarrierCargo(999, ["perfume"], "Jadlog").status, "unknown");
  assert.equal(assessCarrierCargo(999, ["general"]).status, "allowed");
  assert.equal(assessCarrierCargo(1, ["general", "perfume", "temperature_sensitive"]).status, "blocked");
});

test("cargo flags survive reviewed-profile invalidation and drafts reject duplicates", () => {
  const profile = { enabled: true, transportReviewed: true, weightGrams: 200, widthCm: 10, heightCm: 10, lengthCm: 10, cargoKinds: ["liquid", "temperature_sensitive"] };
  assert.deepEqual(shippingProfileSchema.parse(profile).cargoKinds, profile.cargoKinds);
  assert.deepEqual(invalidateShippingProfile(profile)?.cargoKinds, profile.cargoKinds);
  assert.equal(shippingProfileSchema.safeParse({ ...profile, cargoKinds: ["liquid", "liquid"] }).success, false);
  assert.equal(shippingDraftSchema.safeParse({ ...profile, enabled: false, transportReviewed: false, cargoKinds: ["not-cargo"] }).success, false);
});
