import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { createRequire } from "node:module";

const version = "2026-10-19T12:00:00.000Z";
const bundle = build({ entryPoints: ["src/app/api/admin/produtos/lote/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "bulk-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=fixture.auth;" : "export const getPrisma=()=>fixture.db;" }));
} }] });
type Options = { role?: string | null; revoked?: boolean; stale?: boolean; missing?: boolean; pending?: boolean; distributor?: boolean; prescription?: boolean; auditFails?: boolean };
async function harness(options: Options = {}) {
  const role = options.role === undefined ? "ADMIN" : options.role;
  const products = ["b", "a"].map(id => ({ id, name: "Synthetic", updatedAt: new Date(version), status: "ACTIVE", category: "Original", inventorySource: options.distributor ? "DISTRIBUTOR" : "PHARMACY", supplierMarkupBps: 6000, supplierOffers: [], requiresPrescription: options.prescription ?? false, isPopularPharmacy: false, featuredPosition: 2, cashbackEnabled: false, cashbackRateBps: 200, wimicoinsEnabled: false, wimicoinsRateBps: 200 }));
  const writes: { id: string; data: Record<string, unknown> }[] = [], audits: unknown[] = [], locks: string[] = [];
  let dbReads = 0;
  const tx = { $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => { dbReads++; if (parts.join("").includes('"Product"')) locks.push(String(values[0])); return []; },
    user: { findFirst: async () => options.revoked ? null : { id: "synthetic-admin", role } },
    product: { findUnique: async ({ where }: { where: { id: string } }) => options.missing && where.id === "b" ? null : { ...products.find(p => p.id === where.id), updatedAt: options.stale && where.id === "b" ? new Date(0) : new Date(version) },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { writes.push({ id: where.id, data }); return { id: where.id, updatedAt: new Date(version) }; } },
    orderItem: { findFirst: async () => options.pending ? { id: "pending" } : null },
    auditLog: { create: async (data: unknown) => { if (options.auditFails) throw new Error("private SQL"); audits.push(data); } },
  };
  const loaded = { exports: {} as { PATCH(request: Request): Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, TextDecoder, Uint8Array, setTimeout, clearTimeout, process: { env: {} },
    fixture: { auth: async () => role ? { user: { id: "synthetic-admin", role } } : null, db: { $transaction: async (run: (client: typeof tx) => unknown) => { const start = writes.length; try { return await run(tx); } catch (error) { writes.splice(start); throw error; } } } } });
  return { writes, audits, locks, reads: () => dbReads, run: (changes: unknown, headers: Record<string, string> = {}, items = [{ id: "b", expectedUpdatedAt: version }, { id: "a", expectedUpdatedAt: version }]) => loaded.exports.PATCH(new Request("https://store.example/api/admin/produtos/lote", { method: "PATCH", headers: { origin: "https://store.example", "content-type": "application/json", ...headers }, body: JSON.stringify({ items, changes }) })) };
}

test("bulk: nega sessão, MANAGER financeiro e ADMIN revogado sem gravação", async () => {
  for (const role of [null, "CUSTOMER", "STAFF"]) { const f = await harness({ role }); assert.equal((await f.run({ status: "DRAFT" })).status, 401); assert.equal(f.reads(), 0); }
  const manager = await harness({ role: "MANAGER" });
  assert.equal((await manager.run({ supplierMarkupBps: 2000 })).status, 403);
  assert.equal((await manager.run({ cashbackEnabled: true })).status, 403);
  assert.equal(manager.writes.length, 0);
  const revoked = await harness({ revoked: true }); assert.equal((await revoked.run({ status: "DRAFT" })).status, 403); assert.equal(revoked.writes.length, 0);
});
test("bulk: schema estrito, ids únicos, máximo50 e origem/corpo limitados", async () => {
  const f = await harness();
  for (const changes of [{}, { inventorySource: "PHARMACY" }, { stock: 200 }, { price: 2 }, { requiresPrescription: false }, { supplierMarkupBps: 10001 }, { cashbackRateBps: 0 }, { status: "INVALID" }]) assert.equal((await f.run(changes)).status, 422);
  assert.equal((await f.run({ status: "DRAFT" }, {}, Array.from({ length: 51 }, (_, i) => ({ id: String(i), expectedUpdatedAt: version })))).status, 422);
  assert.equal((await f.run({ status: "DRAFT" }, {}, [{ id: "a", expectedUpdatedAt: version }, { id: "a", expectedUpdatedAt: version }])).status, 422);
  const invalidHeaders: Record<string, string>[] = [{ origin: "https://evil.example" }, { "sec-fetch-site": "same-site" }, { "content-type": "text/plain" }, { "content-length": "40000" }];
  for (const headers of invalidHeaders) assert.ok([403, 413, 415].includes((await f.run({ status: "DRAFT" }, headers)).status));
  assert.equal(f.writes.length, 0);
});
test("bulk: locks ordenados, campos explícitos, auditoria mínima e respostas privadas", async () => {
  const f = await harness({ role: "MANAGER" }); const response = await f.run({ category: "Higiene" }); assert.equal(response.status, 200);
  assert.deepEqual(f.locks, ["a", "b"]); assert.equal(f.writes.length, 2); assert.equal(f.audits.length, 2);
  for (const write of f.writes) assert.deepEqual(Object.keys(write.data), ["category"]);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/); assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.equal(JSON.stringify(f.audits).includes("Synthetic"), false);
});
test("bulk: stale/missing/pedidos abertos impedem todo o lote", async () => {
  for (const options of [{ stale: true }, { missing: true }, { distributor: true, pending: true }]) { const f = await harness(options); assert.ok([404, 409].includes((await f.run(options.distributor ? { supplierMarkupBps: 2000 } : { status: "DRAFT" })).status)); assert.equal(f.writes.length, 0); }
});
test("bulk: preserva origem, receitas e benefícios incompatíveis; status remove destaque", async () => {
  const physical = await harness(); assert.equal((await physical.run({ supplierMarkupBps: 2000 })).status, 422);
  const rx = await harness({ prescription: true }); assert.equal((await rx.run({ cashbackEnabled: true })).status, 422); assert.equal((await rx.run({ wimicoinsEnabled: true })).status, 422);
  const f = await harness(); assert.equal((await f.run({ status: "DRAFT" })).status, 200);
  for (const write of f.writes) assert.deepEqual(Object.keys(write.data).sort(), ["featuredPosition", "status"]);
});
test("bulk: falha de auditoria reverte o lote sem expor detalhes", async () => {
  const f = await harness({ auditFails: true }); const response = await f.run({ status: "DRAFT" }); assert.equal(response.status, 503); assert.equal(f.writes.length, 0); assert.equal((await response.text()).includes("private SQL"), false);
});
