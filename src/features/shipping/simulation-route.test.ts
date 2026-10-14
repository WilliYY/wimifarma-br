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
  const calls: { path: string; body: { services?: string } | undefined }[] = [];
  const integration = { settings: { ...defaultShippingSettings, serviceIds: [1, 2] } };
  const fixture = { integration, provider: async (_settings: unknown, path: string, _token: string, body?: { services?: string }) => {
    calls.push({ path, body });
    return path.endsWith("services") ? catalog : [{ id: 12, name: "LATAM", price: "20.00", delivery_time: 3, company: { name: "LATAM" } }];
  } };
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, Response, console, Buffer, process });
  const request = () => new Request("https://example.invalid/api/admin/fretes/simular", { method: "POST", body: JSON.stringify({ postalCode: "01001000", width: 20, height: 20, length: 20, weight: 0.5, insurance: 20 }) });
  assert.equal((await loaded.exports.POST(request())).status, 200);
  assert.equal(calls[0].path, "/api/v2/me/shipment/services");
  assert.equal(calls[1].body?.services, "1,12,35");
  assert.deepEqual(integration.settings.serviceIds, [1, 2]);
  for (catalog of [[], {}, [{ id: "1" }], [{ id: -1 }], Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }))]) {
    const before = calls.length;
    assert.equal((await loaded.exports.POST(request())).status, 502);
    assert.equal(calls.length, before + 1, "invalid catalog never reaches calculation");
  }
});
