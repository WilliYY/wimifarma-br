import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

test("public estimate route accepts only server-resolved product identity, CEP and bounded quantity", async () => {
  const compiled = await build({ entryPoints: ["src/app/api/fretes/estimativa/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "public-estimate-route-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/shipping\/public-estimate$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const estimateProductShipping=async(input)=>{globalThis.fixture.calls.push(input);if(globalThis.fixture.fail)throw new Error('private-provider-token');return {mode:'estimate',options:[]}};" }));
  } }] });
  const fixture = { calls: [] as unknown[], fail: false };
  const loaded = { exports: {} as { POST(request: Request): Promise<Response> } };
  vm.runInNewContext(compiled.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, Buffer, TextDecoder, process, console, fixture });
  const origin = new URL(process.env.AUTH_URL || "http://localhost:3000").origin;
  let ip = 0;
  const request = (body: unknown, headers: Record<string, string> = {}) => new Request(`${origin}/api/fretes/estimativa`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": `estimate-${++ip}`, ...headers }, body: JSON.stringify(body) });
  const valid = { productId: "synthetic-product", postalCode: "01001000", quantity: 1 };
  const success = await loaded.exports.POST(request(valid));
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await success.json(), { data: { mode: "estimate", options: [] } });
  assert.equal(fixture.calls.length, 1);
  for (const patch of [{ quantity: 0 }, { quantity: 21 }, { quantity: 1.5 }, { postalCode: "00000000" }, { postalCode: "bad" }, { productId: "" }, { price: 1 }, { expectedUnitPriceCents: 1 }, { weightGrams: 1 }, { cargoKinds: ["general"] }, { shippingProfile: {} }, { items: [] }]) {
    const response = await loaded.exports.POST(request({ ...valid, ...patch }));
    assert.equal(response.status, 422, JSON.stringify(patch));
    assert.equal(fixture.calls.length, 1);
  }
  assert.equal((await loaded.exports.POST(request(valid, { origin: "https://untrusted.example.invalid" }))).status, 403);
  assert.equal((await loaded.exports.POST(request(valid, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await loaded.exports.POST(request({ ...valid, overflow: "x".repeat(33000) }))).status, 413);
  fixture.fail = true;
  const failed = await loaded.exports.POST(request(valid));
  assert.equal(failed.status, 503);
  const errorBody = await failed.text();
  assert.equal(errorBody.includes("private-provider-token"), false);
  assert.equal(errorBody.includes("priceCents"), false);
  for (let i = 0; i < 15; i++) await loaded.exports.POST(request(valid, { "x-real-ip": "limited-estimate" }));
  assert.equal((await loaded.exports.POST(request(valid, { "x-real-ip": "limited-estimate" }))).status, 429);
});
