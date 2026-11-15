import assert from "node:assert/strict";
import test from "node:test";
import { frenetAcceptanceSchema, shippingQuotePayloadSchema, shippingSelectionSchema } from "./schema";
import { signShippingQuote, verifyShippingQuote } from "./rules";

test("the signed Frenet selection preserves its official service code and disallows swapping providers", () => {
  const key = "synthetic-shipping-key";
  const payload = {
    provider: "frenet" as const, serviceId: 3298, providerServiceCode: "03298" as const,
    carrier: "Correios", service: "PAC", priceCents: 1928, deliveryDays: 4,
    postalCode: "01001000", fingerprint: "f".repeat(64), revision: 1, expiresAt: Date.now() + 60_000,
  };
  const token = signShippingQuote(payload, key);
  assert.equal(verifyShippingQuote(token, key).providerServiceCode, "03298");
  assert.equal(shippingSelectionSchema.safeParse({ ...payload, token }).success, true);
  for (const invalid of [
    { ...payload, providerServiceCode: undefined },
    { ...payload, providerServiceCode: "03220" },
    { ...payload, serviceId: 1 },
    { ...payload, provider: "melhor-envio" },
  ]) {
    assert.equal(shippingQuotePayloadSchema.safeParse(invalid).success, false);
    assert.equal(shippingSelectionSchema.safeParse({ ...invalid, token }).success, false);
  }
  const legacy = { ...payload, provider: "melhor-envio" as const, serviceId: 1, providerServiceCode: undefined };
  assert.equal(verifyShippingQuote(signShippingQuote(legacy, key), key).provider, "melhor-envio");
});

test("Frenet approvals accept only distinct official codes for version one", () => {
  assert.deepEqual(frenetAcceptanceSchema.parse({ version: 1, serviceCodes: ["03298", "03220"] }).serviceCodes, ["03298", "03220"]);
  for (const invalid of [
    { version: 1, serviceCodes: [] },
    { version: 1, serviceCodes: [1, 2] },
    { version: 1, serviceCodes: ["03298", "03298"] },
    { version: 2, serviceCodes: ["03298"] },
    { version: 1, serviceCodes: ["03298"], approvedServiceIds: [1] },
  ]) assert.equal(frenetAcceptanceSchema.safeParse(invalid).success, false);
});
