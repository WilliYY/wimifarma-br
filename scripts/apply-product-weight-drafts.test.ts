import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

async function loadImporter() {
  const bundle = await build({ entryPoints: ["scripts/apply-product-weight-drafts.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "weight-refine-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : "" }));
  } }] });
  type Result = { planSha256: string; products: Array<{ action: string; previousProfile?: unknown; estimate?: { draft: Record<string, unknown> } }> };
  const loaded = { exports: {} as { applyProductWeightDrafts: (...args: unknown[]) => Promise<Result> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, console, Buffer, process: { argv: ["node", "test.ts"], env: {} } });
  return loaded.exports.applyProductWeightDrafts;
}

test("explicit refinement uses current exact gross references and changes only weight", async () => {
  const run = await loadImporter();
  const gtin = "07890000000000";
  const original = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 500, lengthCm: 20.8, widthCm: 20.8, heightCm: 21.6, reference: null, retainedNote: "preserve literally" };
  let profile: unknown = original, cas = 1;
  const evidence = { version: 1, gtin, observations: [{ id: "gross-current", source: { url: "https://example.com/synthetic", capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin, excerpt: "Peso bruto declarado sintético" }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 70, weightBasis: "gross_explicit", sidesMm: null, dimensionsBasis: "unlabeled", notes: "", sideOrder: ["a", "b", "c"] }], sourceDecisions: [] as Array<{ observationId: string; state: string; reason: string }>, review: { confirmed: false, note: "" } };
  let logisticsEvidence: unknown = evidence;
  const writes: unknown[] = [], audits: Array<{ action: string; metadata: Record<string, unknown> }> = [];
  const tx = { $queryRaw: async () => [], user: { findFirst: async () => ({ id: "admin" }) }, product: {
    findMany: async () => [{ id: "synthetic", ean: "7890000000000", eanNormalized: gtin, name: "Medicamento sintético 50mg 30 comprimidos", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, logisticsEvidence, shippingProfile: profile, updatedAt: new Date(0) }],
    updateMany: async ({ data, where }: { data: { shippingProfile: unknown }; where: { updatedAt: Date } }) => {
      assert.deepEqual(Object.keys(data), ["shippingProfile"]);
      assert.equal(where.updatedAt.toISOString(), new Date(0).toISOString());
      writes.push(data.shippingProfile); if (cas === 1) profile = data.shippingProfile; return { count: cas };
    },
  }, auditLog: { create: async ({ data }: { data: { action: string; metadata: Record<string, unknown> } }) => { audits.push(data); } } };
  const db = { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) };
  const dry = () => run(db, [gtin], "admin", false, undefined, { refineReferences: true });
  const apply = (hash: string) => run(db, [gtin], "admin", true, hash, { refineReferences: true });
  assert.equal((await run(db, [gtin], "admin", false)).products[0].action, "PRESERVE_EXISTING_PROFILE");
  const plan = await dry();
  assert.equal(plan.products[0].action, "REFINE_EXACT_GROSS_WEIGHT_ONLY");
  assert.notEqual(plan.planSha256, (await run(db, [gtin], "admin", false)).planSha256);
  assert.equal(JSON.stringify(plan.products[0].previousProfile), JSON.stringify(original));
  assert.equal(JSON.stringify(plan.products[0].estimate?.draft), JSON.stringify({ ...original, weightGrams: 170 }));
  await assert.rejects(run(db, [gtin], "admin", true, undefined, { refineReferences: true }), /SHA-256/);
  profile = { ...original, lengthCm: 21 };
  await assert.rejects(apply(plan.planSha256), /Plano mudou/);
  profile = original;
  logisticsEvidence = { ...evidence, observations: [{ ...evidence.observations[0], weightGrams: 80 }] };
  await assert.rejects(apply(plan.planSha256), /Plano mudou/);
  logisticsEvidence = evidence;
  assert.equal(writes.length, 0);
  cas = 0; await assert.rejects(apply(plan.planSha256), /revertido/); assert.equal(audits.length, 0);
  cas = 1; await apply(plan.planSha256);
  assert.equal(JSON.stringify(profile), JSON.stringify({ ...original, weightGrams: 170 }));
  assert.equal(audits.length, 1); assert.equal(audits[0].action, "PRODUCT_WEIGHT_DRAFT_REFINED");
  assert.equal(JSON.stringify(audits[0].metadata.previousProfile), JSON.stringify(original));
  assert.equal(JSON.stringify(audits[0].metadata.sourceObservationIds), JSON.stringify(["gross-current"]));
  assert.ok(audits[0].metadata.policyVersion);
  const noop = await dry(); assert.equal(noop.products[0].action, "PRESERVE_EXISTING_PROFILE");
  await apply(noop.planSha256); assert.equal(audits.length, 1); assert.equal(writes.length, 2);
  for (const patch of [{ measurementBasis: "measured" }, { transportReviewed: true }, { enabled: true }, { approvedServiceIds: [1] }, { reference: {} }, { weightGrams: "500" }, { reference: undefined }]) {
    profile = { ...original, ...patch }; assert.equal((await dry()).products[0].action, "PRESERVE_EXISTING_PROFILE", JSON.stringify(patch));
  }
  profile = null; assert.equal((await dry()).products[0].action, "PRESERVE_EXISTING_PROFILE");
  profile = original;
  for (const value of [null, { ...evidence, sourceDecisions: [{ observationId: "gross-current", state: "superseded", reason: "Fonte substituída" }] }, { ...evidence, observations: [{ ...evidence.observations[0], weightBasis: "net" }] }, { ...evidence, gtin: "00000000000000" }]) {
    logisticsEvidence = value; assert.equal((await dry()).products[0].action, "PRESERVE_EXISTING_PROFILE");
  }
  profile = { ...original, approvedServiceIds: [] };
  logisticsEvidence = evidence;
  assert.equal((await dry()).products[0].action, "REFINE_EXACT_GROSS_WEIGHT_ONLY");
});

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
