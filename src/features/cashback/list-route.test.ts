import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/cashback/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "cashback-list-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.includes("permissions") ? "export const requireAdminOnlyApi=fixture.guard;" : "export const getPrisma=()=>fixture.db;" }));
} }] });

test("cashback GET lista 100 por página, ordenação estável, filtros e resposta privada", async () => {
  const calls: { skip: number; take: number; where: unknown; orderBy: unknown }[] = [];
  const counts: unknown[] = [];
  const loaded = { exports: {} as { GET(request: Request): Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, fixture: {
    guard: async () => ({}), db: {
      product: { findMany: async (args: typeof calls[number]) => { calls.push(args); return []; }, count: async (args: unknown) => { counts.push(args); return 201; } },
      order: { aggregate: async () => ({ _sum: { cashbackEarnedCents: 0 } }) },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    },
  } });
  const response = await loaded.exports.GET(new Request("https://store.example/api/cashback?page=2&q=synthetic&enabled=true"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls[0].skip, 100);
  assert.equal(calls[0].take, 100);
  assert.equal(payload.pages, 3);
  assert.equal(payload.page, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].orderBy)), [{ name: "asc" }, { id: "asc" }]);
  assert.equal((calls[0].where as { cashbackEnabled: boolean }).cashbackEnabled, true);
  assert.match(JSON.stringify(calls[0].where), /synthetic/);
  assert.equal(counts.length, 2);
  assert.equal((calls[0].where as { deletedAt: null }).deletedAt, null);
  for (const count of counts) assert.equal((count as { where: { deletedAt: null } }).where.deletedAt, null);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal((await loaded.exports.GET(new Request("https://store.example/api/cashback?page=1.5"))).status, 422);
});

const now = Date.now();
const offer = { id: "private-offer", supplier: "ANB", eanNormalized: "07896181915638", unitCostCents: 2028, substitutionTaxCents: null, retailCeilingCents: null,
  available: true, stockQuantity: 3, allocationQuantity: 3, reservedQuantity: 0, committedQuantity: 0,
  observedAt: new Date(now - 1000), validUntil: new Date(now + 3600000) };
const product = { id: "synthetic", name: "Synthetic", brand: null, imageUrl: null, status: "ACTIVE", price: "36.90", promotionalPrice: "35.00",
  cashbackEnabled: true, cashbackRateBps: 200, updatedAt: new Date(now), isPopularPharmacy: false, requiresPrescription: false, deletedAt: null,
  inventorySource: "DISTRIBUTOR", ean: "7896181915638", eanNormalized: "07896181915638", supplierMarkupBps: 2000, stock: 99,
  catalogClassification: { kind: "PERFUMERY", medicineClass: "UNCLASSIFIED", ethical: false, otc: false }, supplierOffers: [offer], privateCanary: "must-not-leak" };

async function pricingFixture(products: Record<string, unknown>[]) {
  const loaded = { exports: {} as { GET(request: Request): Promise<Response> } };
  const visible = (where: { deletedAt?: null }) => products.filter(p => where.deletedAt !== null || p.deletedAt === null);
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, fixture: {
    guard: async () => ({}), db: { product: {
      findMany: async ({ where }: { where: { deletedAt?: null } }) => visible(where),
      count: async ({ where }: { where: { deletedAt?: null } }) => visible(where).length,
    }, order: { aggregate: async () => ({ _sum: { cashbackEarnedCents: 0 } }) }, $transaction: (operations: Promise<unknown>[]) => Promise.all(operations) },
  } });
  const response = await loaded.exports.GET(new Request("https://store.example/api/cashback"));
  assert.equal(response.status, 200);
  return response.json();
}

test("cashback distribuidor usa menor custo e markup canônicos sem preço físico nem vazamento", async () => {
  for (const [markup, expected] of [[2000, "24.34"], [5000, "30.42"]] as const) {
    const payload = await pricingFixture([{ ...product, supplierMarkupBps: markup, supplierOffers: [{ ...offer, id: "expensive", supplier: "PROFARMA", unitCostCents: 3000 }, offer] }]);
    assert.equal(payload.data[0].price, expected);
    assert.equal(payload.data[0].promotionalPrice, null);
    assert.equal(payload.data[0].priceAvailable, true);
    assert.deepEqual(Object.keys(payload.data[0]).sort(), ["id", "name", "brand", "imageUrl", "status", "price", "promotionalPrice", "priceAvailable", "cashbackEnabled", "cashbackRateBps", "updatedAt", "isPopularPharmacy", "requiresPrescription"].sort());
    assert.doesNotMatch(JSON.stringify(payload), /private-offer|unitCostCents|supplierOffers|supplierMarkupBps|catalogClassification|eanNormalized|stockQuantity|must-not-leak|36\.90|35\.00/);
  }
});

test("cashback sem oferta canônica retorna preço ausente e mantém configuração futura", async () => {
  const variants = [
    { supplierOffers: [] }, { supplierOffers: [{ ...offer, available: false }] }, { supplierOffers: [{ ...offer, stockQuantity: 0 }] },
    { supplierMarkupBps: 10001 }, { requiresPrescription: true, supplierOffers: [{ ...offer, retailCeilingCents: 2000 }] },
    { catalogClassification: { kind: "MEDICINE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false }, supplierOffers: [{ ...offer, supplier: "PROFARMA", substitutionTaxCents: null }] },
  ];
  for (const variant of variants) {
    const payload = await pricingFixture([{ ...product, ...variant }]);
    assert.equal(payload.data[0].priceAvailable, false);
    assert.equal(payload.data[0].price, null);
    assert.equal(payload.data[0].promotionalPrice, null);
    assert.equal(payload.data[0].cashbackEnabled, true);
    assert.equal(payload.data[0].cashbackRateBps, 200);
  }
});

test("cashback preserva promoção PHARMACY e exclui removidos da lista e dos contadores", async () => {
  const payload = await pricingFixture([{ ...product, inventorySource: "PHARMACY", price: "20.50", promotionalPrice: "15.12" }, { ...product, id: "deleted", deletedAt: new Date(now) }]);
  assert.equal(payload.total, 1); assert.equal(payload.active, 1); assert.equal(payload.data.length, 1);
  assert.equal(payload.data[0].price, "20.50"); assert.equal(payload.data[0].promotionalPrice, "15.12"); assert.equal(payload.data[0].priceAvailable, true);
});
