import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { groupCategoryNames, catalogGroup } from "./home-shortcuts";

async function fixture(rows: object[]) {
  let query: Record<string, unknown> = {};
  const db = { product: { findMany: async (input: Record<string, unknown>) => { query = input; return rows; } } };
  const bundle = await build({ entryPoints: ["src/features/products/storefront.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "storefront-db", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>fixture.db;" }));
  } }] });
  const loaded = { exports: {} as typeof import("./storefront") };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: { db }, URL });
  return { service: loaded.exports, query: () => query };
}

test("grupo Medicamentos abrange genéricos, similares, éticos e MIP sem inventar categorias", () => {
  const names = ["Medicamentos", "Genéricos", "Similares", "Éticos", "Medicamentos MIP", "Perfumaria"];
  assert.deepEqual(groupCategoryNames(names.map(name => ({ name })), "medicines"), names.slice(0, -1));
  assert.equal(catalogGroup("invalid"), undefined);
  assert.equal(catalogGroup(["medicines"]), undefined);
});

test("ordenação resolve preço comercial antes da paginação e DTO não expõe custos", async () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Produto ${i}`, stock: 2, price: String(100 - i), promotionalPrice: i === 29 ? "1.00" : null, supplierMarkupBps: 6000, supplierOffers: [] }));
  const { service, query } = await fixture(rows);
  const first = await service.getStorefrontProducts({ sort: "preco-asc" });
  assert.equal(first.products[0].id, "29");
  assert.equal(first.products.length, 24);
  assert.equal(first.count, 30);
  assert.equal(query().take, undefined);
  assert.equal("supplierOffers" in first.products[0], false);
  assert.equal("supplierMarkupBps" in first.products[0], false);
  const second = await service.getStorefrontProducts({ sort: "preco-asc", page: 2 });
  assert.equal(second.products.length, 6);
  assert.ok(Number(second.products[0].price) > Number(first.products.at(-1)!.price));
  assert.equal(service.catalogPageHref("/catalogo?grupo=medicines&ordem=preco-asc", 2), "/catalogo?grupo=medicines&ordem=preco-asc&pagina=2");
  assert.equal(service.catalogPageHref("/catalogo?grupo=medicines&ordem=preco-asc&pagina=2", 1), "/catalogo?grupo=medicines&ordem=preco-asc");
});
