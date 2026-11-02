import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

type Row = { id: string; name: string; ean: string; eanNormalized: string; status: string; deletedAt: null; updatedAt: Date; shippingProfile: unknown; logisticsEvidence: unknown; requiresPrescription: boolean; prescriptionType: string; isPopularPharmacy: boolean; catalogClassification: unknown };
type Entry = { productId: string; expectedEan: string; expectedName: string; expectedUpdatedAt: string; expectedShippingProfile: unknown; expectedProfileSha256: string; scenario: string };
type Manifest = { policyVersion: string; products: Entry[]; manifestSha256: string };
type Plan = { applied: boolean; planSha256: string; products: { productId: string; action: string; draft: Record<string, unknown> | null }[] };
type Exports = { completionSha256: (value: unknown) => string; completeEstimatedShippingDrafts: (db: unknown, manifest: unknown, actor: string, apply?: boolean, hash?: string) => Promise<Plan>; parseCompletionArgs: (args: string[]) => unknown };
const emptyNotify = () => ({ enabled: false, transportReviewed: false, measurementBasis: "unknown", notifyOnlyPendingLogistics: true, reference: null, weightGrams: null, lengthCm: null, widthCm: null, heightCm: null, approvedServiceIds: [], cargoKinds: ["unspecified"], legacy: { preserve: true } });

async function fixture() {
  const bundle = await build({ entryPoints: ["scripts/complete-estimated-shipping-drafts.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "completion-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('No automatic connection')};" : "" }));
  } }] });
  const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: `synthetic-${i}`, name: `Produto sintético ${i}`, ean: i % 2 ? "7890000000017" : "7890000000000", eanNormalized: i % 2 ? "07890000000017" : "07890000000000", status: "ACTIVE", deletedAt: null, updatedAt: new Date(0), shippingProfile: i < 6 ? null : emptyNotify(), logisticsEvidence: { conflict: "preserved" }, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, catalogClassification: null }));
  let active = true, casFailure = false, auditFailure = false, locked = false, transactions = 0;
  const writes: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  const audits: Array<{ data: { metadata: Record<string, unknown>; action: string } }> = [];
  const tx = { $queryRaw: async () => { locked = true; }, user: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
    assert.ok(locked); assert.deepEqual(structuredClone(where), { id: "admin", role: "ADMIN", isActive: true }); return active ? { id: "admin" } : null;
  } }, product: { findMany: async () => structuredClone(rows), updateMany: async (change: typeof writes[number]) => {
    writes.push(change); assert.deepEqual(Object.keys(change.data), ["shippingProfile"]);
    if (casFailure) return { count: 0 };
    const row = rows.find(row => row.id === change.where.id)!;
    assert.equal((change.where.updatedAt as Date).toISOString(), row.updatedAt.toISOString());
    assert.equal(change.where.status, "ACTIVE"); assert.equal(change.where.deletedAt, null);
    row.shippingProfile = structuredClone(change.data.shippingProfile); row.updatedAt = new Date(1); return { count: 1 };
  } }, auditLog: { create: async (data: typeof audits[number]) => { if (auditFailure) throw new Error("synthetic audit failure"); audits.push(data); } } };
  const db = { $transaction: async (callback: (tx: unknown) => Promise<unknown>, options: Record<string, unknown>) => {
    transactions++; assert.equal(options.isolationLevel, "RepeatableRead");
    const before = structuredClone(rows), count = audits.length;
    try { return await callback(tx); } catch (error) { rows.splice(0, rows.length, ...before); audits.length = count; throw error; }
  } };
  const loaded = { exports: {} as Exports };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), console, Buffer, URL, Date, process: { argv: ["node", "fixture.ts"], env: {} } });
  const api = loaded.exports;
  const manifest = (): Manifest => {
    const products = rows.map(row => ({ productId: row.id, expectedEan: row.ean, expectedName: row.name, expectedUpdatedAt: row.updatedAt.toISOString(), expectedShippingProfile: structuredClone(row.shippingProfile), expectedProfileSha256: api.completionSha256(row.shippingProfile), scenario: "SOLID_300" }));
    return { policyVersion: "complete-estimated-shipping-drafts-v1", products, manifestSha256: api.completionSha256(products) };
  };
  const input = manifest();
  const run = (apply = false, hash?: string, value: unknown = input) => api.completeEstimatedShippingDrafts(db, value, "admin", apply, hash);
  return { api, run, rows, input, manifest, audits, writes, stats: () => ({ transactions }), admin: () => { active = false; }, failCas: () => { casFailure = true; }, failAudit: () => { auditFailure = true; } };
}

test("dry-run não escreve; aplicação mantém notify, extras e evidências e cria rascunhos sem aceitação", async () => {
  const f = await fixture(), before = structuredClone(f.rows);
  const plan = await f.run(); assert.equal(plan.applied, false); assert.equal(f.writes.length, 0); assert.deepEqual(f.rows, before);
  await f.run(true, plan.planSha256);
  assert.equal(f.writes.length, 12); assert.equal(f.audits.length, 12);
  f.rows.forEach((row, i) => {
    const profile = row.shippingProfile as Record<string, unknown>;
    assert.deepEqual(profile, { ...(i < 6 ? { enabled: false, transportReviewed: false, reference: null, approvedServiceIds: [], cargoKinds: ["unspecified"] } : emptyNotify()), measurementBasis: "estimated", weightGrams: 300, lengthCm: 24, widthCm: 15, heightCm: 10 });
    assert.deepEqual(row.logisticsEvidence, before[i].logisticsEvidence);
    assert.equal(row.prescriptionType, before[i].prescriptionType);
  });
});

test("identidade, revisão, perfil literal e hash são vinculados antes de escrever", async () => {
  for (const field of ["id", "ean", "name", "updatedAt", "shippingProfile"] as const) {
    const f = await fixture(), plan = await f.run();
    Object.assign(f.rows[0], { [field]: field === "updatedAt" ? new Date(1) : field === "shippingProfile" ? emptyNotify() : "changed" });
    await assert.rejects(f.run(true, plan.planSha256)); assert.equal(f.writes.length, 0, field);
  }
  const f = await fixture(); f.input.products[0].expectedProfileSha256 = "0".repeat(64);
  f.input.manifestSha256 = f.api.completionSha256(f.input.products);
  await assert.rejects(f.run(), /perfil|Perfil/); assert.equal(f.writes.length, 0);
});

test("recusa perfis revisados, peso/medidas existentes e alterações na sinalização notify", async () => {
  for (const patch of [{ enabled: true }, { transportReviewed: true }, { weightGrams: 100 }, { lengthCm: 1 }, { widthCm: 1 }, { heightCm: 1 }, { measurementBasis: "measured" }, { notifyOnlyPendingLogistics: false }, { reference: {} }]) {
    const f = await fixture(); f.rows[6].shippingProfile = { ...emptyNotify(), ...patch };
    await assert.rejects(f.run(false, undefined, f.manifest())); assert.equal(f.writes.length, 0);
  }
});

test("ADMIN e hash revisado são obrigatórios; plano muda se evidência ou política mudar", async () => {
  const f = await fixture(); await assert.rejects(f.run(true), /SHA-256/); assert.equal(f.stats().transactions, 0);
  const plan = await f.run(); await assert.rejects(f.run(true, "0".repeat(64)), /Plano mudou/); assert.equal(f.writes.length, 0);
  f.rows[0].logisticsEvidence = { changed: true }; await assert.rejects(f.run(true, plan.planSha256), /Plano mudou/);
  f.admin(); await assert.rejects(f.run(), /ADMIN/);
});

test("CAS e falha de auditoria revertem lote; repetição não sobrescreve estimativas prontas", async () => {
  for (const failure of ["failCas", "failAudit"] as const) {
    const f = await fixture(), before = structuredClone(f.rows), plan = await f.run(); f[failure]();
    await assert.rejects(f.run(true, plan.planSha256)); assert.deepEqual(f.rows, before); assert.equal(f.audits.length, 0);
  }
  const f = await fixture(), plan = await f.run(); await f.run(true, plan.planSha256);
  await assert.rejects(f.run(true, plan.planSha256)); assert.equal(f.writes.length, 12);
  await assert.rejects(f.run(false, undefined, f.manifest())); assert.equal(f.writes.length, 12);
});

test("receitas pendentes, controlados e Popular ficam bloqueados sem reclassificação", async () => {
  const f = await fixture();
  Object.assign(f.rows[0], { requiresPrescription: true, prescriptionType: "UNREVIEWED" });
  Object.assign(f.rows[1], { requiresPrescription: true, prescriptionType: "CONTROLLED" });
  Object.assign(f.rows[2], { isPopularPharmacy: true });
  const plan = await f.run(); assert.deepEqual(Array.from(plan.products.slice(0, 3), row => row.action), Array(3).fill("PENDING_PHYSICAL_REVIEW"));
  await f.run(true, plan.planSha256); assert.equal(f.writes.length, 9); assert.equal(f.rows[0].shippingProfile, null);
});

test("valores finais já têm 20%: não há segunda margem nem aprovação de encaixe", async () => {
  const f = await fixture(); f.input.products[0].scenario = "CLOPIDOGREL_360"; f.input.products[1].scenario = "PLAX_1080";
  f.input.manifestSha256 = f.api.completionSha256(f.input.products);
  const plan = await f.run(); assert.equal(plan.products[0].draft?.weightGrams, 360); assert.equal(plan.products[1].draft?.weightGrams, 1080);
  assert.equal(plan.products[0].draft?.lengthCm, 30); assert.equal(plan.products[0].draft?.widthCm, 20); assert.equal(plan.products[0].draft?.heightCm, 15);
});

test("CLI é estrita e --apply exige --expect-plan antes de abrir banco", async () => {
  const f = await fixture();
  for (const args of [["--manifest", "manifest.json", "--actor-id", "admin", "--apply"], ["--unknown"], ["--manifest", "x", "--manifest", "y", "--actor-id", "admin"]]) assert.throws(() => f.api.parseCompletionArgs(args));
  const result = f.api.parseCompletionArgs(["--manifest", "manifest.json", "--actor-id", "admin"]);
  assert.equal((result as { apply: boolean }).apply, false);
});
