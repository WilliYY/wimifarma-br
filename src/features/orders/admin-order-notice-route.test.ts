import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/admin/pedidos/resumo/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "order-summary-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=globalThis.fixture.database;" : 'export const adminRoutePermissions={"/admin/pedidos":["ADMIN","MANAGER","STAFF"]}; export const requireApiRole=globalThis.fixture.guard;' }));
} }] });

async function fixture(role: string | null = "ADMIN", fail = false, empty = false) {
  const calls: { operation: string; args?: unknown }[] = [];
  const loaded = { exports: {} as { GET: () => Promise<Response> } };
  const prisma = { order: {
    count: async (args: unknown) => { calls.push({ operation: "count", args }); if (fail) throw new Error("private-database-error"); return empty ? 0 : 3; },
    findMany: async (args: unknown) => { calls.push({ operation: "latest", args }); return empty ? [] : [{ id: "order-fixture", number: "SYNTH-001", createdAt: new Date("2026-10-22T12:00:00Z") }]; },
  } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: {
    guard: async (roles: string[]) => { calls.push({ operation: "guard" }); assert.deepEqual(Array.from(roles), ["ADMIN", "MANAGER", "STAFF"]); return { response: role && roles.includes(role) ? null : Response.json({ error: "Nao autorizado." }, { status: 401 }) }; },
    database: () => { calls.push({ operation: "database" }); return prisma; },
  } });
  return { get: loaded.exports.GET, calls };
}

test("summary rejects visitor and customer before accessing the database", async () => {
  for (const role of [null, "CUSTOMER"]) {
    const f = await fixture(role); const response = await f.get();
    assert.equal(response.status, 401);
    assert.deepEqual(f.calls.map(call => call.operation), ["guard"]);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});

test("summary permits order operators and returns only private counters with production/manual filters", async () => {
  for (const role of ["ADMIN", "MANAGER", "STAFF"]) {
    const f = await fixture(role); const response = await f.get();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.deepEqual(await response.json(), { data: { pending: 3, latestId: "order-fixture", latestCreatedAt: "2026-10-22T12:00:00.000Z", orders: [{ id: "order-fixture", number: "SYNTH-001", createdAt: "2026-10-22T12:00:00.000Z" }] } });
    assert.equal(f.calls[0].operation, "guard");
    const count = JSON.parse(JSON.stringify(f.calls.find(call => call.operation === "count")!.args));
    const latest = JSON.parse(JSON.stringify(f.calls.find(call => call.operation === "latest")!.args));
    assert.deepEqual(count.where, { status: "PENDING", paymentStatus: { in: ["PENDING", "PAID"] }, OR: [
      { paymentMethod: { not: "ONLINE" }, onlinePayment: { is: null } },
      { onlinePayment: { is: { environment: "production", status: { notIn: ["FAILED", "CANCELED", "REFUNDED", "DISPUTED", "PARTIALLY_REFUNDED"] } } } },
    ] });
    assert.deepEqual(latest.where, count.where);
    assert.deepEqual(latest.select, { id: true, number: true, createdAt: true });
    assert.equal(latest.take, 10);
    assert.deepEqual(latest.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  }
});

test("summary hides database failures and retains private cache policy", async () => {
  const f = await fixture("ADMIN", true); const response = await f.get();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.doesNotMatch(JSON.stringify(await response.json()), /private-database-error/);
});

test("empty summary returns explicit null latest fields", async () => {
  const f = await fixture("STAFF", false, true);
  assert.deepEqual(await (await f.get()).json(), { data: { pending: 0, latestId: null, latestCreatedAt: null, orders: [] } });
});
