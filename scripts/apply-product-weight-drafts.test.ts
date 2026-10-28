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

test("fill-empty-weights only fills explicitly empty unapproved estimated profiles and preserves raw keys", async () => {
  const run = await loadImporter(), gtin = "07890000000000";
  const empty = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: null, lengthCm: null, widthCm: null, heightCm: null, reference: null, retainedNote: "literal", extraNested: { retained: [42] } };
  let profile: unknown = structuredClone(empty), active = true, cas = 1, productName = "Medicamento sintético 50mg 30 comprimidos";
  const audits: Array<{ action: string; metadata: Record<string, unknown> }> = [], writes: unknown[] = [];
  const tx = { $queryRaw: async () => [], user: { findFirst: async () => active ? { id: "admin" } : null }, product: {
    findMany: async ({ select }: { select: Record<string, unknown> }) => {
      assert.equal(select.brand, true);
      return [{ id: "empty-synthetic", ean: gtin.slice(1), eanNormalized: gtin, name: productName, brand: "Sintética", category: "Medicamentos", activeIngredients: [], requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, logisticsEvidence: null, shippingProfile: profile, updatedAt: new Date(0) }];
    },
    updateMany: async ({ data, where }: { data: { shippingProfile: unknown }; where: { updatedAt: Date } }) => {
      assert.deepEqual(Object.keys(data), ["shippingProfile"]); assert.equal(where.updatedAt.toISOString(), new Date(0).toISOString());
      writes.push(data.shippingProfile); if (cas === 1) profile = data.shippingProfile; return { count: cas };
    },
  }, auditLog: { create: async ({ data }: { data: { action: string; metadata: Record<string, unknown> } }) => { audits.push(data); } } };
  const db = { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) };
  const dry = () => run(db, [gtin], "admin", false, undefined, { fillEmptyWeights: true });
  const apply = (hash?: string) => run(db, [gtin], "admin", true, hash, { fillEmptyWeights: true });
  assert.equal((await run(db, [gtin], "admin", false)).products[0].action, "PRESERVE_EXISTING_PROFILE");
  const plan = await dry(); assert.equal(plan.products[0].action, "FILL_EMPTY_DRAFT_WEIGHT");
  assert.equal(JSON.stringify(plan.products[0].previousProfile), JSON.stringify(empty));
  assert.equal(JSON.stringify(plan.products[0].estimate?.draft), JSON.stringify({ ...empty, weightGrams: 180 }));
  assert.notEqual(plan.planSha256, (await run(db, [gtin], "admin", false)).planSha256);
  await assert.rejects(apply(), /SHA-256/);
  await assert.rejects(run(db, [gtin], "admin", false, undefined, { fillEmptyWeights: true, refineReferences: true }), /incompatíveis/);
  active = false; await assert.rejects(apply(plan.planSha256), /ADMIN/); active = true;
  profile = { ...empty, retainedNote: "changed" }; await assert.rejects(apply(plan.planSha256), /Plano mudou/); profile = structuredClone(empty);
  cas = 0; await assert.rejects(apply(plan.planSha256), /revertido/); assert.equal(audits.length, 0); cas = 1;
  await apply(plan.planSha256); assert.equal(audits.length, 1); assert.equal(audits[0].action, "PRODUCT_WEIGHT_DRAFT_ESTIMATED");
  assert.equal(JSON.stringify(audits[0].metadata.previousProfile), JSON.stringify(empty));
  assert.equal(JSON.stringify(audits[0].metadata.draft), JSON.stringify({ ...empty, weightGrams: 180 }));
  assert.equal(audits[0].metadata.policyVersion, "weight-only-v3");
  const noop = await dry(); assert.equal(noop.products[0].action, "PRESERVE_EXISTING_PROFILE"); await apply(noop.planSha256); assert.equal(audits.length, 1);
  for (const patch of [{ weightGrams: 1 }, { weightGrams: undefined }, { enabled: true }, { enabled: undefined }, { transportReviewed: true }, { measurementBasis: "measured" }, { measurementBasis: undefined }, { reference: undefined }, { reference: {} }, { approvedServiceIds: [1] }, { lengthCm: 1 }, { widthCm: 1 }, { heightCm: 1 }, { lengthCm: undefined }, { cargoKinds: ["liquid"] }, { cargoKinds: ["medication"] }, { cargoKinds: ["general", "unspecified"] }, { weightGrams: "1" }]) {
    profile = { ...empty, ...patch }; assert.equal((await dry()).products[0].action, "PRESERVE_EXISTING_PROFILE", JSON.stringify(patch));
  }
  for (const cargoKinds of [undefined, [], ["general"]]) {
    profile = { ...empty, ...(cargoKinds === undefined ? {} : { cargoKinds }) }; assert.equal((await dry()).products[0].action, "FILL_EMPTY_DRAFT_WEIGHT");
  }
  profile = null; assert.equal((await dry()).products[0].action, "PRESERVE_EXISTING_PROFILE");
  profile = structuredClone(empty); productName = "Apresentação sintética desconhecida";
  const pending = await dry(); assert.equal(pending.products[0].action, "PENDING_PHYSICAL_REVIEW"); await apply(pending.planSha256);
  assert.equal(JSON.stringify(profile), JSON.stringify(empty)); assert.equal(audits.length, 1);
  assert.equal(writes.length, 2);
});

test("fill-empty-weight batch rolls back earlier writes and audit on second CAS or audit failure", async () => {
  const run = await loadImporter(), codes = ["07890000000000", "07890000000017"];
  const empty = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: null, lengthCm: null, widthCm: null, heightCm: null, reference: null };
  for (const failure of ["cas", "audit"]) {
    let profiles: unknown[] = [structuredClone(empty), structuredClone(empty)], writes = 0, auditAttempts = 0;
    const audits: unknown[] = [];
    const tx = { $queryRaw: async () => [], user: { findFirst: async () => ({ id: "admin" }) }, product: {
      findMany: async () => codes.map((gtin, index) => ({ id: String(index), name: "Medicamento sintético 50mg 30 comprimidos", category: "Medicamentos", brand: "Sintética", ean: gtin, eanNormalized: gtin, requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, logisticsEvidence: null, shippingProfile: profiles[index], updatedAt: new Date(0) })),
      updateMany: async ({ where, data }: { where: { id: string }; data: { shippingProfile: unknown } }) => {
        writes++; if (failure === "cas" && writes === 2) return { count: 0 }; profiles[Number(where.id)] = data.shippingProfile; return { count: 1 };
      },
    }, auditLog: { create: async ({ data }: { data: unknown }) => { auditAttempts++; if (failure === "audit" && auditAttempts === 2) throw new Error("synthetic second audit failure"); audits.push(data); } } };
    const db = { $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => {
      const before = structuredClone(profiles), count = audits.length;
      try { return await callback(tx); } catch (error) { profiles = before; audits.length = count; throw error; }
    } };
    const dry = await run(db, codes, "admin", false, undefined, { fillEmptyWeights: true });
    await assert.rejects(run(db, codes, "admin", true, dry.planSha256, { fillEmptyWeights: true }), failure === "cas" ? /revertido/ : /synthetic second audit failure/);
    assert.equal(writes, 2); assert.equal(auditAttempts, failure === "cas" ? 1 : 2); assert.equal(audits.length, 0);
    assert.deepEqual(profiles, [empty, empty]);
  }
});

test("weight CLI rejects unknown and incompatible options before opening a connection", async () => {
  const bundle = await build({ entryPoints: ["scripts/apply-product-weight-drafts.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "weight-cli-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : "" }));
  } }] });
  const cli = async (args: string[]) => {
    const errors: string[] = [], process = { argv: ["node", "scripts/apply-product-weight-drafts.ts", ...args], env: {}, exitCode: 0 };
    const loadedModule = { exports: {} }, require = createRequire(import.meta.url);
    vm.runInNewContext(bundle.outputFiles[0].text, { module: loadedModule, exports: loadedModule.exports, URL, Buffer, Error, process,
      require: (name: string) => name === "node:fs/promises" ? { stat: async () => ({ size: 2 }), readFile: async () => '["07890000000000"]' } : require(name),
      console: { error: (message: string) => errors.push(message), log: () => {} } });
    await new Promise(resolve => setImmediate(resolve)); return { errors, exitCode: process.exitCode };
  };
  const args = ["--input", "synthetic.json", "--actor-id", "admin"];
  assert.match((await cli([...args, "--unknown"])).errors[0], /Use --input/);
  assert.match((await cli([...args, "--fill-empty-weights", "--refine-references"])).errors[0], /incompatíveis/);
  assert.match((await cli([...args, "--fill-empty-weights"])).errors[0], /No automatic connection/);
});
