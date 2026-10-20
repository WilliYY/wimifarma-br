import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { defaultShippingSettings } from "./schema";

test("admin simulation requests every validated catalog service without changing checkout settings", async () => {
  const bundle = await build({ entryPoints: ["src/app/api/admin/fretes/simular/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "simulation-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|shipping\/integration$|shipping\/provider$|shipping\/http$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=async()=>({});"
      : args.path.endsWith("integration") ? "export const readShippingIntegration=async()=>globalThis.fixture.integration;export const shippingAccessToken=async()=>'synthetic-token';"
      : args.path.endsWith("provider") ? "export const melhorEnvioRequest=async(...args)=>globalThis.fixture.provider(...args);"
      : "export const limitShippingRequest=()=>{};export const noStore={};export const shippingBody=async request=>request.json();export const shippingFailure=error=>Response.json({error:error.message},{status:error.status||500});" }));
  } }] });
  let catalog: unknown = [{ id: 1, name: "PAC" }, { id: 12, name: "LATAM" }, { id: 35, name: "Total" }];
  const calls: { path: string; body: { services?: string; volumes?: Record<string, unknown>[] } | undefined }[] = [];
  const integration = { settings: { ...defaultShippingSettings, serviceIds: [1, 2] } };
  const fixture = { integration, provider: async (_settings: unknown, path: string, _token: string, body?: { services?: string }) => {
    calls.push({ path, body });
    return path.endsWith("services") ? catalog : [{ id: 12, name: "LATAM", price: "20.00", delivery_time: 3, company: { name: "LATAM" } }];
  } };
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, Response, console, Buffer, process });
  const request = () => new Request("https://example.invalid/api/admin/fretes/simular", { method: "POST", body: JSON.stringify({ postalCode: "01001000", width: 20, height: 20, length: 20, weight: 0.5, insurance: 20 }) });
  const initial = await loaded.exports.POST(request());
  assert.equal(initial.status, 200);
  const initialBody = await initial.json();
  assert.equal(initialBody.comparison[0].cargo.status, "unknown", "unspecified cargo cannot be recommended");
  assert.equal(initialBody.comparison[0].cost.totalCostCents, null, "missing route/cost data is not zero");
  assert.equal(initialBody.comparison[0].bestKnownCost, false);
  assert.equal(calls[0].path, "/api/v2/me/shipment/services");
  assert.equal(calls[1].body?.services, "1,12,35");
  assert.deepEqual(integration.settings.serviceIds, [1, 2]);
  assert.equal(Object.hasOwn(calls[1].body?.volumes?.[0] ?? {}, "cargoKinds"), false, "internal classification is not sent as a package dimension");
  const prohibited = await loaded.exports.POST(new Request(request(), { body: JSON.stringify({ postalCode: "01001000", width: 20, height: 20, length: 20, weight: 0.5, insurance: 20, cargoKinds: ["perfume"], acceptanceConfirmed: true }) }));
  assert.equal((await prohibited.json()).comparison[0].cargo.status, "blocked", "manual review cannot override a carrier prohibition");
  for (const cargoKinds of [[], ["not-cargo"], ["general", "general"]]) {
    const before = calls.length;
    const response = await loaded.exports.POST(new Request(request(), { body: JSON.stringify({ postalCode: "01001000", width: 20, height: 20, length: 20, weight: 0.5, insurance: 20, cargoKinds }) }));
    assert.equal(response.status, 422);
    assert.equal(calls.length, before, "invalid cargo is rejected before external requests");
  }
  for (catalog of [[], {}, [{ id: "1" }], [{ id: -1 }], Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }))]) {
    const before = calls.length;
    assert.equal((await loaded.exports.POST(request())).status, 502);
    assert.equal(calls.length, before + 1, "invalid catalog never reaches calculation");
  }
});
