import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { defaultShippingSettings } from "./schema";

test("freight catalog pages beyond 500, searches globally and exposes only its administrative DTO", async () => {
  const bundle = await build({ entryPoints: ["src/app/api/admin/fretes/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "freight-catalog-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|features\/shipping\/integration$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=async()=>globalThis.fixture.guard;" : args.path.endsWith("integration") ? "export const readShippingIntegration=async()=>globalThis.fixture.integration;export const saveShippingSettings=async()=>{};" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
  const queries: Record<string, unknown>[] = [];
  const counted: Record<string, unknown>[] = [];
  let configured = false;
  const products = Array.from({ length: 805 }, (_, i) => ({ id: `synthetic-${i}`, name: `Produto ${String(i).padStart(4, "0")}` }));
  const fixture = { guard: { session: { user: { id: "synthetic-admin" } } }, integration: { settings: defaultShippingSettings, revision: 7, credentials: { accessToken: "synthetic-private-token", clientSecret: "synthetic-secret" } }, prisma: { product: {
    count: async (query: Record<string, unknown>) => { counted.push(query); const ids = (query.where as { id?: { in: string[] } })?.id?.in; return ids ? ids.length : products.length; },
    findMany: async (query: Record<string, unknown>) => {
      if (query.take === undefined) return products.map((product, index) => ({ id: product.id, category: "Higiene", shippingProfile: configured && index === 804 ? { enabled: true, transportReviewed: true, weightGrams: 300, widthCm: 10, heightCm: 10, lengthCm: 20 } : null }));
      queries.push(query);
      const ids = (query.where as { id?: { in: string[] } })?.id?.in;
      const matching = ids ? products.filter(product => ids.includes(product.id)) : products;
      return matching.slice(Number(query.skip ?? 0), Number(query.skip ?? 0) + Number(query.take));
    },
  } } };
  const loaded = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture });
  const response = await loaded.exports.GET(new Request("https://example.com/api/admin/fretes?page=8"));
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.products.length, 100);
  assert.equal(data.products[0].id, "synthetic-700");
  assert.deepEqual(data.pagination, { page: 8, pageSize: 100, total: 805, totalPages: 9 });
  assert.deepEqual(data.readinessSummary, { total: 805, missing: 805, review: 0, disabled: 0, configured: 0, assisted: 0 });
  assert.equal(JSON.stringify(data).includes("synthetic-private"), false);
  assert.equal(JSON.stringify(data).includes("synthetic-secret"), false);
  assert.deepEqual(Object.keys(queries[0].select as object).sort(), ["category", "id", "isPopularPharmacy", "name", "prescriptionType", "requiresPrescription", "shippingProfile", "updatedAt"].sort());
  assert.deepEqual(JSON.parse(JSON.stringify(queries[0].orderBy)), [{ name: "asc" }, { id: "asc" }]);
  await loaded.exports.GET(new Request("https://example.com/api/admin/fretes?page=99&q=7890000000000"));
  assert.equal(queries[1].skip, 800);
  const where = JSON.parse(JSON.stringify(queries[1].where));
  assert.equal(where.deletedAt, null);
  assert.deepEqual(where.OR, ["name", "ean", "sku"].map(key => ({ [key]: { contains: "7890000000000", mode: "insensitive" } })));
  assert.deepEqual(JSON.parse(JSON.stringify(counted[1])), { where });
  for (const query of ["page=0", "page=-1", "page=1.5", "page=Infinity", `q=${"a".repeat(121)}`]) {
    const invalid = await loaded.exports.GET(new Request(`https://example.com/api/admin/fretes?${query}`));
    assert.equal(invalid.status, 422, query);
  }
  assert.equal(queries.length, 2);
  configured = true;
  const ready = await (await loaded.exports.GET(new Request("https://example.com/api/admin/fretes?readiness=CONFIGURED"))).json();
  assert.equal(ready.data.products.length, 1);
  assert.equal(ready.data.products[0].id, "synthetic-804", "global filter reaches a product beyond the first eight pages");
  assert.equal(ready.data.readinessSummary.configured, 1);
  const pending = await (await loaded.exports.GET(new Request("https://example.com/api/admin/fretes?readiness=PENDING&page=8"))).json();
  assert.equal(pending.data.pagination.total, 804);
  assert.equal(pending.data.products.some((product: { id: string }) => product.id === "synthetic-804"), false);
  assert.equal((await loaded.exports.GET(new Request("https://example.com/api/admin/fretes?readiness=INVALID"))).status, 422);
});
