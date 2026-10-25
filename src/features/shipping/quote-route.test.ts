import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

test("invalid freight input, including zero CEP, is rejected before calculating a provider quote", async () => {
  const compiled = await build({ entryPoints: ["src/app/api/fretes/cotacao/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "quote-route-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/shipping\/service$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const quoteCart=async(...args)=>{globalThis.fixture.calls.push(args);return []};" }));
  } }] });
  const fixture = { calls: [] as unknown[] };
  const loaded = { exports: {} as { POST(request: Request): Promise<Response> } };
  vm.runInNewContext(compiled.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, Buffer, TextDecoder, process, console, fixture });
  const origin = new URL(process.env.AUTH_URL || "https://shipping.example.invalid").origin;
  const items = [{ productId: "synthetic-product", quantity: 1, expectedUnitPriceCents: 1000 }];
  for (const input of [
    { postalCode: "00000000", items }, { postalCode: "00000", items },
    { postalCode: "01001000", items: [...items, ...items] },
    { postalCode: "01001000", items: [{ ...items[0], quantity: -1 }] },
    { postalCode: "01001000", items: [{ ...items[0], expectedUnitPriceCents: -1 }] },
  ]) {
    const response = await loaded.exports.POST(new Request(`${origin}/api/fretes/cotacao`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(input) }));
    assert.equal(response.status, 422);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(fixture.calls.length, 0, "invalid input must not consume a provider calculation");
  }
  const legacy = await loaded.exports.POST(new Request(`${origin}/api/fretes/cotacao`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ postalCode: "01001000", items }) }));
  assert.equal(legacy.status, 409);
  assert.equal(fixture.calls.length, 0, "old pages must refresh before receiving a new-price token");
  const response = await loaded.exports.POST(new Request(`${origin}/api/fretes/cotacao`, { method: "POST", headers: { origin, "content-type": "application/json", "X-Wimifarma-Shipping-Benefit": "1" }, body: JSON.stringify({ postalCode: "01001000", items, discountCents: 3 }) }));
  assert.equal(response.status, 200);
  assert.equal(fixture.calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.calls[0])), ["01001000", items, 3]);
});
