import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

async function harness(session: unknown, active = true, fail = false) {
  const calls: Array<{ customerId: string; query: unknown }> = [];
  let customerWhere: unknown;
  const result = await build({ entryPoints: ["src/app/api/minha-conta/pedidos/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-account", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|customer-orders-service$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : "export const getCustomerOrders=globalThis.fixture.orders;" }));
  } }] });
  const loaded = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, URLSearchParams, Request, Response, console, fixture: {
    auth: async () => session,
    prisma: { customer: { findUnique: async ({ where }: { where: unknown }) => { customerWhere = where; if (fail) throw new Error("private database details"); return active ? { id: "customer-A" } : null; } } },
    orders: async (_: unknown, customerId: string, query: unknown) => { calls.push({ customerId, query }); return { orders: [] }; },
  } });
  return { get: (query = "") => loaded.exports.GET(new Request(`https://example.com/api/minha-conta/pedidos${query}`)), calls, where: () => customerWhere };
}

test("customer history rejects anonymous, staff-only and inactive accounts", async () => {
  for (const session of [null, { user: { id: "staff", role: "ADMIN" } }]) {
    const fixture = await harness(session);
    assert.equal((await fixture.get()).status, 401);
    assert.equal(fixture.calls.length, 0);
  }
  const inactive = await harness({ user: { id: "customer-A", role: "CUSTOMER" } }, false);
  assert.equal((await inactive.get()).status, 401);
  assert.equal(inactive.calls.length, 0);
});

test("history ignores arbitrary customer IDs and returns no-store private responses", async () => {
  const fixture = await harness({ user: { id: "admin", role: "ADMIN", customerId: "customer-A" } });
  const response = await fixture.get("?customerId=customer-B&page=2&filter=completed");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(fixture.calls[0].customerId, "customer-A");
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.where())), { id: "customer-A", status: "ACTIVE" });
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.calls[0].query)), { page: 2, filter: "completed" });
  assert.equal((await fixture.get("?page=0")).status, 400);
  assert.equal(fixture.calls.length, 1);
});

test("history error is recoverable and does not expose database details", async () => {
  const fixture = await harness({ user: { id: "customer-A", role: "CUSTOMER" } }, true, true);
  const response = await fixture.get();
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("private database details"));
});
