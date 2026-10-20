import assert from "node:assert/strict";
import test from "node:test";
import { calculatePackedQuotes } from "./calculate-packed-quotes";
import type { PackingProduct, PackingRequest } from "./packing";
import { shippingPackagingSchema, ShippingError } from "./schema";

const request: PackingRequest = { inputMeasurementBasis: "estimated", products: [
  { id: "synthetic-dove", width: 10, height: 18, length: 10, weight: 0.6, insurance_value: 31.9, quantity: 2 },
  { id: "synthetic-kitkat", width: 20.8, height: 21.6, length: 20.8, weight: 0.5, insurance_value: 9.99, quantity: 2 },
] };
function quote(id: number, valid = false, price = "31.61") {
  return { id, name: `Serviço ${id}`, price, delivery_time: 4, company: { name: "Transportadora sintética" }, packages: [{
    dimensions: valid ? { width: 43.2, height: 21.6, length: 43.2 } : { width: 30.8, height: 18, length: 40.8 },
    weight: "2.20", insurance_value: "83.78", products: request.products.map(({ id, quantity }) => ({ id, quantity })),
  }] };
}

test("mixed products retry once with a conservative cube without losing quantities, weight or insurance", async context => {
  context.mock.method(console, "warn", () => {});
  const calls: { products: PackingProduct[]; ids: number[] }[] = [];
  const result = await calculatePackedQuotes(request, [1, 2], 2, async (products, ids) => {
    calls.push({ products, ids });
    return calls.length === 1 ? [quote(1)] : [quote(1, true)];
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].products, request.products);
  assert.deepEqual(calls[1].ids, [1]);
  calls[1].products.forEach((product, index) => {
    const original = request.products[index];
    assert.deepEqual(product, { ...original, width: 21.6, height: 21.6, length: 21.6 });
    assert.ok(product.width >= original.width && product.height >= original.height && product.length >= original.length);
  });
  assert.equal(request.products[0].height, 18, "the original request stays unchanged");
  assert.equal(result[0].packaging?.calculationMethod, "provider-conservative-envelope");
  assert.equal(result[0].packaging?.packages[0].weightGrams, 2200);
  assert.equal(result[0].packaging?.packages[0].insuranceValueCents, 8378);
  assert.equal(result[0].deliveryDays, 6);
});

test("partial valid quotes stay unchanged and fallback cannot introduce unrequested services", async context => {
  context.mock.method(console, "warn", () => {});
  let calls = 0;
  const result = await calculatePackedQuotes(request, [1, 2, 3], 1, async (_products, ids) => {
    if (++calls === 1) return [quote(1, true, "10.00"), quote(2), { id: 3, error: "CEP não atendido" }];
    assert.deepEqual(ids, [2]);
    return [quote(1, true, "1.00"), quote(2, true, "20.00"), quote(3, true, "2.00"), quote(4, true)];
  });
  assert.deepEqual(result.map(option => [option.serviceId, option.priceCents, option.packaging?.calculationMethod]), [
    [1, 1000, "provider"], [2, 2000, "provider-conservative-envelope"],
  ]);
});

test("fallback failures preserve the first valid quotes", async context => {
  const diagnostics: unknown[][] = [];
  context.mock.method(console, "warn", (...args: unknown[]) => diagnostics.push(args));
  for (const failure of [new ShippingError("Temporariamente indisponível", 429), null]) {
    let calls = 0;
    const result = await calculatePackedQuotes(request, [1, 2], 0, async () => {
      if (++calls === 1) return [quote(1, true), quote(2)];
      if (failure) throw failure;
      return [quote(2)];
    });
    assert.equal(calls, 2);
    assert.deepEqual(result.map(option => option.serviceId), [1]);
  }
  assert.match(JSON.stringify(diagnostics), /packing-retry-failed/);
  assert.doesNotMatch(JSON.stringify(diagnostics), /Temporariamente indisponível/);
});

test("unexpected programming errors in fallback remain visible instead of being swallowed", async context => {
  context.mock.method(console, "warn", () => {});
  let calls = 0;
  const failure = new Error("synthetic-unexpected-failure");
  await assert.rejects(calculatePackedQuotes(request, [1, 2], 0, async () => {
    if (++calls === 1) return [quote(1, true), quote(2)];
    throw failure;
  }), error => error === failure);
  assert.equal(calls, 2);
});

test("coverage, authentication, rate limits and malformed quote metadata never trigger fallback", async context => {
  context.mock.method(console, "warn", () => {});
  let calls = 0;
  assert.deepEqual(await calculatePackedQuotes(request, [1], 0, async () => { calls++; return [{ id: 1, error: "CEP não atendido" }]; }), []);
  assert.equal(calls, 1);
  for (const status of [401, 403, 429]) {
    calls = 0;
    await assert.rejects(calculatePackedQuotes(request, [1], 0, async () => { calls++; throw new ShippingError("synthetic-provider-failure", status); }), { status });
    assert.equal(calls, 1);
  }
  calls = 0;
  await assert.rejects(calculatePackedQuotes(request, [1], 0, async () => { calls++; return [{ ...quote(1), price: "invalid" }]; }), { status: 502 });
  assert.equal(calls, 1);
});

test("a second invalid packing or coverage failure fails safely without a third call", async context => {
  context.mock.method(console, "warn", () => {});
  // This plan fits the original units but not the larger conservative volume.
  const originalOnly = quote(1, true);
  originalOnly.packages[0].dimensions = { width: 25, height: 25, length: 40 };
  for (const second of [[quote(1)], [{ id: 1, error: "CEP não atendido" }], [originalOnly]]) {
    let calls = 0;
    await assert.rejects(calculatePackedQuotes(request, [1], 0, async () => ++calls === 1 ? [quote(1)] : second), { status: 502 });
    assert.equal(calls, 2);
  }
});

test("packaging snapshots without a method remain compatible", () => {
  const parsed = shippingPackagingSchema.parse({ version: 1, inputMeasurementBasis: "estimated", packages: [{
    weightGrams: 500, widthCm: 25, heightCm: 25, lengthCm: 25, insuranceValueCents: 999,
    items: [{ productId: "synthetic-kitkat", quantity: 1 }],
  }] });
  assert.equal(parsed.calculationMethod, "provider");
});
