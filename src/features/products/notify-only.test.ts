import assert from "node:assert/strict";
import test from "node:test";
import { isNotifyOnlyPendingLogistics, preserveNotifyOnlyPendingLogistics } from "./notify-only";
import { invalidateShippingProfile, shippingAdminProfileSchema, shippingDraftSchema } from "@/features/shipping/product-draft";
import { restockAvailability } from "@/features/restock/rules";
import { validateShippingProduct } from "@/features/shipping/rules";
import { toSaleProduct } from "@/features/supplier-catalog/commerce";

test("raw malformed hold fails closed and survives draft parsing/invalidation", () => {
  for (const value of [true, null, "false", 0, undefined]) {
    const profile = { notifyOnlyPendingLogistics: value };
    assert.equal(isNotifyOnlyPendingLogistics(profile), true);
    assert.equal(invalidateShippingProfile(profile)?.notifyOnlyPendingLogistics, true);
    assert.equal((preserveNotifyOnlyPendingLogistics(profile, {}) as Record<string, unknown>).notifyOnlyPendingLogistics, true);
  }
  for (const profile of [null, undefined, {}, { notifyOnlyPendingLogistics: false }]) assert.equal(isNotifyOnlyPendingLogistics(profile), false);
  const draft = { notifyOnlyPendingLogistics: true, measurementBasis: "unknown", enabled: false, transportReviewed: false, weightGrams: null, widthCm: null, heightCm: null, lengthCm: null, reference: null };
  assert.deepEqual(shippingDraftSchema.parse(draft), draft);
  assert.deepEqual(shippingAdminProfileSchema.parse(draft), draft);
  assert.equal(invalidateShippingProfile(draft)?.notifyOnlyPendingLogistics, true);
  assert.equal(preserveNotifyOnlyPendingLogistics(draft, undefined), undefined);
});

test("ordinary Rx notify-only remains eligible for restock even with a positive supplier offer", () => {
  const now = Date.now();
  const product = { status: "ACTIVE", deletedAt: null, requiresPrescription: true, prescriptionType: "ORDINARY" as const, isPopularPharmacy: false, inventorySource: "DISTRIBUTOR" as const, stock: 99, price: "10.00", ean: "1234567890128", shippingProfile: { notifyOnlyPendingLogistics: true }, supplierOffers: [{ id: "synthetic", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 500, retailCeilingCents: 2000, available: true, stockQuantity: 10, allocationQuantity: 10, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 1000), validUntil: new Date(now + 1000) }] };
  assert.deepEqual(restockAvailability(product, now), { eligible: true, available: false });
  assert.equal(toSaleProduct(product, now).stock, 0);
  assert.equal(toSaleProduct({ ...product, shippingProfile: null }, now).availableForPurchase, true);
});


test("a fully approved shipping profile still cannot quote while notify-only is retained", () => {
  const profile = { notifyOnlyPendingLogistics: true, measurementBasis: "measured", enabled: true, transportReviewed: true, weightGrams: 250, widthCm: 10, heightCm: 8, lengthCm: 15, cargoKinds: ["general"], approvedServiceIds: [1] };
  assert.equal(shippingAdminProfileSchema.parse(profile).notifyOnlyPendingLogistics, true);
  assert.equal(invalidateShippingProfile(profile)?.notifyOnlyPendingLogistics, true);
  assert.throws(() => validateShippingProduct({ id: "synthetic", name: "Produto sintético", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, shippingProfile: profile, updatedAt: new Date() }), /logística/i);
});
