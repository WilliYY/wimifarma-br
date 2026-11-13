import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

test("Correios simulation restricts access and rejects credentials in the request", async () => {
  const bundle = await build({
    entryPoints: ["src/app/api/admin/fretes/correios/simular/route.ts"],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "correios-simulation-fixture", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/permissions$|shipping\/correios$/ },
        args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
        contents: args.path.endsWith("permissions")
          ? "export const requireAdminOnlyApi = async () => fixture.guard;"
          : `export class CorreiosError extends Error { constructor(message, status) { super(message); this.status = status; } }
             export const getCorreiosConfig = () => fixture.config;
             export const quoteCorreios = (config, input) => fixture.quote(config, input);`,
      }));
    } }],
  });

  const calls: unknown[] = [];
  const fixture = {
    guard: { response: new Response(null, { status: 403 }) as Response | undefined },
    config: null as { apiCode: string } | null,
    fail: false,
    async quote(_config: unknown, input: unknown) {
      calls.push(input);
      if (fixture.fail) throw new Error("synthetic-credential");
      return { quotes: [{ code: "03298", name: "PAC", priceCents: 1740, deliveryDays: 4 }], unavailableServices: ["03220"] };
    },
  };
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture,
    URL, Response, Buffer, TextDecoder, process: { env: {} },
  });

  const origin = "https://example.invalid";
  const volume = { originPostalCode: "87525000", destinationPostalCode: "01001000", weightGrams: 500, lengthCm: 25, widthCm: 15, heightCm: 10 };
  const request = (body: unknown = volume, requestOrigin = origin) => new Request(`${origin}/api/admin/fretes/correios/simular`, {
    method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const { POST } = loaded.exports;

  assert.equal((await POST(request())).status, 403);
  fixture.guard.response = undefined;
  assert.equal((await POST(request())).status, 503);
  fixture.config = { apiCode: "synthetic-credential" };
  assert.equal((await POST(request(volume, "https://other.invalid"))).status, 403);
  assert.equal((await POST(request({ ...volume, apiCode: "provided-by-browser" }))).status, 422);
  assert.equal(calls.length, 0);

  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [volume]);
  const body = await response.text();
  assert.equal(body.includes("synthetic-credential"), false);
  assert.deepEqual(JSON.parse(body).data.unavailableServices, ["03220"]);

  fixture.fail = true;
  const failed = await POST(request());
  assert.equal(failed.status, 503);
  assert.equal((await failed.text()).includes("synthetic-credential"), false);
});
