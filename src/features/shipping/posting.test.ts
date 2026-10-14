import assert from "node:assert/strict";
import test from "node:test";
import { resolvePostingLocation } from "./posting";
import { defaultShippingSettings, shippingQuotePayloadSchema, shippingSettingsSchema } from "./schema";

test("posting city comes from the selected service, independently of the customer's destination", () => {
  const settings = shippingSettingsSchema.parse({ ...defaultShippingSettings, contactEmail: "qa@example.invalid", postingLocations: [
    { serviceId: 1, city: "Ivate", state: "PR", pointName: "AC Ivaté" },
    { serviceId: 4, city: "Umuarama", state: "PR", pointName: "Ponto parceiro" },
    { serviceId: 12, city: "Maringá", state: "PR" },
  ] });
  assert.equal(resolvePostingLocation(settings, 1)?.requiresTravel, false);
  assert.equal(resolvePostingLocation(settings, 4)?.city, "Umuarama");
  assert.equal(resolvePostingLocation(settings, 4)?.requiresTravel, true);
  assert.equal(resolvePostingLocation(settings, 12)?.city, "Maringá");
  assert.equal(resolvePostingLocation(settings, 35), undefined, "unknown routes must not be guessed from carrier or CEP");
  assert.equal(resolvePostingLocation({ ...settings, originState: "SP" }, 1)?.requiresTravel, true);
});

test("posting configuration rejects duplicate services, invalid states and blank cities", () => {
  const base = { ...defaultShippingSettings, contactEmail: "qa@example.invalid" };
  for (const postingLocations of [
    [{ serviceId: 4, city: "Umuarama", state: "XX" }],
    [{ serviceId: 4, city: "   ", state: "PR" }],
    [{ serviceId: 4, city: "Umuarama", state: "PR" }, { serviceId: 4, city: "Ivaté", state: "PR" }],
  ]) assert.equal(shippingSettingsSchema.safeParse({ ...base, postingLocations }).success, false);
  assert.deepEqual(shippingSettingsSchema.parse(base).postingLocations, []);
});

test("historical quotes remain readable without inventing a posting city", () => {
  const quote = { provider: "melhor-envio", serviceId: 4, carrier: "Jadlog", service: ".Com", priceCents: 1700, deliveryDays: 4,
    postalCode: "01001000", fingerprint: "a".repeat(64), revision: 1, expiresAt: Date.now() };
  assert.equal(shippingQuotePayloadSchema.parse(quote).postingLocation, undefined);
  const postingLocation = { city: "Umuarama", state: "PR", pointName: "Ponto parceiro", requiresTravel: true };
  assert.deepEqual(shippingQuotePayloadSchema.parse({ ...quote, postingLocation }).postingLocation, postingLocation);
});
