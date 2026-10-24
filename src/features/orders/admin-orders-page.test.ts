import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/admin/pedidos/page.tsx"], bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", packages: "external", plugins: [{ name: "operational-orders-page", setup(builder) {
  builder.onResolve({ filter: /components\/admin\/(admin-shell|orders-panel)$|features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=globalThis.fixture.database;"
    : args.path.endsWith("permissions") ? 'export const adminRoutePermissions={"/admin/pedidos":["ADMIN","MANAGER","STAFF"]};export const requireAdminPageRoute=globalThis.fixture.guard;'
    : args.path.endsWith("admin-shell") ? "export function AdminShell(){return null;}" : "export function OrdersPanel(){return null;}" }));
} }] });

async function fixture(role: string | null) {
  const calls: { operation: string; args?: unknown }[] = [];
  const loaded = { exports: {} as { default: () => Promise<unknown> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: {
    guard: async (route: string) => {
      calls.push({ operation: "guard", args: route });
      if (!role || !["ADMIN", "MANAGER", "STAFF"].includes(role)) throw new Error("forbidden");
      return { role };
    },
    database: () => {
      calls.push({ operation: "database" });
      return {
        order: { findMany: async (args: unknown) => { calls.push({ operation: "orders", args }); return []; } },
        miaubyConfig: { findUnique: async () => { calls.push({ operation: "miauby" }); return null; } },
      };
    },
  } });
  return { render: loaded.exports.default, calls };
}

test("a fila exclui apenas pagamentos de teste no banco antes do limite de 100 pedidos", async () => {
  for (const role of ["ADMIN", "MANAGER", "STAFF"]) {
    const f = await fixture(role);
    await f.render();
    const query = JSON.parse(JSON.stringify(f.calls.find(call => call.operation === "orders")!.args));
    assert.deepEqual(query.where, { OR: [
      { onlinePayment: { is: null } },
      { onlinePayment: { is: { environment: { not: "test" } } } },
    ] });
    assert.equal(query.take, 100);
    assert.deepEqual(query.orderBy, { createdAt: "desc" });
    assert.equal(Boolean(query.include.prescriptionUpload), role === "ADMIN");
    assert.equal(f.calls.some(call => call.operation === "miauby"), role === "ADMIN");
    assert.equal(f.calls[0].operation, "guard");
  }
});

test("visitante e cliente não consultam pedidos antes da autorização", async () => {
  for (const role of [null, "CUSTOMER"]) {
    const f = await fixture(role);
    await assert.rejects(f.render(), /forbidden/);
    assert.deepEqual(f.calls, [{ operation: "guard", args: "/admin/pedidos" }]);
  }
});
