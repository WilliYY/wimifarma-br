import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

type Product = { id: string; ean: string; name: string; category: string; inventorySource: string; status: string; deletedAt: null;
  requiresPrescription: boolean; prescriptionType: string; isPopularPharmacy: boolean; shippingProfile: object | null };
const bundled = build({ entryPoints: ["scripts/apply-pilot-shipping-base.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
  plugins: [{ name: "synthetic-pilot-shipping", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|products\/mutations$|^dotenv\/config$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>fixture.db;"
      : args.path.endsWith("mutations") ? "export const lockProductCatalog=async()=>{};" : "" }));
  } }] });

async function run(options: { apply?: boolean; actor?: boolean; profile?: object; physicalAfterLock?: boolean; popularAfterLock?: boolean } = {}) {
  const products: Product[] = Array.from({ length: 10 }, (_, index) => ({ id: `synthetic-${index}`, ean: `synthetic-ean-${index}`,
    name: "Losartana Potássica 50 mg 30 Comprimidos Revestidos", category: "Medicamentos", inventorySource: "DISTRIBUTOR", status: "ACTIVE",
    deletedAt: null, requiresPrescription: true, prescriptionType: "ORDINARY", isPopularPharmacy: false, shippingProfile: options.profile ?? null }));
  const writes: unknown[] = [], audits: unknown[] = [];
  const tx = { user: { findFirst: async () => options.actor === false ? null : { id: "synthetic-admin" } }, $queryRaw: async () => [],
    product: { findMany: async () => products, findUnique: async ({ where }: { where: { id: string } }) => ({ ...products.find(p => p.id === where.id)!,
      ...(options.physicalAfterLock ? { inventorySource: "PHARMACY" } : {}), ...(options.popularAfterLock ? { isPopularPharmacy: true } : {}) }),
    update: async (args: unknown) => { writes.push(args); return {}; } }, auditLog: { create: async (args: unknown) => { audits.push(args); return {}; } } };
  const fakeProcess = { argv: ["node", "script", "--actor-id", "synthetic-admin", ...(options.apply ? ["--apply"] : [])], exitCode: 0 };
  const fixture = { db: { $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx), $disconnect: async () => {} } };
  const loaded = { exports: {} };
  await vm.runInNewContext((await bundled).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture,
    process: fakeProcess, console: { log() {}, error() {} } });
  return { writes, audits, exitCode: fakeProcess.exitCode };
}

test("pilot shipping estimates default to a write-free dry-run and require active ADMIN", async () => {
  assert.deepEqual((await run()).writes, []);
  const denied = await run({ apply: true, actor: false });
  assert.equal(denied.exitCode, 1);
  assert.equal(denied.writes.length, 0);
});
test("estimated pilot drafts touch only shipping data and never approve transport", async () => {
  const result = await run({ apply: true });
  assert.equal(result.exitCode, 0);
  assert.equal(result.writes.length, 10);
  assert.equal(result.audits.length, 10);
  const data = (result.writes[0] as { data: { shippingProfile: Record<string, unknown> } }).data;
  assert.deepEqual(Object.keys(data), ["shippingProfile"]);
  assert.equal(data.shippingProfile.weightGrams, 500);
  assert.equal(data.shippingProfile.measurementBasis, "estimated");
  assert.equal(data.shippingProfile.enabled, false);
  assert.equal(data.shippingProfile.transportReviewed, false);
  assert.equal(data.shippingProfile.approvedServiceIds, undefined);
});
test("existing manual profiles and post-lock identity changes are preserved", async () => {
  assert.equal((await run({ apply: true, profile: { weightGrams: 123, measurementBasis: "measured" } })).writes.length, 0);
  for (const option of [{ physicalAfterLock: true }, { popularAfterLock: true }]) {
    const result = await run({ apply: true, ...option });
    assert.equal(result.exitCode, 1);
    assert.equal(result.writes.length, 0);
  }
});
