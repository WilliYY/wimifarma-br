import assert from "node:assert/strict";
import test from "node:test";
import { cashbackProductUpdateSchema, medicineCashbackDefaults } from "./rules";
import { bulkProductChangesSchema } from "@/features/products/catalog-bulk";
import { productWimicoinsPoints } from "@/features/club/rules";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

test("cashback manual aceita somente 1%, mantendo WimiCoins independente", () => {
  const revision = "2026-11-02T00:00:00.000Z";
  assert.equal(cashbackProductUpdateSchema.safeParse({ cashbackEnabled: true, cashbackRateBps: 200, expectedUpdatedAt: revision }).success, false);
  assert.equal(cashbackProductUpdateSchema.parse({ cashbackEnabled: true, expectedUpdatedAt: revision }).cashbackRateBps, 100);
  assert.equal(bulkProductChangesSchema.safeParse({ cashbackEnabled: true, cashbackRateBps: 200 }).success, false);
  assert.equal(bulkProductChangesSchema.parse({ wimicoinsEnabled: true, wimicoinsRateBps: 200 }).wimicoinsRateBps, 200);
  assert.equal(productWimicoinsPoints({ wimicoinsEnabled: true, wimicoinsRateBps: 200 }, 2000), 40);
});

test("classificação não seleciona margem nem ativa cashback automaticamente", () => {
  assert.deepEqual(medicineCashbackDefaults({ catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true } }), {});
});

test("cashback PATCH converte legado 2% ao ativar sem taxa e rejeita taxa explícita 2%", async () => {
  const writes: Record<string, unknown>[] = [];
  const version = "2026-11-02T00:00:00.000Z";
  const product = { id: "synthetic", cashbackEnabled: false, cashbackRateBps: 200, updatedAt: new Date(version) };
  const tx = {
    product: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); Object.assign(product, data); return { count: 1 }; },
      findUniqueOrThrow: async () => product,
    },
    auditLog: { create: async () => ({}) },
  };
  const bundle = await build({ entryPoints: ["src/app/api/cashback/produtos/[id]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "manual-policy-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=async()=>({session:{user:{id:'synthetic-admin',role:'ADMIN'}}});" : "export const getPrisma=()=>fixture.db;" }));
  } }] });
  const loaded = { exports: {} as { PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), console, TextDecoder, Uint8Array, setTimeout, clearTimeout, fixture: { db: { $transaction: (run: (client: typeof tx) => unknown) => run(tx) } } });
  const run = (rate?: number) => loaded.exports.PATCH(new Request("https://store.example/api/cashback/produtos/synthetic", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cashbackEnabled: true, cashbackRateBps: rate, expectedUpdatedAt: version }) }), { params: Promise.resolve({ id: product.id }) });
  assert.equal((await run()).status, 200);
  assert.equal(writes[0].cashbackRateBps, 100);
  assert.equal((await run(200)).status, 422);
  assert.equal(writes.length, 1);
});
