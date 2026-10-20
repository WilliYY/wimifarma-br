import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/produtos/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "catalog-list-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=fixture.auth;" : "export const getPrisma=()=>fixture.db;" }));
} }] });

async function fixture(role: string | null = "ADMIN") {
  const now = Date.now();
  const rows = Array.from({ length: 140 }, (_, i) => ({ id: `synthetic-${i}`, name: `Produto sintético ${i}`, slug: `synthetic-${i}`,
    inventorySource: i ? "DISTRIBUTOR" : "PHARMACY", category: "Higiene", stock: 2, price: "20.00", promotionalPrice: null,
    supplierMarkupBps: 5000, ean: "1234567890128", requiresPrescription: false, prescriptionType: "UNREVIEWED",
    catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
    createdAt: new Date(now - i), updatedAt: new Date(now - i),
    supplierOffers: [{ id: "synthetic-offer", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 1000,
      retailCeilingCents: null, available: true, stockQuantity: null, allocationQuantity: 5, reservedQuantity: 0,
      committedQuantity: 0, observedAt: new Date(now - 1000), validUntil: new Date(now + 3_600_000) }],
  }));
  const queries: { take?: number; where?: unknown }[] = [];
  const loaded = { exports: {} as { GET(): Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console,
    TextDecoder, Uint8Array, setTimeout, clearTimeout,
    fixture: { auth: async () => role ? { user: { id: "synthetic-user", role } } : null,
      db: { product: { findMany: async (query: { take?: number; where?: unknown }) => {
        queries.push(query);
        return query.take ? rows.slice(0, query.take) : rows;
      } } } },
  });
  return { rows, queries, run: () => loaded.exports.GET() };
}

test("listagem administrativa inclui todo o catálogo e novas entradas depois de 100 itens", async () => {
  const f = await fixture();
  const response = await f.run();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  const payload = await response.json();
  assert.equal(payload.data.length, 140);
  assert.equal(f.queries[0].take, undefined);
  assert.equal(JSON.stringify(f.queries[0].where), JSON.stringify({ deletedAt: null }));
  f.rows.unshift({ ...f.rows[0], id: "synthetic-new", name: "Novo produto sintético" });
  assert.equal((await (await f.run()).json()).data.length, 141);
});

test("catálogo completo mantém custos exclusivos de ADMIN e nunca expõe ofertas brutas", async () => {
  for (const role of ["ADMIN", "MANAGER"]) {
    const f = await fixture(role);
    const data = (await (await f.run()).json()).data;
    assert.equal(data.length, 140);
    assert.equal(data[0].inventorySource, "PHARMACY");
    const distributor = data[1];
    assert.equal(distributor.price, "15.00");
    assert.equal(distributor.supplierPricing.unitPriceCents, 1500);
    assert.equal("supplierOffers" in distributor, false);
    assert.equal("supplierMarkupBps" in distributor, role === "ADMIN");
    assert.equal("unitCostCents" in distributor.supplierPricing, role === "ADMIN");
  }
});

test("visitante e cliente não consultam nem recebem o catálogo administrativo", async () => {
  for (const role of [null, "CUSTOMER"]) {
    const f = await fixture(role);
    assert.equal((await f.run()).status, 401);
    assert.equal(f.queries.length, 0);
  }
});
