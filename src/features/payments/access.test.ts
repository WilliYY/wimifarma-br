import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

test("payment credentials remain ADMIN-only before database access", async () => {
  const result = await build({ entryPoints: ["src/app/api/admin/pagamentos/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-payment-access", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : "export const getPrisma=()=>{throw new Error('Database must not be accessed')};" }));
  } }] });
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
    const loaded = { exports: {} as Record<string, (request: Request) => Promise<Response>> };
    vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture: { auth: async () => role ? { user: { id: "synthetic-user", role } } : null } });
    for (const method of ["GET", "PUT"]) assert.equal((await loaded.exports[method](new Request("https://example.com/api/admin/pagamentos", { method }))).status, 401);
  }
});

test("payment access rejects a different customer and reserves test orders for ADMIN", async () => {
  const result = await build({ entryPoints: ["src/features/payments/service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-payment-owner", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/headers$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=()=>globalThis.fixture.session;" : args.path.endsWith("headers") ? "export const cookies=async()=>({get:()=>undefined});" : "export const getPrisma=()=>({order:{findUnique:async()=>globalThis.fixture.order}});" }));
  } }] });
  const fixture = { session: { user: { id: "different", customerId: "different", role: "CUSTOMER" } }, order: { customerId: "owner", checkoutRequestId: null, onlinePayment: { environment: "production" } } };
  const loaded = { exports: {} as { authorizePayment: (id: string) => Promise<void> } };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture });
  await assert.rejects(loaded.exports.authorizePayment("order"), /Entre na conta/);
  fixture.session.user.customerId = "owner";
  await loaded.exports.authorizePayment("order");
  fixture.order.onlinePayment.environment = "test";
  await assert.rejects(loaded.exports.authorizePayment("order"), /administrador/);
});
