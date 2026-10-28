import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

type Profile = Record<string, unknown> | null;
const gtins = ["07890000000000", "07890000000017"];
const originalDraft = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 500, lengthCm: null, widthCm: null, heightCm: null, reference: null, cargoKinds: ["general"], approvedServiceIds: [], retainedNote: "preserve literally" };
type Plan = { applied: boolean; planSha256: string; products: Array<{ action: string; previousProfile: Profile; estimate: { draft: Record<string, unknown> } | null }> };

async function fixture() {
  const bundle = await build({ entryPoints: ["scripts/apply-product-average-drafts.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "average-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$|shipping\/(?:average|family)-estimate$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : args.path.endsWith("average-estimate") ? "export const estimateAverageShipping=(product,catalog)=>globalThis.averageFixture(product,catalog);" : args.path.endsWith("family-estimate") ? "export const familyGroupsSchema={parse:value=>value}; export const estimateFamilyShipping=(product,catalog,groups)=>globalThis.familyFixture(product,catalog,groups);" : "" }));
  } }] });
  let active = true, casAt = 0, auditFailureAt = 0, writes = 0, auditAttempts = 0, locked = false, averageAvailable = true;
  const products = gtins.map((gtin, index) => ({ id: `synthetic-${index}`, name: "Medicamento sintético 50mg 30 comprimidos", ean: gtin.slice(1), eanNormalized: gtin, category: "Medicamentos", activeIngredients: ["Sintético"], requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, shippingProfile: null as Profile, logisticsEvidence: { marker: "source-v1" }, updatedAt: new Date(0) }));
  const audits: Array<{ action: string; metadata: Record<string, unknown> }> = [];
  const weightAudits: Array<{ id: string; entityId: string; metadata: Record<string, unknown> }> = [];
  const tx = { $queryRaw: async () => { locked = true; return []; }, user: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
    assert.equal(locked, true); assert.equal(where.role, "ADMIN"); assert.equal(where.isActive, true); return active ? { id: "admin" } : null;
  } }, product: {
    findMany: async ({ where, orderBy, select }: { where: Record<string, unknown>; orderBy: unknown; select: Record<string, unknown> }) => {
      assert.equal(select.brand, true);
      assert.equal(where.status, "ACTIVE"); assert.equal(where.deletedAt, null); assert.equal(where.OR, undefined); assert.ok(orderBy); return products;
    },
    updateMany: async ({ data, where }: { data: { shippingProfile: Profile }; where: { id: string; updatedAt: Date; status: string; deletedAt: unknown } }) => {
      writes++; assert.deepEqual(Object.keys(data), ["shippingProfile"]); assert.equal(where.status, "ACTIVE"); assert.equal(where.deletedAt, null); assert.equal(where.updatedAt.toISOString(), new Date(0).toISOString());
      if (writes === casAt) return { count: 0 };
      products.find(product => product.id === where.id)!.shippingProfile = structuredClone(data.shippingProfile); return { count: 1 };
    },
  }, auditLog: { findMany: async ({ where }: { where: { action: string; entity: string; entityId: { in: string[] } } }) => {
    assert.equal(where.action, "PRODUCT_WEIGHT_DRAFT_ESTIMATED"); assert.equal(where.entity, "Product");
    assert.ok(where.entityId.in.every(id => products.find(product => product.id === id)?.shippingProfile));
    return weightAudits.filter(audit => where.entityId.in.includes(audit.entityId));
  }, create: async ({ data }: { data: { action: string; metadata: Record<string, unknown> } }) => {
    auditAttempts++; if (auditAttempts === auditFailureAt) throw new Error("synthetic audit failure"); audits.push(data);
  } } };
  const db = { $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => {
    const before = products.map(product => structuredClone(product.shippingProfile)), count = audits.length;
    try { return await callback(tx); } catch (error) { products.forEach((product, index) => { product.shippingProfile = before[index]; }); audits.length = count; throw error; }
  } };
  const loaded = { exports: {} as { applyProductAverageDrafts: (...args: unknown[]) => Promise<Plan> } };
  const estimate = {
    policyVersion: "synthetic-average-v1", basis: "ORAL_SOLID_COHORT", sourceGtins: [gtins[1]], explanation: "Hipótese sintética de teste.",
    draft: { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 180, lengthCm: 12, widthCm: 8, heightCm: 5, reference: null },
  };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, console, Buffer, process: { argv: ["node", "test.ts"], env: {} }, averageFixture: (product: { gtin: string }, catalog: unknown[]) => averageAvailable ? ({
    policyVersion: "synthetic-average-v1", basis: "ORAL_SOLID_COHORT", sourceGtins: [gtins[1]], sourceObservationIds: [JSON.stringify(catalog)], explanation: "Hipótese sintética de teste.",
    draft: { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 180, lengthCm: 12, widthCm: 8, heightCm: 5, reference: null },
  }) : null, familyFixture: (_product: unknown, _catalog: unknown[], groups: unknown[]) => groups.length ? ({ ...estimate, basis: "REVIEWED_FAMILY", familyGroupId: "synthetic-family" }) : null });
  const run = (apply = false, hash?: string, input = gtins, families: unknown = []) => loaded.exports.applyProductAverageDrafts(db, input, "admin", apply, hash, families);
  const cli = async (args: string[], size = 2, contents = JSON.stringify(gtins)) => {
    const errors: string[] = [], cliProcess = { argv: ["node", "scripts/apply-product-average-drafts.ts", ...args], env: {}, exitCode: 0 };
    const require = createRequire(import.meta.url), cliModule = { exports: {} };
    vm.runInNewContext(bundle.outputFiles[0].text, { module: cliModule, exports: cliModule.exports, URL, Buffer, Error, process: cliProcess,
      require: (name: string) => name === "node:fs/promises" ? { stat: async () => ({ size }), readFile: async () => contents } : require(name),
      console: { error: (message: string) => errors.push(message), log: () => {} },
    });
    await new Promise(resolve => setImmediate(resolve)); return { errors, exitCode: cliProcess.exitCode };
  };
  return { run, cli, products, audits, weightAudits, stats: () => ({ writes, auditAttempts }), average: (value: boolean) => { averageAvailable = value; }, admin: (value: boolean) => { active = value; }, cas: (value: number) => { casAt = value; }, failAudit: (value: number) => { auditFailureAt = value; } };
}

test("reviewed families preserve existing weights even with policy provenance and bind the entire manifest", async () => {
  const f = await fixture(); f.average(false);
  f.products[0].shippingProfile = structuredClone(originalDraft);
  f.weightAudits.push({ id: "weight-source", entityId: f.products[0].id, metadata: { policyVersion: "weight-only-v4", draft: structuredClone(originalDraft) } });
  const groups = [{ id: "synthetic-family", rationale: "Reviewed synthetic grouping" }];
  const dry = await f.run(false, undefined, gtins, groups);
  assert.equal(dry.products[0].action, "FILL_ESTIMATED_DIMENSIONS_ONLY");
  assert.equal(dry.products[0].estimate?.draft.weightGrams, 500);
  assert.equal(dry.products[1].estimate?.draft.weightGrams, 180);
  await assert.rejects(f.run(true, dry.planSha256, gtins, [{ ...groups[0], rationale: "Changed grouping" }]), /Plano mudou/);
  await f.run(true, dry.planSha256, gtins, groups);
  assert.equal(f.products[0].shippingProfile?.weightGrams, 500);
  assert.equal(f.audits[0].metadata.weightPolicy, "PRESERVE_EXISTING_WEIGHT");
  assert.ok(f.audits[0].metadata.familyGroupsSha256);
  const repeat = await f.run(false, undefined, gtins, groups);
  assert.ok(repeat.products.every(product => product.action === "PRESERVE_EXISTING_PROFILE"));
  assert.equal(f.audits.length, 2);
});

test("own references and composition averages take precedence over reviewed family fallback", async () => {
  const f = await fixture();
  const dry = await f.run(false, undefined, gtins, [{ id: "synthetic-family" }]);
  assert.equal((dry.products[0].estimate as unknown as { basis: string }).basis, "ORAL_SOLID_COHORT");
});

test("average drafts preserve existing weights and literal keys; dry-run, hash and repetition are safe", async () => {
  const f = await fixture(); f.products[0].shippingProfile = structuredClone(originalDraft);
  const dry = await f.run(); assert.equal(dry.applied, false); assert.deepEqual(f.stats(), { writes: 0, auditAttempts: 0 });
  assert.equal(dry.products[0].action, "FILL_ESTIMATED_DIMENSIONS_ONLY"); assert.equal(dry.products[0].estimate?.draft.weightGrams, 500);
  assert.equal(JSON.stringify(dry.products[0].previousProfile), JSON.stringify(originalDraft));
  assert.equal(JSON.stringify(dry.products[0].estimate?.draft), JSON.stringify({ ...originalDraft, lengthCm: 12, widthCm: 8, heightCm: 5 }));
  await assert.rejects(f.run(true), /SHA-256/); await assert.rejects(f.run(true, "0".repeat(64)), /Plano mudou/);
  f.products[1].logisticsEvidence.marker = "source-v2"; await assert.rejects(f.run(true, dry.planSha256), /Plano mudou/); f.products[1].logisticsEvidence.marker = "source-v1";
  f.products[0].shippingProfile = { ...originalDraft, retainedNote: "changed" }; await assert.rejects(f.run(true, dry.planSha256), /Plano mudou/); f.products[0].shippingProfile = structuredClone(originalDraft);
  f.admin(false); await assert.rejects(f.run(true, dry.planSha256), /ADMIN/); f.admin(true);
  await f.run(true, dry.planSha256);
  assert.equal(f.products[0].shippingProfile?.weightGrams, 500); assert.equal(f.products[1].shippingProfile?.weightGrams, 180);
  assert.equal(f.audits.length, 2); assert.ok(f.audits.every(audit => audit.action === "PRODUCT_PACKAGE_DRAFT_ESTIMATED"));
  assert.equal(JSON.stringify(f.audits[0].metadata.previousProfile), JSON.stringify(originalDraft)); assert.ok(f.audits[0].metadata.policyVersion); assert.ok(f.audits[0].metadata.sourceGtins); assert.ok(f.audits[0].metadata.sourceObservationIds);
  const noop = await f.run(); assert.ok(noop.products.every(product => product.action === "PRESERVE_EXISTING_PROFILE")); await f.run(true, noop.planSha256); assert.deepEqual(f.stats(), { writes: 2, auditAttempts: 2 });
});

test("average drafts reject protected, partial, malformed and implicit profiles without rewriting raw JSON", async () => {
  const f = await fixture();
  for (const patch of [{ enabled: true }, { transportReviewed: true }, { measurementBasis: "measured" }, { measurementBasis: undefined }, { reference: {} }, { reference: undefined }, { approvedServiceIds: [1] }, { weightGrams: "500" }, { lengthCm: 10 }, { widthCm: 10 }, { heightCm: 10 }, { lengthCm: undefined }]) {
    f.products[0].shippingProfile = { ...originalDraft, ...patch };
    assert.equal((await f.run()).products[0].action, "PRESERVE_EXISTING_PROFILE", JSON.stringify(patch));
  }
  f.products[0].shippingProfile = { ...originalDraft, weightGrams: null }; const dry = await f.run(); assert.equal(dry.products[0].estimate?.draft.weightGrams, null);
  assert.deepEqual(f.stats(), { writes: 0, auditAttempts: 0 });
});

test("average batches validate GTINs and reject absent or ambiguous matches before writes", async () => {
  const f = await fixture(); await assert.rejects(f.run(false, undefined, [gtins[0], gtins[0]]), /repetido/);
  await assert.rejects(f.run(false, undefined, ["123"])); await assert.rejects(f.run(false, undefined, ["07890000000001"]));
  f.products[1].eanNormalized = gtins[0]; await assert.rejects(f.run(), /ambígua/); f.products[1].eanNormalized = ""; await assert.rejects(f.run(), /ausente/);
  assert.deepEqual(f.stats(), { writes: 0, auditAttempts: 0 });
});

test("average batch transaction rolls back earlier product and audit when second CAS or audit fails", async () => {
  for (const failure of ["cas", "audit"] as const) {
    const f = await fixture(), dry = await f.run(); if (failure === "cas") f.cas(2); else f.failAudit(2);
    await assert.rejects(f.run(true, dry.planSha256), failure === "cas" ? /revertido/ : /synthetic audit failure/);
    assert.equal(f.stats().writes, 2); assert.equal(f.stats().auditAttempts, failure === "cas" ? 1 : 2);
    assert.equal(f.products[0].shippingProfile, null); assert.equal(f.products[1].shippingProfile, null); assert.equal(f.audits.length, 0);
  }
});

test("only intact policy-proven weight drafts may receive a new estimated weight", async () => {
  const f = await fixture(); f.products[0].shippingProfile = structuredClone(originalDraft);
  const source = { id: "weight-audit", entityId: f.products[0].id, metadata: { policyVersion: "weight-only-v2", draft: Object.fromEntries(Object.entries(originalDraft).reverse()) } };
  f.weightAudits.push(source);
  const dry = await f.run(); assert.equal(dry.products[0].estimate?.draft.weightGrams, 180);
  source.metadata.policyVersion = "weight-only-v3";
  assert.equal((await f.run()).products[0].estimate?.draft.weightGrams, 180);
  source.metadata.policyVersion = "weight-only-v4";
  assert.equal((await f.run()).products[0].estimate?.draft.weightGrams, 180);
  source.metadata.policyVersion = "weight-only-v2";
  for (const mutation of [() => { source.metadata.policyVersion = "unknown"; }, () => { source.entityId = f.products[1].id; }, () => { source.metadata.draft = { ...originalDraft, weightGrams: 499 }; }]) {
    mutation(); assert.equal((await f.run()).products[0].estimate?.draft.weightGrams, 500);
    source.entityId = f.products[0].id; source.metadata.policyVersion = "weight-only-v2"; source.metadata.draft = structuredClone(originalDraft);
  }
  source.id = "different-audit"; await assert.rejects(f.run(true, dry.planSha256), /Plano mudou/); source.id = "weight-audit";
  const current = await f.run(); await f.run(true, current.planSha256);
  assert.equal(f.products[0].shippingProfile?.weightGrams, 180); assert.equal(JSON.stringify(f.audits[0].metadata.previousProfile), JSON.stringify(originalDraft));
  assert.ok(f.audits[0].metadata.weightSourceAudit);
});

test("average CLI rejects unknown options, missing values, oversized input and invalid GTINs before connecting", async () => {
  const f = await fixture();
  for (const args of [["--unknown"], ["--input", "--apply"], ["--input", "synthetic.json", "--actor-id"], ["--input", "synthetic.json", "--actor-id", "admin", "--refine-references"]]) {
    const result = await f.cli(args); assert.equal(result.exitCode, 1); assert.match(result.errors[0], /Use --input/);
  }
  assert.match((await f.cli([])).errors[0], /Dry-run é o padrão/);
  const args = ["--input", "synthetic.json", "--actor-id", "admin"];
  assert.match((await f.cli(args, 1_000_001)).errors[0], /Arquivo excede 1 MB/);
  assert.match((await f.cli(args, 2, '["123"]')).errors[0], /GTIN/);
  assert.match((await f.cli(args)).errors[0], /No automatic connection/);
});
