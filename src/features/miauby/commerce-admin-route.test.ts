import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

type Api = {
  GET: () => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
  adminRoutePermissions: { "/admin/miauby": readonly string[] };
  canAccessAdminRole: (role: unknown, roles: readonly string[]) => boolean;
};
const bundlePromise = build({ stdin: { contents: 'export { GET, POST } from "./src/app/api/admin/miauby/route"; export { adminRoutePermissions, canAccessAdminRole } from "./src/features/auth/permissions";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "admin-commerce-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|commerce-service$|commerce-provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
    args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" :
    args.path.endsWith("prisma") ? "export const getPrisma=()=>{globalThis.fixture.calls.push('database');throw new Error('Database must not be accessed');};" :
    args.path.endsWith("commerce-provider") ? "export const commerceConnection=()=>{globalThis.fixture.calls.push('connection');return true;};" :
    "export const miaubyDashboard=async()=>{globalThis.fixture.calls.push('dashboard');return {synthetic:true};}; export const queueCommerceTest=async()=>{globalThis.fixture.calls.push('queue');}; export const processCommerceEvents=async()=>{globalThis.fixture.calls.push('process');};",
  }));
} }] });

async function harness(role: string | null) {
  const bundle = await bundlePromise;
  const calls: string[] = [];
  const loaded = { exports: {} as Api };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, Buffer, Date, console, process: { env: { AUTH_URL: "https://example.com" } }, fixture: {
    calls, auth: async () => role === null ? null : { user: { id: "synthetic-user", role } },
  } });
  const postTest = () => loaded.exports.POST(new Request("https://example.com/api/admin/miauby", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) }));
  return { api: loaded.exports, calls, postTest };
}

test("Miauby GET and POST deny anonymous, CUSTOMER, STAFF and MANAGER before service or database access", async () => {
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
    const f = await harness(role);
    assert.equal((await f.api.GET()).status, 401, `GET role ${role}`);
    assert.equal((await f.postTest()).status, 401, `POST role ${role}`);
    assert.deepEqual(f.calls, [], `role ${role} must not query, inspect connection or queue`);
  }
});
test("ADMIN GET returns the dashboard without database or transport calls", async () => {
  const f = await harness("ADMIN"); const response = await f.api.GET();
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { data: { synthetic: true } });
  assert.deepEqual(f.calls, ["dashboard"]); assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
});
test("ADMIN POST test queues and processes once before returning dashboard", async () => {
  const f = await harness("ADMIN"); const response = await f.postTest();
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { data: { synthetic: true } });
  assert.deepEqual(f.calls, ["connection", "queue", "process", "dashboard"]); assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
});
test("real admin route matrix grants /admin/miauby only to ADMIN", async () => {
  const f = await harness(null); const roles = f.api.adminRoutePermissions["/admin/miauby"];
  assert.deepEqual(Array.from(roles), ["ADMIN"]);
  for (const role of [null, undefined, "CUSTOMER", "STAFF", "MANAGER"]) assert.equal(f.api.canAccessAdminRole(role, roles), false);
  assert.equal(f.api.canAccessAdminRole("ADMIN", roles), true); assert.deepEqual(f.calls, []);
});
