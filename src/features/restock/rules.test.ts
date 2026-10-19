import assert from "node:assert/strict";
import test from "node:test";
import { assertSubscription, contactChannels, restockAvailability } from "./rules";
import { subscribeSchema, notificationSchema } from "./contracts";

const product = { status: "ACTIVE", deletedAt: null, stock: 0, price: "10", requiresPrescription: false, isPopularPharmacy: false };
test("only active, public, unassisted unavailable products accept subscriptions", () => {
  assert.deepEqual(restockAvailability(product), { eligible: true, available: false });
  for (const change of [{ status: "DRAFT" }, { deletedAt: new Date() }, { isPopularPharmacy: true }, { requiresPrescription: true, prescriptionType: "CONTROLLED" as const }]) {
    assert.equal(restockAvailability({ ...product, ...change }).eligible, false);
  }
  assert.throws(() => assertSubscription({ ...product, stock: 1 }), /disponível/);
});
test("distributor physical stock cannot grant availability without a valid offer", () => {
  assert.deepEqual(restockAvailability({ ...product, stock: 100, inventorySource: "DISTRIBUTOR" }), { eligible: true, available: false });
});
test("contacts come from account, channel opt-in is separate and invalid contacts are rejected", () => {
  assert.deepEqual(contactChannels({ phone: "(44) 99999-0000", email: "person@example.test" }, { whatsapp: true, email: false }), { phone: "5544999990000", email: null });
  assert.throws(() => contactChannels({ phone: null, email: "bad" }, { whatsapp: true, email: false }));
  assert.throws(() => contactChannels({ phone: null, email: "bad" }, { whatsapp: false, email: true }));
  assert.throws(() => contactChannels({ phone: null, email: null }, { whatsapp: false, email: false }));
});
test("strict contracts reject identity/contact injection and missing consent", () => {
  const valid = { productId: "product", whatsapp: true, email: false, consent: true };
  assert.equal(subscribeSchema.safeParse(valid).success, true);
  for (const extra of [{ customerId: "other" }, { phone: "5544999990000" }, { email: "other@example.test" }, { consent: false }]) assert.equal(subscribeSchema.safeParse({ ...valid, ...extra }).success, false);
  assert.equal(subscribeSchema.safeParse({ ...valid, whatsapp: false }).success, false);
  assert.equal(notificationSchema.safeParse({ id: "x", channel: "EMAIL", updatedAt: "invalid" }).success, false);
});
