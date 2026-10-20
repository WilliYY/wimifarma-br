import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { Prisma } from "@/generated/prisma/client";

const product = (id: string, extra = {}) => ({
  id, name: `Losartana 50mg ${id}`, slug: id, stock: 3, price: "10.00", promotionalPrice: null,
  activeIngredients: ["losartana potássica"], inventorySource: "PHARMACY", imageUrl: "/public.webp",
  requiresPrescription: true, ...extra,
});

async function fixture(db: object) {
  const bundle = await build({ entryPoints: ["src/features/products/search-catalog.ts"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", plugins: [{ name: "search-db", setup(builder) {
      builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onResolve({ filter: /generated\/prisma\/client$/ }, args => ({ path: args.path, external: true }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>fixture.db;" }));
    } }] });
  const loaded = { exports: {} as typeof import("./search-catalog") };
  const nativeRequire = createRequire(import.meta.url);
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: (name: string) => name.endsWith("generated/prisma/client") ? { Prisma } : nativeRequire(name), fixture: { db },
  });
  return loaded.exports;
}

test("busca pagina no banco, preserva ordem e não expõe foto privada/ofertas", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return queries.length === 1 ? [{ id: "b", total: 30 }, { id: "a", total: 30 }] : []; },
    product: { findMany: async () => [product("a"), product("b", { inventorySource: "DISTRIBUTOR", supplierOffers: [], imageUrl: "/api/admin/fornecedores/imagens/private.webp" })] },
  });
  const result = await service.getSearchCatalog("losartana 50 mg (Corus)", { page: 2 });
  assert.equal(result.count, 30);
  assert.deepEqual(Array.from(result.products, row => row.id), ["b", "a"]);
  assert.equal(result.products[0].imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.equal(result.products[1].imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.doesNotMatch(JSON.stringify(result.products), /\/public\.webp|\/api\/admin\/fornecedores\/imagens\//);
  assert.equal("supplierOffers" in result.products[0], false);
  assert.match(queries[0].text, /LIMIT \$\d+ OFFSET \$\d+/);
  assert.deepEqual(queries[0].values.slice(-2), [24, 24]);
  assert.ok(queries[0].values.includes("(^| )50 ?mg($| )"));
  assert.ok(queries[0].values.includes("(^| )corus"));
});

test("texto de busca nunca vira SQL e consulta vazia não usa banco", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; } });
  assert.equal((await service.getSearchCatalog(" + ")).count, 0);
  assert.equal(queries.length, 0);
  await service.getSearchCatalog("losartana'); DROP TABLE Product; --");
  assert.equal(queries.length, 1);
  assert.doesNotMatch(queries[0].text, /DROP TABLE/);
  assert.ok(queries[0].values.some(value => String(value).includes("drop table")));
});

test("sidebar usa somente pedidos concluídos pagos e exclui gateway de teste", async () => {
  let input: Record<string, unknown> = {};
  const service = await fixture({ orderItem: { groupBy: async (args: Record<string, unknown>) => {
    input = args;
    return [{ productId: "b", _sum: { quantity: 5 } }];
  } } });
  const result = await service.getSearchSidebar([product("a"), product("b"), product("no-stock", { stock: 0 })] as never);
  assert.equal(result.title, "Mais vendidos nesta busca");
  assert.deepEqual(Array.from(result.products, row => row.id), ["b"]);
  const where = input.where as { productId: { in: string[] }; order: { status: string; paymentStatus: string; OR: unknown[] } };
  assert.deepEqual(Array.from(where.productId.in), ["a", "b"]);
  assert.equal(where.order.status, "COMPLETED");
  assert.equal(where.order.paymentStatus, "PAID");
  assert.match(JSON.stringify(where.order.OR), /production/);
  assert.doesNotMatch(JSON.stringify(where.order.OR), /test/);
});

test("sem vendas reais a lateral se identifica como relevantes", async () => {
  const service = await fixture({ orderItem: { groupBy: async () => [] } });
  assert.equal((await service.getSearchSidebar([product("a")] as never)).title, "Relevantes para sua busca");
  assert.equal((await service.getSearchSidebar([])).products.length, 0);
});

test("assuntos usam identidades completas parametrizadas e não trazem alternativas fora do filtro", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return [{ id: "a", total: 1 }]; },
    product: { findMany: async () => [product("a")] },
  });
  await service.getSearchCatalog("pressão alta 50mg");
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /unnest\(p\."activeIngredients"\)/);
  assert.match(queries[0].text, /unnest\(p\."searchTerms"\)/);
  assert.ok(queries[0].values.includes("losartana potassica"));
  assert.ok(queries[0].values.includes("besilato de anlodipino"));
  assert.ok(queries[0].values.includes("(^| )50 ?mg($| )"));
  assert.equal(queries[0].values.includes("(^| )pressao"), false);
  assert.doesNotMatch(queries[0].text, /losartana|pressao|anlodipino/);
  await service.getSearchCatalog("diabetes tipo 2");
  assert.equal(queries[1].values.some(value => String(value).includes("[^0-9.,])2")), false);
  const before = queries.length;
  await service.getSearchCatalog("não quero para pressão");
  assert.equal(queries.length, before);
});

test("relação por assunto exclui Rx da lateral promocional, conservando a busca literal", async () => {
  const service = await fixture({ orderItem: { groupBy: async () => [] } });
  const rx = product("rx");
  assert.equal((await service.getSearchSidebar([rx] as never, { topicSearch: true })).products.length, 0);
  assert.equal((await service.getSearchSidebar([rx] as never)).products.length, 1);
});
