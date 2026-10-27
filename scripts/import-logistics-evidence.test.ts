import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

test("import dry-run is read-only; apply uses exact GTIN, CAS and audited evidence-only writes; repeat is idempotent", async () => {
  const bundle = await build({ entryPoints: ["scripts/import-logistics-evidence.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "logistics-import-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : "" }));
  } }] });
  const loaded = { exports: {} as { importLogisticsEvidence: (db: unknown, values: unknown, actorId: string, apply: boolean) => Promise<unknown> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, console, Buffer, process: { argv: ["node", "test.ts"], env: {} } });
  const evidence = { version: 1, gtin: "07890000000000", observations: [], review: { confirmed: false, note: "" } };
  let current: unknown = null, writes = 0, audits = 0, cas = 1;
  const tx = { user: { findFirst: async () => ({ id: "admin" }) }, product: {
    findMany: async () => [{ id: "fixture", ean: "7890000000000", eanNormalized: evidence.gtin, logisticsEvidence: current, updatedAt: new Date(0) }],
    updateMany: async ({ data }: { data: Record<string, unknown> }) => { assert.deepEqual(Object.keys(data), ["logisticsEvidence"]); writes++; current = data.logisticsEvidence; return { count: cas }; },
  }, auditLog: { create: async () => { audits++; } } };
  const db = { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) };
  await loaded.exports.importLogisticsEvidence(db, [evidence], "admin", false);
  assert.equal(writes, 0); assert.equal(audits, 0);
  await loaded.exports.importLogisticsEvidence(db, [evidence], "admin", true);
  assert.equal(writes, 1); assert.equal(audits, 1);
  current = Object.fromEntries(Object.entries(current as object).reverse());
  await loaded.exports.importLogisticsEvidence(db, [evidence], "admin", true);
  assert.equal(writes, 1); assert.equal(audits, 1);
  current = null; cas = 0;
  await assert.rejects(loaded.exports.importLogisticsEvidence(db, [evidence], "admin", true), /mudou/);
  await assert.rejects(loaded.exports.importLogisticsEvidence(db, [evidence, evidence], "admin", false), /repetido/);
});
