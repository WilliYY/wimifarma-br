import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { normalizeQuotes, shippingFingerprint, signShippingQuote, validateShippingProduct, verifyShippingQuote } from "./rules";
import { quoteRequestSchema, shippingProfileSchema } from "./schema";
import { shippingDraftSchema, invalidateShippingProfile } from "./product-draft";
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
  assert.deepEqual(normalizeQuotes([{ id: 22, error: "Transportadora não atende este trecho." }], [22], 1), []);
  assert.deepEqual(normalizeQuotes([], [1, 2], 1), []);
  const available = { id: 2, name: "SEDEX", price: "12.50", delivery_time: 4, company: { name: "Correios" } };
  assert.deepEqual(normalizeQuotes([temporarilyUnavailable[0], available], [1, 2], 1).map((option) => option.serviceId), [2]);
  assert.deepEqual(normalizeQuotes([{ id: 9, error: "Serviço indisponível no momento" }, available], [2], 1).map((option) => option.serviceId), [2]);
  assert.deepEqual(normalizeQuotes([{ id: 32, error: "Transportadora não atende este trecho." }, available], [2, 32], 1).map((option) => option.serviceId), [2]);
});

test("unknown carrier errors remain technical failures while valid partial quotes survive", (context) => {
  const diagnostics: unknown[][] = [];
  context.mock.method(console, "warn", (...args: unknown[]) => diagnostics.push(args));
  const valid = { id: 2, name: "SEDEX", price: "12.50", delivery_time: 4, company: { name: "Correios" } };
  for (const error of ["Falha interna da transportadora", "Servico temporariamente fora do ar", { message: "synthetic-private-token" }]) {
    assert.throws(() => normalizeQuotes([{ id: 1, error }], [1], 1), { status: 502 });
    assert.deepEqual(normalizeQuotes([{ id: 1, error }, valid], [1, 2], 1).map(option => option.serviceId), [2]);
    assert.throws(() => normalizeQuotes([{ id: 1, error }, { id: 2, error: "CEP não atendido" }], [1, 2], 1), { status: 502 });
  }
  assert.ok(diagnostics.length > 0);
  assert.match(JSON.stringify(diagnostics), /serviceId/);
  assert.doesNotMatch(JSON.stringify(diagnostics), /synthetic-private-token|Falha interna|fora do ar/);
  assert.throws(() => normalizeQuotes([{ id: 1, price: "invalid" }], [1], 1), { status: 502 });
});

test("malformed upstream entries fail safely and single-service responses normalize", (context) => {
  context.mock.method(console, "warn", () => {});
  const valid = { id: 1, name: "PAC", price: "12.50", delivery_time: 4, company: { name: "Correios" } };
  for (const malformed of [null, {}, "upstream failure", { error: "Falha interna" }, { id: "1", error: "Falha interna" }]) {
    assert.throws(() => normalizeQuotes([malformed], [1], 1), { status: 502 });
    assert.deepEqual(normalizeQuotes([malformed, valid], [1], 1).map(option => option.serviceId), [1]);
  }
  assert.deepEqual(normalizeQuotes(valid, [1], 1).map(option => option.serviceId), [1]);
  assert.deepEqual(normalizeQuotes(valid, [2], 1), []);
  assert.deepEqual(normalizeQuotes([valid], [2], 1), []);
  assert.deepEqual(normalizeQuotes([], [1], 1), []);
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
  assert.notEqual(shippingFingerprint(items, [{ ...product, shippingProfile: { ...profile, approvedServiceIds: [1, 2] } }]), fingerprint);
});

test("shipping approvals persist through approved profiles, drafts and invalidation", () => {
  for (const approvedServiceIds of [[], [1, 2, 35]]) {
    assert.deepEqual(shippingProfileSchema.parse({ ...profile, approvedServiceIds }).approvedServiceIds, approvedServiceIds);
    assert.deepEqual(shippingDraftSchema.parse({ ...profile, enabled: false, transportReviewed: false, approvedServiceIds }).approvedServiceIds, approvedServiceIds);
    assert.deepEqual(invalidateShippingProfile({ ...profile, approvedServiceIds })?.approvedServiceIds, approvedServiceIds);
  }
  for (const approvedServiceIds of [[0], [-1], [1.5], ["1"], Array(51).fill(1)]) {
    assert.equal(shippingProfileSchema.safeParse({ ...profile, approvedServiceIds }).success, false);
  }
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
