import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { NextResponse } from "next/server";

const bundle = build({ entryPoints: ["src/app/api/admin/visitas/online/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "online-access", setup(builder) {
  builder.onResolve({ filter: /lib\/prisma$|features\/auth\/permissions$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
    ? "export const getPrisma=globalThis.fixture.database;"
    : 'export const adminRoutePermissions={"/admin/dashboard":["ADMIN","MANAGER","STAFF"]};export const requireApiRole=globalThis.fixture.guard;' }));
} }] });

async function fixture(role: string | null, failure = false) {
  const calls: string[] = [];
  const loaded = { exports: {} as { GET: () => Promise<NextResponse> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Date, fixture: {
    guard: async (roles: string[]) => {
      calls.push("guard");
      return roles.includes(role ?? "") ? { session: { role } } : { response: NextResponse.json({ error: "Não autorizado." }, { status: role ? 403 : 401 }) };
    },
    database: () => {
      calls.push("database");
      return { siteVisit: { count: async () => { if (failure) throw new Error("database secret"); return 3; } } };
    },
  } });
  return { get: loaded.exports.GET, calls };
}

test("only dashboard roles see the aggregate count, after authorization, without visitor identifiers", async () => {
  for (const role of ["ADMIN", "MANAGER", "STAFF"]) {
    const f = await fixture(role);
    const response = await f.get();
    assert.equal(response.status, 200);
    assert.deepEqual(f.calls, ["guard", "database"]);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json();
    assert.deepEqual(Object.keys(body.data).sort(), ["measuredAt", "online", "windowSeconds"]);
    assert.equal(body.data.online, 3);
    assert.equal(body.data.windowSeconds, 120);
  }
});

test("anonymous/customer access and database failures never return a fake zero", async () => {
  for (const role of [null, "CUSTOMER"]) {
    const f = await fixture(role);
    const response = await f.get();
    assert.equal(response.status, role ? 403 : 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(f.calls, ["guard"]);
  }
  const f = await fixture("ADMIN", true);
  const response = await f.get();
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes("secret"), false);
});
