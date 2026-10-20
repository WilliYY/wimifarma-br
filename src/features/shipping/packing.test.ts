import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { normalizeShippingPackaging, type PackingRequest } from "./packing";
import { normalizeQuotes, shippingFingerprint, signShippingQuote, verifyShippingQuote } from "./rules";

const request: PackingRequest = { inputMeasurementBasis: "estimated", products: [
  { id: "synthetic-a", width: 20.8, height: 21.6, length: 20.8, weight: 0.5, insurance_value: 9.99, quantity: 10 },
] };
const pack = { dimensions: { height: 35, width: 51.8, length: 52.8 }, weight: "5.00", insurance_value: "99.90", products: [{ id: "synthetic-a", quantity: 10 }] };

test("provider consolidation conserves ten units, packaged weight, volume and insurance without adding tare", () => {
  const result = normalizeShippingPackaging([pack], request)!;
  assert.equal(result.inputMeasurementBasis, "estimated");
  assert.deepEqual(result.packages, [{ weightGrams: 5000, widthCm: 51.8, heightCm: 35, lengthCm: 52.8, insuranceValueCents: 9990, items: [{ productId: "synthetic-a", quantity: 10 }] }]);
  const key = "synthetic-packing-signature-key";
  const payload = { provider: "melhor-envio" as const, serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 6040, deliveryDays: 8, packaging: result, postalCode: "01001000", fingerprint: "a".repeat(64), revision: 1, expiresAt: Date.now() + 900000 };
  const token = signShippingQuote(payload, key);
  assert.ok(token.length < 8000);
  assert.deepEqual(verifyShippingQuote(token, key).packaging, result);
  const [body, signature] = token.split(".");
  const changed = JSON.parse(Buffer.from(body, "base64url").toString());
  changed.packaging.packages[0].weightGrams = 1;
  assert.throws(() => verifyShippingQuote(`${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${signature}`, key));
});

test("multiple packages preserve the distribution of mixed products", () => {
  const mixed: PackingRequest = { inputMeasurementBasis: "measured", products: [
    { ...request.products[0], id: "a", quantity: 2 }, { ...request.products[0], id: "b", weight: 0.8, quantity: 1 },
  ] };
  const packages = [
    { ...pack, weight: 1, insurance_value: 19.98, products: [{ id: "a", quantity: 2 }] },
    { ...pack, weight: 0.8, insurance_value: 9.99, products: [{ id: "b", quantity: 1 }] },
  ];
  const result = normalizeShippingPackaging(packages, mixed)!;
  assert.equal(result.packages.length, 2);
  assert.equal(result.packages.reduce((sum, p) => sum + p.weightGrams, 0), 1800);
  assert.equal(result.inputMeasurementBasis, "measured");
  assert.equal(normalizeShippingPackaging([{ ...packages[0], weight: 0.5 }, { ...packages[1], weight: 1.3 }], mixed), null, "one heavier parcel cannot hide another's missing weight");
  assert.equal(normalizeShippingPackaging([{ ...packages[0], insurance_value: 9.99 }, { ...packages[1], insurance_value: 19.98 }], mixed), null, "insurance must also match the goods inside each parcel");
});

test("incomplete, lighter, smaller, underinsured or misallocated packing never becomes a quote", context => {
  const logs: unknown[] = [];
  context.mock.method(console, "warn", (...args: unknown[]) => logs.push(args));
  const bad = [undefined, [], [{ ...pack, weight: "4.99" }], [{ ...pack, weight: true }], [{ ...pack, weight: "NaN" }],
    [{ ...pack, dimensions: { width: 20.8, height: 21.6, length: 20.8 } }],
    [{ ...pack, insurance_value: "99.89" }], [{ ...pack, products: [{ id: "synthetic-a", quantity: 9 }] }],
    [{ ...pack, products: [{ id: "unknown-secret-value", quantity: 10 }] }], Array(21).fill(pack)];
  const quote = { id: 1, name: "PAC", price: "60.40", delivery_time: 8, company: { name: "Correios" }, packages: [pack] };
  for (const packages of bad) {
    assert.equal(normalizeShippingPackaging(packages, request), null);
    assert.throws(() => normalizeQuotes({ ...quote, packages }, [1], 1, request), { status: 502 });
    const partial = normalizeQuotes([{ ...quote, packages }, { ...quote, id: 2 }], [1, 2], 1, request);
    assert.deepEqual(partial.map(option => option.serviceId), [2]);
  }
  assert.doesNotMatch(JSON.stringify(logs), /unknown-secret-value/);
});

test("new packing strategy invalidates quotes issued with the old one-parcel-per-unit fingerprint", () => {
  const items = [{ productId: "synthetic-a", quantity: 10, expectedUnitPriceCents: 999 }];
  const product = { id: "synthetic-a", name: "Teste", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, shippingProfile: {}, updatedAt: new Date(0) };
  const legacy = createHash("sha256").update(JSON.stringify([{ ...items[0], updatedAt: product.updatedAt.toISOString(), profile: product.shippingProfile }])).digest("hex");
  assert.notEqual(shippingFingerprint(items, [product]), legacy);
});
