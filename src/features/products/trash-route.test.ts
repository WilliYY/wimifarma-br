import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

async function harness(path: string, role: string | null, count = 1, fail = false) {
  let reads = 0;
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-trash", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
  const tx = { $queryRaw: async () => [], product: { updateMany: async () => { reads++; if (fail) throw new Error("private database details"); return { count }; } }, offer: { updateMany: async () => ({ count: 0 }) }, auditLog: { create: async () => ({}) } };
  type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  const loaded = { exports: {} as Record<string, Handler> };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, Date, fixture: {
    auth: async () => role ? { user: { id: "fixture-admin", role } } : null,
    prisma: { $transaction: async (callback: (db: typeof tx) => unknown) => callback(tx), product: { findMany: async () => { reads++; if (fail) throw new Error("private database details"); return []; } } },
  } });
  return { run: (method: string, body?: unknown, query = "") => loaded.exports[method](new Request(`https://example.com/api/produtos/fixture${query}`, { method, ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}) }), { params: Promise.resolve({ id: "fixture" }) }), reads: () => reads };
}

const routes = [["src/app/api/produtos/[id]/route.ts", "DELETE"], ["src/app/api/produtos/[id]/restaurar/route.ts", "POST"], ["src/app/api/produtos/lixeira/route.ts", "GET"]];
const body = { expectedUpdatedAt: "2026-09-22T15:00:00.000Z" };

test("trash endpoints deny anonymous, customers and staff before database access", async () => {
  for (const [path, method] of routes) for (const role of [null, "CUSTOMER", "STAFF"]) {
    const fixture = await harness(path, role);
    assert.equal((await fixture.run(method, method === "GET" ? undefined : body)).status, 401);
    assert.equal(fixture.reads(), 0);
  }
});

test("trash mutations require current version, allow managers and reject stale or expired changes", async () => {
  for (const [path, method] of routes.slice(0, 2)) {
    const fixture = await harness(path, "MANAGER");
    assert.equal((await fixture.run(method, {})).status, 422);
    assert.equal(fixture.reads(), 0);
    const response = await fixture.run(method, body);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal((await (await harness(path, "ADMIN", 0)).run(method, body)).status, 409);
    const unavailable = await (await harness(path, "ADMIN", 1, true)).run(method, body);
    assert.equal(unavailable.status, 503);
    assert.ok(!(await unavailable.text()).includes("private database details"));
  }
});

test("trash list is private, validates pagination and reports outages", async () => {
  const fixture = await harness(routes[2][0], "ADMIN");
  assert.equal((await fixture.run("GET", undefined, "?page=0")).status, 400);
  assert.equal(fixture.reads(), 0);
  const response = await fixture.run("GET");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal((await (await harness(routes[2][0], "ADMIN", 1, true)).run("GET")).status, 503);
});
