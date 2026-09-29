import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { melhorEnvioRequest } from "./provider";
import { defaultShippingSettings } from "./schema";
import { shippingBody } from "./http";

test("shipping administration denies anonymous, customers, staff and managers before data access", async () => {
  const routes = [
    ["src/app/api/admin/fretes/route.ts", "GET", "PUT"],
    ["src/app/api/admin/fretes/simular/route.ts", "POST"],
    ["src/app/api/admin/fretes/produtos/[id]/route.ts", "PUT"],
    ["src/app/api/admin/fretes/conectar/route.ts", "POST"],
    ["src/app/api/admin/fretes/conectar/callback/route.ts", "GET"],
  ];
  for (const [path, ...methods] of routes) {
    const result = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-shipping", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : "export const getPrisma=()=>{throw new Error('Database must not be accessed')};" }));
    } }] });
    for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
      type Handler = (request: Request, context: unknown) => Promise<Response>;
      const loaded = { exports: {} as Record<string, Handler> };
      vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture: { auth: async () => role ? { user: { id: "synthetic-user", role } } : null } });
      for (const method of methods) {
        const response = await loaded.exports[method](new Request("https://example.com/api/admin/fretes", { method }), { params: Promise.resolve({ id: "synthetic-product" }) });
        assert.equal(response.status, 401, `${path} ${method} ${role}`);
      }
    }
  }
});

test("provider uses separate environments and redacts credentials and upstream failures", async (context) => {
  let status = 200;
  const calls: { url: string; options?: RequestInit }[] = [];
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request, options?: RequestInit) => {
    calls.push({ url: String(url), options });
    return new Response(status === 200 ? "[]" : "synthetic-private-provider-error", { status });
  });
  const settings = { ...defaultShippingSettings, contactEmail: "shipping@example.com" };
  await melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", "synthetic-test-token", { volumes: [] });
  assert.equal(calls[0].url, "https://melhorenvio.com.br/api/v2/me/shipment/calculate");
  assert.equal(calls[0].options?.redirect, "error");
  assert.equal(new Headers(calls[0].options?.headers).get("User-Agent"), "Wimifarma (shipping@example.com)");
  await melhorEnvioRequest({ ...settings, environment: "sandbox" }, "/oauth/token", undefined, {});
  assert.equal(calls[1].url, "https://sandbox.melhorenvio.com.br/oauth/token");
  for (status of [401, 403, 429, 500]) {
    await assert.rejects(melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", "synthetic-test-token", {}), (error: Error) => !/synthetic-private|synthetic-test-token/.test(error.message));
  }
});

test("shipping mutations reject cross-origin, malformed and oversized requests", async () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://example.com";
  try {
    const request = (origin: string, body: string) => new Request("https://example.com/api/admin/fretes", { method: "PUT", headers: { origin, "Content-Type": "application/json" }, body });
    assert.deepEqual(await shippingBody(request("https://example.com", "{}")), {});
    await assert.rejects(shippingBody(request("https://attacker.example", "{}")), /Origem/);
    await assert.rejects(shippingBody(request("https://example.com", "{")), /JSON inválido/);
    await assert.rejects(shippingBody(request("https://example.com", " ".repeat(32001))), /muito grande/);
  } finally { if (previous === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = previous; }
});
