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

test("disponibilidade vendável ordena simples e associações globalmente antes da paginação", async () => {
  const rows = [
    product("single-unavailable", { stock: 0 }),
    product("association-unavailable", { name: "Losartana + hidroclorotiazida 50mg", activeIngredients: ["losartana", "hidroclorotiazida"], inventorySource: "DISTRIBUTOR", stock: 99, supplierOffers: [] }),
    ...Array.from({ length: 24 }, (_, index) => product(`available-${index}`)),
    product("association-available", { name: "Losartana + hidroclorotiazida 50mg", activeIngredients: ["losartana", "hidroclorotiazida"] }),
  ];
  let rawQueries = 0;
  let productReads = 0;
  const service = await fixture({
    $queryRaw: async () => { rawQueries++; return rows.map(row => ({ id: row.id, total: rows.length })); },
    product: { findMany: async () => { productReads++; return [...rows].reverse(); } },
  });
  const first = await service.getSearchCatalog("losartana", { relatedLimit: 0 });
  const second = await service.getSearchCatalog("losartana", { page: 2, relatedLimit: 0 });
  assert.equal(first.count, 27);
  assert.deepEqual(Array.from(first.products, row => row.id), rows.slice(2, 26).map(row => row.id));
  assert.deepEqual(Array.from(second.products, row => row.id), ["association-available", "single-unavailable", "association-unavailable"]);
  assert.equal(second.products[2].stock, 0, "estoque bruto do distribuidor não comprova disponibilidade");
  assert.equal(first.products[0].price, "10.00");
  assert.equal(rawQueries, 2, "cada página usa uma consulta de candidatos, sem consulta por produto");
  assert.equal(productReads, 2, "cada página carrega produtos/ofertas em uma consulta, sem N+1");
  assert.doesNotMatch(JSON.stringify([first, second]), /supplierOffers|unitCostCents|allocationQuantity/);
});

test("oferta elegível disponibiliza distribuidor com estoque físico zero e mantém ofertas inválidas no final", async () => {
  const now = Date.now();
  const offer = { id: "offer", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 1000,
    retailCeilingCents: 2000, available: true, stockQuantity: 10, allocationQuantity: 5,
    reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 1000), validUntil: new Date(now + 60_000) };
  const rows = [
    product("offer-unavailable", { inventorySource: "DISTRIBUTOR", ean: "1234567890128", stock: 99, supplierOffers: [{ ...offer, available: false }] }),
    product("offer-available", { inventorySource: "DISTRIBUTOR", ean: "1234567890128", stock: 0, supplierOffers: [offer] }),
    product("physical-available"),
  ];
  const before = JSON.stringify(rows);
  const service = await fixture({
    $queryRaw: async () => rows.map(row => ({ id: row.id, total: rows.length })),
    product: { findMany: async () => rows },
  });
  const result = await service.getSearchCatalog("losartana", { relatedLimit: 0 });
  assert.deepEqual(Array.from(result.products, row => row.id), ["offer-available", "physical-available", "offer-unavailable"]);
  assert.ok(result.products[0].stock > 0);
  assert.equal(result.products[2].stock, 0);
  assert.equal(JSON.stringify(rows), before, "ordenação não altera dados comerciais de origem");
});

test("busca preserva relevância dentro da disponibilidade e não expõe foto privada/ofertas", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return queries.length === 1 ? [{ id: "b", total: 30 }, { id: "a", total: 30 }] : []; },
    product: { findMany: async () => [product("a"), product("b", { inventorySource: "DISTRIBUTOR", supplierOffers: [], imageUrl: "/api/admin/fornecedores/imagens/private.webp" })] },
  });
  const result = await service.getSearchCatalog("losartana 50 mg (Corus)");
  assert.equal(result.count, 2);
  assert.deepEqual(Array.from(result.products, row => row.id), ["a", "b"]);
  assert.equal(result.products[0].imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.equal(result.products[1].imageUrl, "/brand/medicamento-ilustrativo.webp");
  assert.doesNotMatch(JSON.stringify(result.products), /\/public\.webp|\/api\/admin\/fornecedores\/imagens\//);
  assert.equal("supplierOffers" in result.products[0], false);
  assert.doesNotMatch(queries[0].text, /LIMIT|OFFSET/, "limites somente após disponibilidade vendável global");
  assert.ok(queries[0].values.includes("(^| )50 ?mg($| )"));
  assert.ok(queries[0].values.includes("(^| )corus"));
});

test("texto de busca nunca vira SQL e consulta vazia não usa banco", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  assert.equal((await service.getSearchCatalog(" + ")).count, 0);
  assert.equal(queries.length, 0);
  await service.getSearchCatalog("losartana'); DROP TABLE Product; --");
  assert.equal(queries.length, 1);
  assert.doesNotMatch(queries[0].text, /DROP TABLE/);
  assert.ok(queries[0].values.some(value => String(value).includes("drop table")));
});

test("busca GTIN usa identidade cadastrada parametrizada, prioriza exatos e preserva filtros e limites", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return [{ id: "ean", total: 1 }]; },
    product: { findMany: async ({ where }: { where: { status: string } }) => {
      assert.equal(where.status, "ACTIVE");
      return [product("ean", { ean: "7896004724577", imageUrl: "/api/admin/fornecedores/imagens/private.webp" })];
    } },
  });
  for (const [query, canonical, variant] of [
    ["78923454", "00000078923454", "78923454"],
    ["0036000291452", "00036000291452", "036000291452"],
    ["07896004724577", "07896004724577", "7896004724577"],
    ["17896004724574", "17896004724574", "17896004724574"],
  ]) {
    const result = await service.getSearchCatalog(query, { pageSize: 100, relatedLimit: 0 });
    const sql = queries.at(-1)!;
    assert.match(sql.text, /p\."status" = 'ACTIVE' AND/);
    assert.match(sql.text, /p\."eanNormalized" = \$\d+/);
    assert.match(sql.text, /p\."ean" IN \(/);
    assert.match(sql.text, /ORDER BY CASE\s+WHEN .*p\."eanNormalized"[\s\S]+THEN 1000/);
    assert.ok(sql.values.includes(canonical));
    assert.ok(sql.values.includes(variant));
    assert.doesNotMatch(sql.text, new RegExp(query));
    assert.equal(result.products.length, 1);
    assert.equal(result.correctedQuery, null);
    assert.doesNotMatch(JSON.stringify(result.products), /\/api\/admin\/fornecedores\/imagens\//);
  }
  const packaging = queries.at(-1)!;
  assert.equal(packaging.values.includes("7896004724577"), false);
});

test("correção usa vocabulário ativo em cache e mantém dose no SQL parametrizado", async () => {
  const queries: Prisma.Sql[] = [];
  let vocabularyReads = 0;
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => {
      queries.push(sql);
      return sql.values.includes("(^| )losartana") ? [{ id: "match", total: 48 }] : [];
    },
    product: { findMany: async ({ select, where }: { select: Record<string, unknown>; where: Record<string, unknown> }) => {
      assert.equal(where.status, "ACTIVE");
      if (!select.id) vocabularyReads++;
      return [product("match")];
    } },
  });
  const result = await service.getSearchCatalog("losartna 50mg", { relatedLimit: 0 });
  assert.equal(result.correctedQuery, "losartana 50mg");
  assert.equal(result.count, 1);
  assert.equal(result.products[0].id, "match");
  assert.ok(queries.at(-1)!.values.includes("(^|[^0-9.,])50\\s*mg($|[^a-z0-9])"));
  await service.getSearchCatalog("losartnaa 50mg", { relatedLimit: 0 });
  assert.equal(vocabularyReads, 1, "consultas próximas compartilham somente o vocabulário, não preços ou estoque");
});

test("página fora da faixa não troca um literal existente por outro nome aproximado", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return [{ id: "literal", total: 1 }]; },
    product: { findMany: async () => [product("literal", { name: "Diperona 500mg" })] },
  });
  const result = await service.getSearchCatalog("diperona", { page: 2, relatedLimit: 0 });
  assert.equal(result.products.length, 0);
  assert.equal(result.correctedQuery, null);
  assert.ok(queries.every(sql => !sql.values.includes("(^| )dipirona")));
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
