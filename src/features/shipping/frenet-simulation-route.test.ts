import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

test("Frenet ADMIN compares identical packages for both origins without exposing the token", async () => {
  const bundle = await build({
    entryPoints: ["src/app/api/admin/fretes/frenet/simular/route.ts"],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "frenet-simulation-fixture", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/permissions$|shipping\/frenet$|shipping\/http$/ },
        args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
        contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi = async () => fixture.guard;"
          : args.path.endsWith("frenet") ? "export const quoteFrenet = (...args) => fixture.quote(...args);"
            : "export const limitShippingRequest = () => {}; export const shippingBody = req => req.json(); export const noStore = {'Cache-Control':'private, no-store'}; export const shippingFailure = error => Response.json({error:error.message},{status:error.status||500});",
      }));
    } }],
  });
  const calls: Array<Record<string, unknown>> = [];
  const fixture = {
    guard: { response: undefined as Response | undefined },
    failureOrigin: "",
    async quote(input: Record<string, unknown>) {
      calls.push(input);
      if (fixture.failureOrigin === "both" || fixture.failureOrigin === input.originPostalCode) throw new Error("synthetic-token");
      return [{ serviceId: "03298", priceCents: input.originPostalCode === "87525000" ? 2000 : 1600 }];
    },
  };
  const env: Record<string, string> = {};
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture,
    Response, Buffer, console, process: { env },
  });
  const payload = { postalCode: "01001000", weightGrams: 500, lengthCm: 25, widthCm: 15, heightCm: 10, invoiceValueCents: 5000 };
  const request = (body: unknown = payload) => new Request("https://example.invalid/api/admin/fretes/frenet/simular", {
    method: "POST", body: JSON.stringify(body),
  });
  fixture.guard.response = new Response(null, { status: 403 });
  assert.equal((await loaded.exports.POST(request())).status, 403);
  fixture.guard.response = undefined;
  assert.equal((await loaded.exports.POST(request())).status, 503);
  env.FRENET_API_TOKEN = "synthetic-token";
  assert.equal((await loaded.exports.POST(request({ ...payload, token: "external" }))).status, 422);
  assert.equal(calls.length, 0);
  const response = await loaded.exports.POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(calls.map(call => call.originPostalCode), ["87525000", "87485000"]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.map(call => call.items))), Array(2).fill([{
    weightGrams: 500, lengthCm: 25, widthCm: 15, heightCm: 10, quantity: 1,
  }]));
  const body = await response.text();
  assert.equal(body.includes("synthetic-token"), false);
  assert.deepEqual(JSON.parse(body).data.map((origin: { quotes: Array<{ priceCents: number }> }) => origin.quotes[0].priceCents), [2000, 1600]);
  fixture.failureOrigin = "87485000";
  const partial = await loaded.exports.POST(request());
  assert.equal(partial.status, 200);
  assert.deepEqual((await partial.json()).data.map((origin: { available: boolean }) => origin.available), [true, false]);
  fixture.failureOrigin = "both";
  const failed = await loaded.exports.POST(request());
  assert.equal(failed.status, 502);
  assert.equal((await failed.text()).includes("synthetic-token"), false);
});
