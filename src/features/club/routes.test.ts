import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { emptyClubSummary } from "./contracts";

async function harness(session: unknown, fail = false, admin = false) {
  let joins = 0;
  let query: unknown;
  const summary = emptyClubSummary();
  const fixture = {
    auth: async () => session,
    access: async () => ({ session, response: (session as { user?: { role?: string } } | null)?.user?.role === "ADMIN" ? null : {} }),
    resolve: async (_: unknown, identity: { user?: { id?: string } } | null) => { if (!identity?.user?.id) { const error = new Error("Entre na sua conta.") as Error & { status: number }; error.status = 401; throw error; } return null; },
    summary: async () => summary,
    join: async () => { joins++; return { ...summary, member: true }; },
    prisma: { $transaction: async (callback: (tx: unknown) => unknown) => { if (fail) throw new Error("private database details"); return callback(fixture.prisma); },
      user: { findUnique: async () => ({ role: "ADMIN", isActive: true }) },
      clubMembership: { count: async () => 1, findMany: async (input: unknown) => { query = input; return [{ id: "membership", customerId: "customer", joinedAt: new Date(0), active: true, customer: { name: "Synthetic", email: null, phone: null, wimicoinAccount: { balancePoints: 500 } } }]; } },
      wimicoinAccount: { aggregate: async () => ({ _sum: { balancePoints: 500 } }) }, order: { aggregate: async () => ({ _sum: { wimicoinsEarnedPoints: 100 } }) } },
  };
  const result = await build({ entryPoints: [admin ? "src/app/api/admin/club/route.ts" : "src/app/api/minha-conta/club/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-club", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|features\/auth\/permissions$|lib\/prisma$|club\/service$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=globalThis.fixture.access;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : "export const getClubSummary=globalThis.fixture.summary; export const joinClub=globalThis.fixture.join; export const resolveClubCustomer=async(tx,s)=>{if(!s?.user?.id){const {ClubRuleError}=require('./wallet');throw new ClubRuleError('Entre na sua conta.',401)}return globalThis.fixture.resolve(tx,s)};", resolveDir: `${process.cwd()}/src/features/club` }));
  } }] });
  const loaded = { exports: {} as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> } };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, TextDecoder, Uint8Array, setTimeout, clearTimeout, fixture });
  return { get: (params = "") => loaded.exports.GET(new Request(`https://example.com/api/admin/club${params}`)),
    post: (input: unknown, origin = "https://example.com") => loaded.exports.POST(new Request("https://example.com/api/minha-conta/club", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(input) })), joins: () => joins, query: () => query };
}

test("Club API rejects anonymous joining, forged body and cross-origin mutations", async () => {
  const anonymous = await harness(null); assert.equal((await anonymous.post({ join: true })).status, 401);
  const h = await harness({ user: { id: "admin", role: "ADMIN" } });
  for (const body of [{}, { join: false }, { join: true, customerId: "other" }, { join: true, balancePoints: 500 }]) assert.equal((await h.post(body)).status, 422);
  assert.equal((await h.post({ join: true }, "https://attacker.example")).status, 403);
  assert.equal(h.joins(), 0);
  const response = await h.post({ join: true }); assert.equal(response.status, 200); assert.equal(h.joins(), 1);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("unlinked staff GET is empty and database failures remain private", async () => {
  const h = await harness({ user: { id: "admin", role: "ADMIN" } });
  const response = await h.get(); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { data: emptyClubSummary() });
  const failed = await harness({ user: { id: "admin", role: "ADMIN" } }, true);
  const error = await failed.get(); assert.equal(error.status, 503); assert.ok(!(await error.text()).includes("private database details"));
});

test("admin API limits access, validates pagination and returns minimal private fields", async () => {
  const rejected = await harness({ user: { id: "staff", role: "STAFF" } }, false, true);
  assert.equal((await rejected.get()).status, 401);
  const h = await harness({ user: { id: "admin", role: "ADMIN" } }, false, true);
  assert.equal((await h.get("?page=0")).status, 400);
  const response = await h.get("?page=2"); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.page, 2); assert.equal(result.summary.availablePoints, 500); assert.equal(result.data[0].balancePoints, 500);
  const query = JSON.parse(JSON.stringify(h.query())); assert.equal(query.skip, 24); assert.equal(query.take, 24);
  assert.deepEqual(Object.keys(query.select.customer.select).sort(), ["email", "name", "phone", "wimicoinAccount"]);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
