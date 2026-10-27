import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

test("weight batches require ADMIN, exact reviewed plan and CAS; preserve profiles and commercial fields", async () => {
  const bundle = await build({ entryPoints: ["scripts/apply-product-weight-drafts.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "weight-import-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : "" }));
  } }] });
  type Result = { planSha256: string; products: Array<{ action: string }> };
  const loaded = { exports: {} as { applyProductWeightDrafts: (...args: unknown[]) => Promise<Result> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, console, Buffer, process: { argv: ["node", "test.ts"], env: {} } });
  const run = loaded.exports.applyProductWeightDrafts;
  let shippingProfile: unknown = null, active = true, cas = 1, writes = 0, audits = 0;
  const tx = { $queryRaw: async () => [], user: { findFirst: async () => active ? { id: "admin" } : null }, product: {
    findMany: async () => [{ id: "synthetic", ean: "7890000000000", eanNormalized: "07890000000000", name: "Medicamento sintético 50mg 30 comprimidos", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, logisticsEvidence: null, shippingProfile, updatedAt: new Date(0) }],
    updateMany: async ({ data, where }: { data: Record<string, unknown>; where: { id: string; updatedAt: Date } }) => {
      assert.deepEqual(Object.keys(data), ["shippingProfile"]);
      assert.equal(where.id, "synthetic"); assert.equal(where.updatedAt.toISOString(), new Date(0).toISOString());
      writes++; shippingProfile = data.shippingProfile; return { count: cas };
    },
  }, auditLog: { create: async ({ data }: { data: { action: string; metadata: { draft: { enabled: boolean; transportReviewed: boolean } } } }) => {
    assert.equal(data.action, "PRODUCT_WEIGHT_DRAFT_ESTIMATED"); assert.equal(data.metadata.draft.enabled, false); assert.equal(data.metadata.draft.transportReviewed, false); audits++;
  } } };
  const db = { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) };
  const input = ["07890000000000"];
  const dry = await run(db, input, "admin", false);
  assert.equal(writes, 0); assert.equal(audits, 0);
  await assert.rejects(run(db, input, "admin", true), /SHA-256/);
  await assert.rejects(run(db, input, "admin", true, "0".repeat(64)), /Plano mudou/);
  assert.equal(writes, 0);
  active = false; await assert.rejects(run(db, input, "admin", true, dry.planSha256), /ADMIN/); active = true;
  await run(db, input, "admin", true, dry.planSha256);
  assert.equal(writes, 1); assert.equal(audits, 1);
  assert.equal((await run(db, input, "admin", false)).products[0].action, "PRESERVE_EXISTING_PROFILE");
  assert.equal(writes, 1); assert.equal(audits, 1);
  await assert.rejects(run(db, [input[0], input[0]], "admin", false), /repetido/);
  shippingProfile = null; cas = 0;
  await assert.rejects(run(db, input, "admin", true, dry.planSha256), /revertido/);
  assert.equal(audits, 1);
});
