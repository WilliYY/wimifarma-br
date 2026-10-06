import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { normalizeQuotes, shippingFingerprint, signShippingQuote, validateShippingProduct, verifyShippingQuote } from "./rules";
import { quoteRequestSchema } from "./schema";
import { createShippingState, readShippingState } from "./oauth";
import { checkoutRequestSchema } from "@/features/orders/checkout";

const key = "synthetic-shipping-key-only-for-tests";
const now = 1_800_000_000_000;
const quote = { provider: "melhor-envio" as const, serviceId: 1, service: "Serviço teste", carrier: "Transportadora teste", priceCents: 1950, deliveryDays: 5, postalCode: "01001000", fingerprint: "a".repeat(64), revision: 2, expiresAt: now + 900_000 };
const profile = { enabled: true, transportReviewed: true, weightGrams: 200, widthCm: 15, heightCm: 10, lengthCm: 20 };
const product = { id: "synthetic-product", name: "Produto teste", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, shippingProfile: profile, updatedAt: new Date(0) };

test("signed freight rejects tampering, expiry and malformed tokens", () => {
  const signed = signShippingQuote(quote, key);
  assert.deepEqual(verifyShippingQuote(signed, key, now), quote);
  assert.throws(() => verifyShippingQuote(signed, key, quote.expiresAt), /cotação expirou/);
  assert.throws(() => verifyShippingQuote(`${signed}x`, key, now));
  assert.throws(() => verifyShippingQuote(`${signed}.extra`, key, now));
  assert.throws(() => verifyShippingQuote(signed, "another-synthetic-test-key", now));
  const [body, signature] = signed.split(".");
  const manipulated = Buffer.from(JSON.stringify({ ...quote, priceCents: 1 })).toString("base64url");
  assert.throws(() => verifyShippingQuote(`${manipulated}.${signature}`, key, now));
  assert.ok(body);
  const invalid = Buffer.from(JSON.stringify({ ...quote, priceCents: -1 })).toString("base64url");
  assert.throws(() => verifyShippingQuote(`${invalid}.${createHmac("sha256", key).update(invalid).digest("base64url")}`, key, now));
});
test("normalization preserves configured prices, rejects provider errors and unapproved services", () => {
  const raw = [
    { id: 1, name: "Teste", price: "10.00", custom_price: "12.50", delivery_time: 3, custom_delivery_time: 4, company: { name: "Teste" } },
    { id: 2, name: "Outro", price: "1", delivery_time: 1, company: { name: "Outro" } },
    { id: 3, error: "Indisponível", price: "1" },
    { id: 4, name: "Inválido", price: "NaN", delivery_time: 2, company: { name: "Teste" } },
    { id: 5, name: "Inválido", price: "-1", delivery_time: 2, company: { name: "Teste" } },
    { id: 6, name: "Inválido", price: "10", delivery_time: null, company: { name: "Teste" } },
  ];
  assert.deepEqual(normalizeQuotes(raw, [1, 3, 4, 5, 6], 2).map((q) => [q.serviceId, q.priceCents, q.deliveryDays]), [[1, 1250, 6]]);
  assert.throws(() => normalizeQuotes({ error: "no" }, [1], 1));
});
test("temporary failure of every selected carrier is distinguished from lack of coverage", () => {
  const temporarilyUnavailable = [
    { id: 1, name: "PAC", error: "Serviço indisponível no momento" },
    { id: 2, name: "SEDEX", error: "Serviço indisponível no momento" },
  ];
  assert.throws(() => normalizeQuotes(temporarilyUnavailable, [1, 2], 1), { status: 503 });
  assert.deepEqual(normalizeQuotes([{ id: 1, error: "CEP não atendido" }], [1], 1), []);
  assert.deepEqual(normalizeQuotes([], [1, 2], 1), []);
  const available = { id: 2, name: "SEDEX", price: "12.50", delivery_time: 4, company: { name: "Correios" } };
  assert.deepEqual(normalizeQuotes([temporarilyUnavailable[0], available], [1, 2], 1).map((option) => option.serviceId), [2]);
  assert.deepEqual(normalizeQuotes([{ id: 9, error: "Serviço indisponível no momento" }, available], [2], 1).map((option) => option.serviceId), [2]);
});

test("shipping fails closed without complete packaging and commercial review", () => {
  assert.deepEqual(validateShippingProduct(product), { ...profile, measurementBasis: "measured" });
  for (const changes of [{ shippingProfile: null }, { shippingProfile: { ...profile, transportReviewed: false } }, { shippingProfile: { ...profile, enabled: false } }, { requiresPrescription: true }, { isPopularPharmacy: true }, { category: "Farmácia Popular" }]) assert.throws(() => validateShippingProduct({ ...product, ...changes }));
  assert.deepEqual(validateShippingProduct({ ...product, category: "Medicamentos" }), { ...profile, measurementBasis: "measured" });
});
test("cart fingerprint binds quantity, price and packaging version", () => {
  const items = [{ productId: product.id, quantity: 1, expectedUnitPriceCents: 1200 }];
  const fingerprint = shippingFingerprint(items, [product]);
  assert.notEqual(shippingFingerprint([{ ...items[0], quantity: 2 }], [product]), fingerprint);
  assert.notEqual(shippingFingerprint([{ ...items[0], expectedUnitPriceCents: 1 }], [product]), fingerprint);
  assert.notEqual(shippingFingerprint(items, [{ ...product, updatedAt: new Date(1) }]), fingerprint);
  assert.notEqual(shippingFingerprint(items, [{ ...product, shippingProfile: { ...profile, weightGrams: 500 } }]), fingerprint);
});
test("public quote input rejects duplicate products and invalid dimensions of request", () => {
  const item = { productId: "test", quantity: 1, expectedUnitPriceCents: 1200 };
  assert.equal(quoteRequestSchema.safeParse({ postalCode: "01001000", items: [item] }).success, true);
  assert.equal(quoteRequestSchema.safeParse({ postalCode: "01001000", items: [item, item] }).success, false);
  assert.equal(quoteRequestSchema.safeParse({ postalCode: "invalid", items: [item] }).success, false);
});
test("OAuth state is encrypted and bound to administrator, connection revision and nonce", () => {
  const previous = process.env.SECRET_VAULT_KEY;
  process.env.SECRET_VAULT_KEY = key;
  try {
    const state = createShippingState("synthetic-admin", 2);
    assert.equal(readShippingState(state.cookie, state.nonce, "synthetic-admin", 2).revision, 2);
    assert.throws(() => readShippingState(state.cookie, state.nonce, "another-admin", 2));
    assert.throws(() => readShippingState(state.cookie, "wrong", "synthetic-admin", 2));
    assert.throws(() => readShippingState(state.cookie, state.nonce, "synthetic-admin", 3));
    assert.throws(() => readShippingState(state.cookie.slice(5), state.nonce, "synthetic-admin", 2));
  } finally { if (previous === undefined) delete process.env.SECRET_VAULT_KEY; else process.env.SECRET_VAULT_KEY = previous; }
});
test("national requests require quote, address and Pix; existing pickup remains compatible", () => {
  const request = { customer: { name: "Cliente teste", phone: "44999990000" }, fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", privacyConsent: true, address: { postalCode: "01001000", street: "Rua Teste", number: "1", neighborhood: "Teste", city: "São Paulo", state: "SP" }, items: [{ productId: "test", quantity: 1, expectedUnitPriceCents: 1200 }] };
  assert.equal(checkoutRequestSchema.safeParse(request).success, false);
  assert.equal(checkoutRequestSchema.safeParse({ ...request, shippingToken: "synthetic-token-validated-server-side" }).success, true);
  assert.equal(checkoutRequestSchema.safeParse({ ...request, shippingToken: "test", paymentMethod: "CASH" }).success, false);
  assert.equal(checkoutRequestSchema.safeParse({ ...request, shippingToken: "test", fulfillmentMethod: "PICKUP" }).success, false);
  assert.equal(checkoutRequestSchema.safeParse({ ...request, fulfillmentMethod: "PICKUP" }).success, true);
});
