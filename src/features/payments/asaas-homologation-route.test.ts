import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/admin/pagamentos/asaas-homologacao/route.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "synthetic-admin", setup(builder) {
    builder.onResolve({ filter: /^zod$/ }, () => ({ path: "zod", external: true }));
    builder.onResolve({ filter: /features\/auth\/auth$|asaas-service$|asaas-sandbox-integration$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
      ? "export const auth=async()=>fixture.session;" : args.path.endsWith("integration")
        ? "export const prepareAsaasSandboxIntegration=fixture.prepare;"
        : "import {z} from 'zod'; export const asaasTestCreation=z.object({productId:z.string().min(1).max(128),method:z.enum(['pix','card']),requestId:z.uuid()}).strict(); export const createAsaasSandboxPayment=fixture.create; export const refreshAsaasSandboxPayment=fixture.refresh; export const getAsaasHomologationState=fixture.state;" }));
  } }] });
async function harness(role: string | null = "ADMIN") {
  const calls: string[] = [];
  const controls = { fail: false };
  const record = (action: string) => async () => { calls.push(action); if (controls.fail) throw new Error("synthetic-secret-not-to-leak"); };
  const fixture = { session: role ? { user: { id: "synthetic-admin", role } } : null,
    prepare: record("prepare"), create: record("create"), refresh: record("refresh"), state: async () => { calls.push("state"); return { prepared: false, revision: 0, webhookReady: false, products: [], attempts: [] }; } };
  const loaded = { exports: {} as Record<"GET" | "POST", (request: Request) => Promise<Response>> };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    URL, Request, Response, Buffer, process: { env: { AUTH_URL: "https://example.com" } }, fixture });
  return { calls, controls, run: (body: string | object | null, origin = "https://example.com", type = "application/json") => loaded.exports[body === null ? "GET" : "POST"](
    new Request("https://example.com/api/admin/pagamentos/asaas-homologacao", { method: body === null ? "GET" : "POST", headers: { origin, "content-type": type },
      ...(body === null ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }) })) };
}
test("homologation API rejects anonymous and nonADMIN before private state or operations", async () => {
  for (const role of [null, "CUSTOMER", "MANAGER", "STAFF"]) {
    const f = await harness(role); assert.equal((await f.run(null)).status, 401); assert.equal((await f.run({ action: "create" })).status, 401); assert.equal(f.calls.length, 0);
  }
});
test("homologation mutations enforce origin, JSON, body limit and strict Sandbox actions", async () => {
  for (const [body, origin, type, status] of [["{}", "https://evil.invalid", "application/json", 403], ["{}", "https://example.com", "text/plain", 415],
    ["broken", "https://example.com", "application/json", 400], ["x".repeat(2049), "https://example.com", "application/json", 413],
    [JSON.stringify({ action: "refresh", orderId: "x", environment: "production" }), "https://example.com", "application/json", 422]] as const) {
    const f = await harness(); assert.equal((await f.run(body, origin, type)).status, status); assert.equal(f.calls.length, 0);
  }
});
test("admin operations return sanitized full state without accepting real financial details", async () => {
  for (const [body, action] of [[{ action: "prepare", credentialId: "x", email: "owner@example.invalid", revision: 0 }, "prepare"],
    [{ action: "create", productId: "x", method: "card", requestId: "123e4567-e89b-42d3-a456-426614174000" }, "create"],
    [{ action: "refresh", orderId: "x" }, "refresh"]] as const) {
    const f = await harness(); const response = await f.run(body); assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.deepEqual(f.calls, [action, "state"]);
  }
  const f = await harness(); f.controls.fail = true;
  const response = await f.run({ action: "refresh", orderId: "x" }); assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /synthetic-secret/);
});
