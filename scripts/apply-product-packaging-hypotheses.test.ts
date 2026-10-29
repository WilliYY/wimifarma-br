import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

const gtins = ["07890000000000", "07890000000017"];
type Plan = { applied: boolean; operationMode: string; planSha256: string; cohortSha256: string; packagingHypothesesSha256: string;
  products: Array<{ productId: string; gtin: string; revision: string; previousProfile: unknown; action: string; estimate: { basis: string; draft: Record<string, unknown> } | null }> };
async function fixture() {
  const bundle = await build({ entryPoints: ["scripts/apply-product-packaging-hypotheses.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "packaging-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$|shipping\/average-estimate$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : args.path.endsWith("average-estimate") ? "export const estimateAverageShipping=(product,catalog)=>globalThis.averageFixture(product,catalog);" : "" }));
  } }] });
  const products = gtins.map((gtin, index) => ({ id: `synthetic-${index}`, name: "Produto sintético sem conteúdo", ean: gtin.slice(1), eanNormalized: gtin, category: "Outros", brand: null, activeIngredients: [], requiresPrescription: false,
    prescriptionType: "UNREVIEWED", isPopularPharmacy: false, shippingProfile: null as unknown, logisticsEvidence: null as unknown, updatedAt: new Date(0) }));
  const hypotheses = [{ id: "synthetic", label: "Hipótese de teste", container: "CARTON", members: products.map(product => ({ gtin: product.eanNormalized, expectedName: product.name })), hypothesizedRetailSidesCm: [15, 9, 4], geometryMarginCm: 3,
    outerBoxCm: [24, 15, 10], grossPackageHypothesisGrams: 500, weightMarginPercent: 20, cargoKinds: ["unspecified"], rationale: "Hipótese de preparação.", weightHypothesis: "Bruto completo hipotético.", packingHypothesis: "Conferência física pendente." }];
  let active = true, locked = false, writes = 0, casAt = 0, auditAttempts = 0, auditAt = 0, averageAvailable = false, estimatorCalls = 0;
  const audits: Array<{ userId: string; action: string; entity: string; entityId: string; metadata: Record<string, unknown> }> = [];
  const tx = { $queryRaw: async () => { locked = true; return []; }, user: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
    assert.equal(locked, true); assert.equal(where.id, "admin"); assert.equal(where.role, "ADMIN"); assert.equal(where.isActive, true); return active ? { id: "admin" } : null;
  } }, product: {
    findMany: async ({ where, orderBy, select }: { where: Record<string, unknown>; orderBy: unknown; select: Record<string, unknown> }) => {
      assert.equal(where.status, "ACTIVE"); assert.equal(where.deletedAt, null); assert.equal(where.OR, undefined); assert.ok(orderBy); assert.equal(select.brand, true); return products;
    },
    updateMany: async ({ data, where }: { data: { shippingProfile: unknown }; where: { id: string; updatedAt: Date; status: string; deletedAt: unknown } }) => {
      writes++; assert.deepEqual(Object.keys(data), ["shippingProfile"]); assert.equal(where.status, "ACTIVE"); assert.equal(where.deletedAt, null); assert.equal(where.updatedAt.toISOString(), new Date(0).toISOString());
      if (writes === casAt) return { count: 0 };
      const product = products.find(row => row.id === where.id)!; assert.equal(product.shippingProfile, null); product.shippingProfile = structuredClone(data.shippingProfile); return { count: 1 };
    },
  }, auditLog: { create: async ({ data }: { data: typeof audits[number] }) => { auditAttempts++; if (auditAttempts === auditAt) throw new Error("synthetic audit failure"); audits.push(data); } } };
  const db = { $transaction: async (callback: (value: typeof tx) => Promise<unknown>, options: { timeout: number }) => {
    assert.equal(options.timeout, 180000);
    const before = structuredClone(products), auditCount = audits.length;
    try { return await callback(tx); } catch (error) { products.splice(0, products.length, ...before); audits.length = auditCount; throw error; }
  } };
  const loaded = { exports: {} as { applyProductPackagingHypotheses: (...args: unknown[]) => Promise<Plan> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Buffer, console, process: { argv: ["node", "test.ts"], env: {} },
    averageFixture: () => { estimatorCalls++; return averageAvailable ? { policyVersion: "comparable-package-v1", basis: "EXACT_RETAIL_DIMENSIONS", sourceGtins: [gtins[0]], explanation: "Fonte própria sintética.",
      draft: { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 180, lengthCm: 12, widthCm: 8, heightCm: 5, reference: null } } : null; } });
  const run = (apply = false, hash?: string, values: unknown = gtins, manifests: unknown = hypotheses) => loaded.exports.applyProductPackagingHypotheses(db, values, "admin", apply, hash, manifests);
  const cli = async (args: string[], inputSize = 2, manifestSize = 2, inputContents = JSON.stringify(gtins), manifestContents = JSON.stringify(hypotheses)) => {
    const errors: string[] = [], cliProcess = { argv: ["node", "scripts/apply-product-packaging-hypotheses.ts", ...args], env: {}, exitCode: 0 };
    const require = createRequire(import.meta.url), cliModule = { exports: {} };
    vm.runInNewContext(bundle.outputFiles[0].text, { module: cliModule, exports: cliModule.exports, URL, Buffer, Error, process: cliProcess,
      require: (name: string) => name === "node:fs/promises" ? { stat: async (file: string) => ({ size: file === "input.json" ? inputSize : manifestSize }), readFile: async (file: string) => file === "input.json" ? inputContents : manifestContents } : require(name),
      console: { error: (message: string) => errors.push(message), log: () => {} },
    });
    await new Promise(resolve => setImmediate(resolve)); return { errors, exitCode: cliProcess.exitCode };
  };
  return { run, cli, products, hypotheses, audits, stats: () => ({ writes, auditAttempts, estimatorCalls }), admin: (value: boolean) => { active = value; }, average: (value: boolean) => { averageAvailable = value; }, cas: (value: number) => { casAt = value; }, failAudit: (value: number) => { auditAt = value; } };
}

test("NULL_ONLY preserva literalmente qualquer perfil não nulo antes dos estimadores", async () => {
  const f = await fixture();
  for (const profile of [{ enabled: true }, { enabled: false, weightGrams: 500, lengthCm: null }, {}, "manual", [], false, 0]) {
    f.products.forEach(product => { product.shippingProfile = structuredClone(profile); });
    const before = structuredClone(f.products), calls = f.stats().estimatorCalls;
    const plan = await f.run();
    assert.equal(plan.operationMode, "NULL_ONLY"); assert.ok(plan.products.every(product => product.action === "PRESERVE_EXISTING_PROFILE" && product.estimate === null));
    await f.run(true, plan.planSha256);
    assert.deepEqual(f.products, before); assert.equal(f.stats().estimatorCalls, calls); assert.equal(f.stats().writes, 0); assert.equal(f.audits.length, 0);
  }
});

test("dry-run não escreve; apply salva só perfil, audita actor/hash e repetição preserva", async () => {
  const f = await fixture(), before = structuredClone(f.products), plan = await f.run();
  assert.deepEqual(f.products, before); assert.equal(f.audits.length, 0); assert.equal(f.stats().writes, 0);
  assert.equal(plan.products[0].action, "SAVE_ESTIMATED_PACKAGE"); assert.equal(plan.products[0].estimate?.basis, "OWNER_PACKAGING_HYPOTHESIS");
  const applied = await f.run(true, plan.planSha256);
  assert.equal(applied.applied, true); assert.equal(f.stats().writes, 2); assert.equal(f.audits.length, 2);
  f.products.forEach((product, index) => { const { shippingProfile, ...remaining } = product, { shippingProfile: original, ...old } = before[index]; void original; assert.deepEqual(remaining, old); assert.notEqual(shippingProfile, null); });
  for (const audit of f.audits) {
    assert.equal(audit.userId, "admin"); assert.equal(audit.action, "PRODUCT_PACKAGE_DRAFT_ESTIMATED"); assert.equal(audit.entity, "Product");
    assert.equal(audit.metadata.planSha256, plan.planSha256); assert.equal(audit.metadata.cohortSha256, plan.cohortSha256); assert.equal(audit.metadata.packagingHypothesesSha256, plan.packagingHypothesesSha256);
    assert.equal(audit.metadata.previousProfile, null); assert.equal(audit.metadata.operationMode, "NULL_ONLY");
    assert.deepEqual(Array.from(audit.metadata.sourceGtins as string[]), []); assert.match(String(audit.metadata.authorizationBasis), /autorizad/i);
  }
  const again = await f.run(); assert.ok(again.products.every(row => row.action === "PRESERVE_EXISTING_PROFILE"));
  await f.run(true, again.planSha256); assert.equal(f.stats().writes, 2); assert.equal(f.audits.length, 2);
});

test("ADMIN ativo e SHA exato são obrigatórios antes de gravações", async () => {
  const f = await fixture(); f.admin(false); await assert.rejects(f.run(), /ADMIN ativo/); f.admin(true);
  await assert.rejects(f.run(true), /SHA-256/); await assert.rejects(f.run(true, "a".repeat(64)), /Plano mudou/);
  assert.equal(f.stats().writes, 0); assert.equal(f.audits.length, 0);
});

test("input valida GTINs únicos e aborta lote com correspondência ausente ou ambígua", async () => {
  const f = await fixture();
  for (const values of [[], [gtins[0], gtins[0]], ["00000000000000"], Array(5001).fill(gtins[0])]) await assert.rejects(f.run(false, undefined, values));
  await assert.rejects(f.run(false, undefined, ["00000000000017"]), /ausente ou ambígua/);
  f.products.push({ ...f.products[0], id: "duplicate" });
  await assert.rejects(f.run(), /ausente ou ambígua/); assert.equal(f.stats().writes, 0);
});

test("hash vincula manifesto integral, nome, margens, modo e todos os ativos mesmo sem GTIN", async () => {
  const f = await fixture(); const plan = await f.run();
  for (const patch of [{ rationale: "Justificativa nova." }, { weightMarginPercent: 30 }, { geometryMarginCm: 2 }, { grossPackageHypothesisGrams: 700 }, { members: [{ gtin: gtins[0], expectedName: "Nome alterado" }] }]) {
    await assert.rejects(f.run(true, plan.planSha256, gtins, [{ ...f.hypotheses[0], ...patch }]), /Plano mudou/);
  }
  f.products.push({ ...f.products[0], id: "outside-input-no-gtin", ean: "", eanNormalized: "" });
  const largerCohort = await f.run(); assert.notEqual(largerCohort.cohortSha256, plan.cohortSha256); await assert.rejects(f.run(true, plan.planSha256), /Plano mudou/);
  f.products[2].name = "Outro ativo sem GTIN"; const changed = await f.run(); assert.notEqual(changed.cohortSha256, largerCohort.cohortSha256);
  f.products[0].updatedAt = new Date(1000); await assert.rejects(f.run(true, changed.planSha256), /Plano mudou/); assert.equal(f.stats().writes, 0);
});

test("estimativa documental tem prioridade; sem hipótese fica pendente", async () => {
  const f = await fixture(); f.average(true);
  const documented = await f.run(); assert.equal(documented.products[0].estimate?.basis, "EXACT_RETAIL_DIMENSIONS");
  f.average(false); const pending = await f.run(false, undefined, gtins, []);
  assert.ok(pending.products.every(product => product.action === "PENDING_PHYSICAL_REVIEW" && product.estimate === null));
});

test("prioridade documental não contorna bloqueios sanitários com flags contraditórias", async () => {
  const f = await fixture(); f.average(true);
  for (const patch of [{ prescriptionType: "CONTROLLED", requiresPrescription: false }, { prescriptionType: "ANTIMICROBIAL", requiresPrescription: false }, { isPopularPharmacy: true }, { prescriptionType: "UNREVIEWED", requiresPrescription: true }]) {
    const before = structuredClone(f.products);
    Object.assign(f.products[0], patch);
    const plan = await f.run();
    assert.equal(plan.products[0].action, "PENDING_PHYSICAL_REVIEW"); assert.equal(plan.products[0].estimate, null);
    f.products.splice(0, f.products.length, ...before);
  }
});

test("falha CAS ou auditoria reverte perfis e auditorias anteriores", async () => {
  for (const failure of ["cas", "audit"] as const) {
    const f = await fixture(), before = structuredClone(f.products), plan = await f.run();
    if (failure === "cas") f.cas(2); else f.failAudit(2);
    await assert.rejects(f.run(true, plan.planSha256), failure === "cas" ? /lote revertido/ : /synthetic audit failure/);
    assert.deepEqual(f.products, before); assert.equal(f.audits.length, 0);
  }
});

test("CLI recusa opções, limites de arquivos e JSON inválido antes de conectar", async () => {
  const f = await fixture(), args = ["--input", "input.json", "--hypotheses", "hypotheses.json", "--actor-id", "admin"];
  for (const invalid of [[], ["--unknown"], ["--input"], ["--input", "input.json", "--actor-id", "admin"], [...args, "--unknown"], [...args, "--apply"]]) {
    const result = await f.cli(invalid); assert.equal(result.exitCode, 1); assert.ok(result.errors.length); assert.ok(result.errors.every(error => !error.includes("No automatic connection")));
  }
  for (const [inputSize, manifestSize] of [[1_000_001, 2], [2, 5_000_001]]) { const result = await f.cli(args, inputSize, manifestSize); assert.equal(result.exitCode, 1); assert.match(result.errors.join(" "), /excede/); }
  const invalidInput = await f.cli(args, 2, 2, JSON.stringify(["00000000000000"])); assert.equal(invalidInput.exitCode, 1);
  const invalidManifest = await f.cli(args, 2, 2, JSON.stringify(gtins), "{}"); assert.equal(invalidManifest.exitCode, 1);
});
