import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { createRequire } from "node:module";

const bundle = build({ entryPoints: ["src/app/api/admin/produtos/[id]/operacao/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "catalog-operations-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=fixture.auth;" : "export const getPrisma=()=>fixture.db;" }));
} }] });
const version = "2026-10-18T12:00:00.000Z";
const classification = { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false };

async function harness(role: string | null = "ADMIN", options: { pending?: boolean; revoked?: boolean; distributor?: boolean; stale?: boolean; fail?: boolean } = {}) {
  const product = { id: "synthetic-product", inventorySource: options.distributor ? "DISTRIBUTOR" : "PHARMACY", ean: "7896181915638", price: "4.00", promotionalPrice: null, stock: 7, supplierMarkupBps: 6000, requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, catalogClassification: null, updatedAt: new Date(version), supplierOffers: [] };
  const writes: Record<string, unknown>[] = [], audits: unknown[] = [];
  let reads = 0;
  const tx = { $queryRaw: async () => { reads++; return []; }, user: { findFirst: async () => options.revoked ? null : { id: "synthetic-admin" } },
    product: { findUnique: async () => ({ ...product, updatedAt: options.stale ? new Date(0) : product.updatedAt }), update: async ({ data }: { data: Record<string, unknown> }) => { if (options.fail) throw new Error("private SQL details"); writes.push(data); return { ...product, ...Object.fromEntries(Object.entries(data).filter(([,value])=>value!==undefined)) }; } },
    orderItem: { findFirst: async () => options.pending ? { id: "synthetic-item" } : null },
    auditLog: { create: async (data: unknown) => { audits.push(data); return {}; } },
  };
  const loaded = { exports: {} as { PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, TextDecoder, Uint8Array, setTimeout, clearTimeout,
    fixture: { auth: async () => role ? { user: { id: "synthetic-admin", role } } : null, db: { $transaction: async (run: (db: typeof tx) => unknown) => run(tx) } } });
  return { product, writes, audits, reads: () => reads, run: (body: unknown) => loaded.exports.PATCH(new Request("https://example.invalid/api/admin/produtos/synthetic-product/operacao", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: product.id }) }) };
}

test("ajuste rápido exige ADMIN ativo e nega acesso antes de ler o banco", async () => {
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
    const f = await harness(role);
    assert.equal((await f.run({ expectedUpdatedAt: version, supplierMarkupBps: 4000 })).status, 401);
    assert.equal(f.reads(), 0);
  }
  const revoked = await harness("ADMIN", { revoked: true });
  assert.equal((await revoked.run({ expectedUpdatedAt: version, price: 3 })).status, 403);
  assert.equal(revoked.writes.length, 0);
});

test("classificação auditada preserva preços, estoque, receita e dados alheios", async () => {
  const f = await harness();
  const response = await f.run({ expectedUpdatedAt: version, catalogClassification: classification });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal(f.writes.length, 1);
  assert.equal(f.audits.length, 1);
  for (const key of ["stock", "requiresPrescription", "prescriptionType", "imageUrl", "supplierOffers"]) assert.equal(key in f.writes[0], false);
  assert.equal(f.writes[0].price, undefined);
  assert.equal((await f.run({ expectedUpdatedAt: version, catalogClassification: { ...classification, otc: true } })).status, 422);
  assert.equal((await f.run({ expectedUpdatedAt: version, stock: 999 })).status, 422);
});

test("alteração obsoleta, origem incorreta e promoção inválida não gravam", async () => {
  const stale = await harness("ADMIN", { stale: true });
  assert.equal((await stale.run({ expectedUpdatedAt: version, price: 3 })).status, 409);
  assert.equal(stale.writes.length, 0);
  const local = await harness();
  assert.equal((await local.run({ expectedUpdatedAt: version, supplierMarkupBps: 4000 })).status, 422);
  assert.equal((await local.run({ expectedUpdatedAt: version, promotionalPrice: 5 })).status, 422);
  const external = await harness("ADMIN", { distributor: true });
  assert.equal((await external.run({ expectedUpdatedAt: version, price: 3 })).status, 422);
});

test("markup preserva pedidos existentes e falhas não expõem SQL", async () => {
  const pending = await harness("ADMIN", { distributor: true, pending: true });
  assert.equal((await pending.run({ expectedUpdatedAt: version, supplierMarkupBps: 4000 })).status, 409);
  assert.equal(pending.writes.length, 0);
  const same = await pending.run({ expectedUpdatedAt: version, supplierMarkupBps: 6000, catalogClassification: classification });
  assert.equal(same.status, 200);
  const failed = await harness("ADMIN", { fail: true });
  const result = await failed.run({ expectedUpdatedAt: version, price: 3 });
  assert.equal(result.status, 503);
  assert.equal((await result.text()).includes("private SQL"), false);
});

test("lista administrativa mostra preço atual sem custo nem markup para MANAGER", async () => {
  const result = await build({ entryPoints: ["src/app/api/produtos/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "catalog-list-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=fixture.auth;" : "export const getPrisma=()=>fixture.db;" }));
  } }] });
  const product = { id: "synthetic-product", inventorySource: "DISTRIBUTOR", ean: "7896181915638", requiresPrescription: true, price: "99.00", promotionalPrice: null, supplierMarkupBps: 4000, createdAt: new Date(version), updatedAt: new Date(version), supplierOffers: [{ id: "synthetic-offer", supplier: "ANB", eanNormalized: "07896181915638", unitCostCents: 250, retailCeilingCents: 1000, available: true, stockQuantity: null, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(Date.now()-1000), validUntil: new Date(Date.now()+60000) }] };
  for (const role of ["ADMIN", "MANAGER"]) {
    const loaded = { exports: {} as { GET(): Promise<Response> } };
    vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, TextDecoder, Uint8Array, setTimeout, clearTimeout, fixture: { auth: async () => ({ user: { id: "synthetic-user", role } }), db: { product: { findMany: async () => [product] } } } });
    const response = await loaded.exports.GET();
    const row = (await response.json()).data[0];
    assert.equal(row.price, "3.50");
    assert.equal("supplierOffers" in row, false);
    assert.equal("supplierMarkupBps" in row, role === "ADMIN");
    assert.equal("unitCostCents" in row.supplierPricing, role === "ADMIN");
  }
});

test("classificação de distribuidor ativo sem foto não contorna a revisão de publicação", async () => {
  const f = await harness("ADMIN", { distributor: true });
  Object.assign(f.product, { status: "ACTIVE", requiresPrescription: false, prescriptionType: "UNREVIEWED",
    imageUrl: null, imageAssetId: null });
  const response = await f.run({ expectedUpdatedAt: version,
    catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } });
  assert.equal(response.status, 422);
  assert.equal(f.writes.length, 0);
  assert.equal((await f.run({ expectedUpdatedAt: version, supplierMarkupBps: 6000 })).status, 200);
});
