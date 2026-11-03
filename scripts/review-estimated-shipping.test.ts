import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import type * as Review from "./review-estimated-shipping";
import { estimatedReviewSha256 } from "../src/features/shipping/estimated-review";

const bundle = build({ entryPoints: ["scripts/review-estimated-shipping.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "review-fixture", setup(builder) {
  builder.onResolve({ filter: /lib\/prisma$|generated\/prisma\/client$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("client") ? 'export const Prisma={DbNull:"DB_NULL",JsonNull:"JSON_NULL"};' : args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : "" }));
} }] });

async function fixture() {
  const loaded = { exports: {} as typeof Review };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), console, Buffer, URL, Date, process: { argv: ["node", "fixture.ts"], env: {} } });
  const api = loaded.exports;
  const profile = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 300, lengthCm: 24, widthCm: 15, heightCm: 10, reference: null, cargoKinds: ["unspecified"], approvedServiceIds: [], extra: "preserved" };
  const rows = [0, 1].map(i => ({ id: `synthetic-${i}`, name: `Higiene sintética ${i}`, ean: "7890000000000", eanNormalized: "07890000000000", category: "Higiene", status: "ACTIVE", deletedAt: null, updatedAt: new Date(0), shippingProfile: structuredClone(profile) as unknown, logisticsEvidence: null, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, catalogClassification: null }));
  const settings = { enabled: true, environment: "production", originPostalCode: "87525000", preparationDays: 1, serviceIds: [1, 3], contactEmail: "synthetic@example.com" };
  let active = true, failCas = false, failAudit = false, phase = 0;
  const locks: string[] = [];
  const audits: unknown[] = [], writes: unknown[] = [];
  const tx = { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join(" ? "); locks.push(sql);
      if (sql.includes("pg_advisory_xact_lock")) { assert.equal(phase, 0); phase = 1; }
      else if (sql.includes('"User"')) { assert.equal(phase, 1); assert.match(sql, /FOR UPDATE/); assert.deepEqual(values, ["admin"]); phase = 2; }
      else if (sql.includes('"ShippingIntegration"')) { assert.equal(phase, 2); assert.match(sql, /FOR SHARE/); assert.deepEqual(values, ["melhor-envio"]); phase = 3; }
      else assert.fail(`Lock inesperado: ${sql}`);
    }, user: { findFirst: async ({ where }: { where: unknown }) => { assert.equal(phase, 2); assert.deepEqual(structuredClone(where), { id: "admin", role: "ADMIN", isActive: true }); return active ? { id: "admin" } : null; } },
    shippingIntegration: { findUnique: async () => { assert.equal(phase, 3); return { settings: structuredClone(settings), revision: 1 }; } },
    product: { findMany: async () => { assert.equal(phase, 3); return structuredClone(rows); }, updateMany: async (change: { where: { id: string; updatedAt: Date; shippingProfile?: { equals: unknown }; OR?: unknown[] }; data: { shippingProfile: unknown } }) => {
      writes.push(change); assert.deepEqual(Object.keys(change.data), ["shippingProfile"]);
      const row = rows.find(row => row.id === change.where.id)!;
      assert.equal(change.where.updatedAt.toISOString(), row.updatedAt.toISOString());
      if (row.shippingProfile === null) assert.equal(change.where.OR?.length, 2);
      else assert.deepEqual(structuredClone(change.where.shippingProfile?.equals), row.shippingProfile);
      if (failCas && writes.length === 2) return { count: 0 };
      row.shippingProfile = structuredClone(change.data.shippingProfile); row.updatedAt = new Date(1); return { count: 1 };
    } }, auditLog: { create: async (data: unknown) => { if (failAudit && audits.length === 1) throw new Error("synthetic audit failure"); audits.push(data); } } };
  const db = { $transaction: async (callback: (value: unknown) => Promise<unknown>) => { phase = 0; const before = structuredClone(rows), count = audits.length; try { return await callback(tx); } catch (error) { rows.splice(0, rows.length, ...before); audits.length = count; throw error; } } };
  const manifest = () => {
    const products = rows.map(row => ({ action: "REVIEW_ESTIMATED", productId: row.id, expectedName: row.name, expectedEan: row.ean, expectedUpdatedAt: row.updatedAt.toISOString(), expectedShippingProfile: structuredClone(row.shippingProfile), expectedProfileSha256: estimatedReviewSha256(row.shippingProfile), cargoKinds: ["general"], approvedServiceIds: [1, 3] }));
    return { policyVersion: "review-estimated-shipping-v1", products, manifestSha256: estimatedReviewSha256(products) };
  };
  const input = manifest();
  const run = (apply = false, hash?: string, value: unknown = input) => api.reviewEstimatedShippingBatch(db as unknown as Parameters<typeof api.reviewEstimatedShippingBatch>[0], value, "admin", apply, hash);
  return { api, rows, input, manifest, settings, writes, audits, locks, run, revoke: () => { active = false; }, failCas: () => { failCas = true; }, failAudit: () => { failAudit = true; } };
}

test("dry-run não escreve; apply grava somente perfil e auditoria; replay não duplica", async () => {
  const f = await fixture(), before = structuredClone(f.rows), plan = await f.run();
  assert.deepEqual(f.rows, before); assert.equal(f.writes.length, 0);
  await f.run(true, plan.planSha256); assert.equal(f.audits.length, 2); assert.equal(f.writes.length, 2);
  assert.match(f.locks[0], /pg_advisory_xact_lock/); assert.match(f.locks[1], /"User".*FOR UPDATE/); assert.match(f.locks[2], /"ShippingIntegration".*FOR SHARE/);
  await assert.rejects(f.run(true, plan.planSha256)); assert.equal(f.audits.length, 2);
});

test("serviço desconhecido configurado e aprovado nunca é habilitado", async () => {
  const f = await fixture(); f.settings.serviceIds = [999];
  f.input.products.forEach(entry => { entry.approvedServiceIds = [999]; });
  f.input.manifestSha256 = estimatedReviewSha256(f.input.products);
  await assert.rejects(f.run(), /Serviço/); assert.equal(f.writes.length, 0); assert.equal(f.audits.length, 0);
});

test("hash, identidade, perfil e configuração alterados impedem escrita", async () => {
  for (const mutate of [(f: Awaited<ReturnType<typeof fixture>>) => { f.rows[0].name = "changed"; }, (f: Awaited<ReturnType<typeof fixture>>) => { f.rows[0].shippingProfile = {}; }, (f: Awaited<ReturnType<typeof fixture>>) => { f.settings.serviceIds = [1]; }]) {
    const f = await fixture(), plan = await f.run(); mutate(f);
    await assert.rejects(f.run(true, plan.planSha256)); assert.equal(f.writes.length, 0);
  }
  const f = await fixture(); await assert.rejects(f.run(true, "0".repeat(64)), /Plano mudou/); await assert.rejects(f.run(true), /SHA-256/);
  f.input.manifestSha256 = "0".repeat(64); await assert.rejects(f.run(), /manifesto/);
});

test("ADMIN revogado, CAS e auditoria falhos revertem lote", async () => {
  for (const failure of ["revoke", "failCas", "failAudit"] as const) {
    const f = await fixture(), before = structuredClone(f.rows), plan = await f.run(); f[failure]();
    await assert.rejects(f.run(true, plan.planSha256)); assert.deepEqual(f.rows, before); assert.equal(f.audits.length, 0);
    assert.equal(f.writes.length, failure === "revoke" ? 0 : 2, "falha no segundo item reverte também o primeiro");
  }
});

test("DRAFT_ONLY grava hipótese fechada e mantém receita pendente", async () => {
  const f = await fixture(); f.rows.forEach(row => { row.shippingProfile = null; row.requiresPrescription = true; row.category = "Medicamentos"; });
  f.settings.enabled = false;
  const products = f.manifest().products.map(({ cargoKinds: _cargo, approvedServiceIds: _services, ...entry }) => {
    void _cargo; void _services;
    return { ...entry, action: "DRAFT_ONLY", draftProfile: { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 300, lengthCm: 24, widthCm: 15, heightCm: 10, reference: null, cargoKinds: ["medication"], approvedServiceIds: [] } };
  });
  const value = { policyVersion: "review-estimated-shipping-v1", products, manifestSha256: estimatedReviewSha256(products) };
  const plan = await f.run(false, undefined, value); await f.run(true, plan.planSha256, value);
  for (const row of f.rows) {
    const profile = row.shippingProfile as Record<string, unknown>;
    assert.equal(profile.enabled, false); assert.equal(profile.transportReviewed, false); assert.equal(profile.measurementBasis, "estimated");
    assert.equal(row.requiresPrescription, true); assert.equal(row.prescriptionType, "UNREVIEWED");
  }
  assert.equal(f.audits.length, 2);
});

test("CLI e manifesto estritos: dry-run padrão, hash obrigatório e limite50", async () => {
  const f = await fixture(); assert.equal(f.api.parseEstimatedReviewArgs(["--manifest", "x", "--actor-id", "admin"]).apply, false);
  for (const args of [["--manifest", "x", "--actor-id", "admin", "--apply"], ["--unknown"], ["--manifest", "x", "--manifest", "y", "--actor-id", "admin"]]) assert.throws(() => f.api.parseEstimatedReviewArgs(args));
  await assert.rejects(f.run(false, undefined, { ...f.input, extra: true }));
  const products = Array.from({ length: 51 }, (_, i) => ({ ...f.input.products[0], productId: `synthetic-${i}` }));
  await assert.rejects(f.run(false, undefined, { ...f.input, products, manifestSha256: estimatedReviewSha256(products) }));
});
