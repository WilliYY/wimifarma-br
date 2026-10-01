import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

test("catalog endpoints reject non-admin shipping writes and self-approved drafts before database access", async () => {
  const profile = { enabled: false, transportReviewed: false, weightGrams: 50, widthCm: 4, lengthCm: 10, heightCm: 2 };
  for (const [path, method] of [["src/app/api/produtos/route.ts", "POST"], ["src/app/api/produtos/[id]/route.ts", "PATCH"]]) {
    const result = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-catalog-shipping", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : "export const getPrisma=()=>{throw new Error('Database must not be accessed')};" }));
    } }] });
    for (const role of [null, "CUSTOMER", "STAFF", "MANAGER", "ADMIN"]) {
      type Handler = (request: Request, context: unknown) => Promise<Response>;
      const loaded = { exports: {} as Record<string, Handler> };
      vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture: { auth: async () => role ? { user: { id: "synthetic-user", role } } : null } });
      const shippingProfile = role === "ADMIN" ? { ...profile, enabled: true, transportReviewed: true } : profile;
      const response = await loaded.exports[method](new Request("https://example.com/api/produtos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Produto sintético", price: 10, shippingProfile, expectedUpdatedAt: "2026-10-01T00:00:00.000Z" }) }), { params: Promise.resolve({ id: "synthetic-product" }) });
      assert.equal(response.status, role === "ADMIN" ? 422 : role === "MANAGER" ? 403 : 401, `${method} ${role}`);
    }
  }
});
