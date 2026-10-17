import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";

test("edição sem campo de origem não permite remover ou invalidar EAN de distribuidor", async () => {
  const bundle = await build({ entryPoints: ["src/app/api/produtos/[id]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "supplier-product-mutation", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>({user:{id:'synthetic-manager',role:'MANAGER'}});" : "export const getPrisma=()=>fixture.db;" }));
  } }] });
  let writes = 0;
  const tx = { $queryRaw: async () => [], product: {
    findUnique: async () => ({ id: "synthetic-product", inventorySource: "DISTRIBUTOR", ean: "1234567890128" }),
    updateMany: async () => { writes++; throw new Error("Unexpected product write"); },
  } };
  const loaded = { exports: {} as { PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, TextDecoder, Uint8Array, setTimeout, clearTimeout,
    fixture: { db: { $transaction: async (run: (db: typeof tx) => unknown) => run(tx) } } });
  for (const ean of [null, "", "invalid", "1234567890129"]) {
    const response = await loaded.exports.PATCH(new Request("https://example.invalid/api/produtos/synthetic-product", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Synthetic product", price: 16, stock: 0, status: "ACTIVE", ean, expectedUpdatedAt: "2026-10-17T12:00:00.000Z" }) }), { params: Promise.resolve({ id: "synthetic-product" }) });
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /EAN válido/);
  }
  assert.equal(writes, 0);
});
