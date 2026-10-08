import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/admin/pagamentos/asaas/route.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "production-admin-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|asaas-integration$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
      ? "export const auth=async()=>fixture.session;"
      : "export const prepareAsaasIntegration=fixture.prepare; export const activateAsaasIntegration=fixture.activate; export const asaasIntegrationView=fixture.view;" }));
  } }] });
async function harness(role: string | null = "ADMIN") {
  const calls: { action: string; input?: unknown; userId?: string }[] = [];
  const controls = { fail: false };
  const operation = (action: string) => async (input: unknown, userId: string) => {
    calls.push({ action, input, userId });
    if (controls.fail) throw new Error("synthetic-private-token");
  };
  const fixture = { session: role ? { user: { id: "synthetic-admin", role } } : null,
    prepare: operation("prepare"), activate: operation("activate"), view: async () => {
      calls.push({ action: "view" }); return { connected: true, revision: 2, enabled: false, methods: [] };
    } };
  const loaded = { exports: {} as Record<"GET" | "POST", (request: Request) => Promise<Response>> };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    URL, Request, Response, Buffer, process: { env: { AUTH_URL: "https://example.com" } }, fixture });
  return { calls, controls, run: (body: string | object | null, origin = "https://example.com", type = "application/json") => loaded.exports[body === null ? "GET" : "POST"](
    new Request("https://example.com/api/admin/pagamentos/asaas", { method: body === null ? "GET" : "POST", headers: { origin, "content-type": type },
      ...(body === null ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }) })) };
}
test("production API denies anonymous and every nonADMIN before reading state or invoking operations", async () => {
  for (const role of [null, "CUSTOMER", "MANAGER", "STAFF"]) {
    const h = await harness(role);
    assert.equal((await h.run(null)).status, 401);
    assert.equal((await h.run({ action: "activate", enabled: true })).status, 401);
    assert.deepEqual(h.calls, []);
  }
});
test("production mutation rejects missing or foreign origin, wrong MIME, malformed and oversized JSON", async () => {
  for (const [body, origin, type, status] of [["{}", "", "application/json", 403], ["{}", "https://evil.invalid", "application/json", 403],
    ["{}", "https://example.com", "text/plain", 415], ["broken", "https://example.com", "application/json", 400],
    ["x".repeat(2049), "https://example.com", "application/json", 413]] as const) {
    const h = await harness(); assert.equal((await h.run(body, origin, type)).status, status); assert.deepEqual(h.calls, []);
  }
});
test("production actions accept only strict server-owned connection and activation inputs", async () => {
  for (const body of [{ action: "prepare", revision: 0, email: "owner@example.invalid", accessToken: "$aact_prod_synthetic" },
    { action: "prepare", revision: -1, email: "owner@example.invalid" }, { action: "prepare", revision: 0.5, email: "owner@example.invalid" },
    { action: "prepare", revision: 0, email: "invalid" }, { action: "activate", revision: 0, enabled: true, methods: ["cash"] },
    { action: "activate", revision: 0, enabled: "true", methods: ["card"] },
    { action: "activate", revision: 0, enabled: true, methods: ["card"], environment: "test" }]) {
    const h = await harness(); assert.equal((await h.run(body)).status, 422); assert.deepEqual(h.calls, []);
  }
});
test("ADMIN operations receive authenticated actor and return private fresh state", async () => {
  for (const body of [{ action: "prepare", revision: 0, email: "owner@example.invalid" },
    { action: "activate", revision: 2, enabled: true, methods: ["card"] }]) {
    const h = await harness(); const response = await h.run(body);
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(h.calls[0].action, body.action); assert.equal(h.calls[0].userId, "synthetic-admin");
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].input)), body); assert.equal(h.calls[1].action, "view");
  }
});
test("production failures hide secrets and do not report successful state", async () => {
  const h = await harness(); h.controls.fail = true;
  const response = await h.run({ action: "prepare", revision: 0, email: "owner@example.invalid" });
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /synthetic-private-token/);
  assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(h.calls.length, 1);
});
test("production mutation rate limit stops the sixth operation before service execution", async () => {
  const h = await harness();
  for (let i = 0; i < 5; i++) assert.equal((await h.run({ action: "prepare", revision: i, email: "owner@example.invalid" })).status, 200);
  assert.equal((await h.run({ action: "prepare", revision: 5, email: "owner@example.invalid" })).status, 429);
  assert.equal(h.calls.filter(call => call.action === "prepare").length, 5);
});
