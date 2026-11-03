import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { Prisma } from "@/generated/prisma/client";

function hasDosePattern(sql: Prisma.Sql, name: string) {
  return sql.values.some(value => typeof value === "string" && value.includes("(?!\\s*/)") && new RegExp(value, "i").test(name));
}

test("SQL parametriza equivalência de massa com denominador exato antes da paginação", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  for (const query of ["dipirona 1000mg", "dipirona 1g", "dipirona 1000000mcg"]) {
    await service.getSearchCatalog(query, { relatedLimit: 0 });
    const sql = queries.at(-1)!;
    assert.match(sql.text, /p\."name" ~\* \$\d+/);
    assert.ok(hasDosePattern(sql, "Dipirona 1 g"));
    assert.ok(hasDosePattern(sql, "Dipirona 1000mg"));
    assert.equal(hasDosePattern(sql, "Dipirona 1g/mL"), false);
    assert.equal(hasDosePattern(sql, "Dipirona 500mg"), false);
    assert.doesNotMatch(sql.text, /LIMIT|OFFSET/);
  }
  await service.getSearchCatalog("dipirona 1g/5ml", { relatedLimit: 0 });
  assert.ok(hasDosePattern(queries.at(-1)!, "Dipirona 1000mg/5mL"));
  assert.equal(hasDosePattern(queries.at(-1)!, "Dipirona 1000mg/mL"), false);
});

test("SQL usa os mesmos aliases leve/pague sem interpretar contagens como doses", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  for (const query of ["protex l6p5", "protex leve6pague5", "protex leve 6 pague 5 unidades"]) {
    await service.getSearchCatalog(query, { relatedLimit: 0 });
    const sql = queries.at(-1)!;
    const offer = sql.values.find(value => typeof value === "string" && value.includes("pague"));
    assert.equal(typeof offer, "string");
    const pattern = new RegExp(offer as string);
    for (const name of ["protex l6p5", "protex leve6pague5", "protex leve 6 pague 5 unidades", "sabonete protex balance saudavel85gl6p5"]) assert.ok(pattern.test(name), name);
    assert.equal(pattern.test("protex l6p50"), false);
    assert.equal(pattern.test("protex85gl6p50"), false);
    assert.equal(sql.text.includes("pague"), false, "alias é parâmetro, não trecho de SQL");
    assert.equal(sql.text.includes('p."name" ~*'), false, "contagens da promoção não são doses");
  }
  await service.getSearchCatalog("protex leve6pague5 90g", { relatedLimit: 0 });
  assert.ok(hasDosePattern(queries.at(-1)!, "Protex L6P5 90 g"));
  assert.equal(hasDosePattern(queries.at(-1)!, "Protex L6P5 85 g"), false);
  for (const query of ["protex85g L6P5", "protex85gL6P5"]) {
    await service.getSearchCatalog(query, { relatedLimit: 0 });
    const sql = queries.at(-1)!;
    const name = "Sabonete Protex BALANCE SAUDAVEL85gL6P5";
    assert.ok(hasDosePattern(sql, name));
    const offer = sql.values.find(value => typeof value === "string" && value.includes("pague") && value.startsWith("(^| "));
    assert.equal(typeof offer, "string");
    assert.ok(new RegExp(offer as string).test(name.toLowerCase()));
    assert.equal(hasDosePattern(sql, "Sabonete Protex 90gL6P5"), false);
  }
});

test("SQL reconhece unidades entre as contagens Intimus e mantém filtros posteriores", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  for (const query of ["intimus L16P15", "intimus leve16pague15", "intimus leve16unidadespague15unidades", "intimus leve16unpague15un", "intimus leve16unidadepague15unidade"]) {
    await service.getSearchCatalog(query, { relatedLimit: 0 });
    const sql = queries.at(-1)!;
    const offer = sql.values.find(value => typeof value === "string" && value.startsWith("(^| ") && value.includes("pague"));
    assert.equal(typeof offer, "string");
    const pattern = new RegExp(offer as string);
    assert.ok(pattern.test("absorvente intimus mini leve16unidadespague15unidades"));
    assert.ok(pattern.test("intimus l16p15"));
    assert.equal(pattern.test("intimus l16p150"), false);
    assert.equal(pattern.test("intimus leve16unidadesextraspague15unidades"), false);
    assert.equal(sql.text.includes('p."name" ~*'), false);
  }
  await service.getSearchCatalog("intimus 85gLeve16unidadesPague15unidades", { relatedLimit: 0 });
  assert.ok(hasDosePattern(queries.at(-1)!, "Intimus 85gLeve16unidadesPague15unidades"));
  assert.equal(hasDosePattern(queries.at(-1)!, "Intimus 90gLeve16unidadesPague15unidades"), false);
  await service.getSearchCatalog("intimus leve16unidadespague15unidades 100mg", { relatedLimit: 0 });
  assert.ok(hasDosePattern(queries.at(-1)!, "Intimus L16P15 100mg"));
  assert.equal(hasDosePattern(queries.at(-1)!, "Intimus L16P15 50mg"), false);
});

test("alias inalatório exige Alenia 6/200, par de ingredientes e CMED sem remover os demais filtros", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  await service.getSearchCatalog("Alenia inalação 6/200 refil", { relatedLimit: 0 });
  const sql = queries[0];
  assert.match(sql.text, /cmedReference"->>'presentation'/);
  assert.match(sql.text, /cardinality\(p\."activeIngredients"\) = 2/);
  assert.ok(sql.values.includes("alenia 6 mcg 200 mcg 60 capsulas dura"));
  assert.ok(sql.values.includes("(^| )refil"));
  assert.ok(sql.values.includes("(^| )6[a-z]*($| )"));
  assert.ok(sql.values.includes("(^| )200[a-z]*($| )"));
  await service.getSearchCatalog("budesonida inalação", { relatedLimit: 0 });
  assert.ok(!queries[1].text.includes("cmedReference"), "princípio ativo isolado não ganha alias de apresentação");
});

test("Wimifarma exige identidade estruturada e flexões editoriais usam os mesmos filtros SQL", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  await service.getSearchCatalog("wimifarma", { relatedLimit: 0 });
  assert.match(queries[0].text, /concat_ws\([\s\S]*p\."name"[\s\S]*p\."brand"[\s\S]*p\."searchTerms"/);
  assert.doesNotMatch(queries[0].text, /p\."description"/);
  await service.getSearchCatalog("haste flexível", { relatedLimit: 0 });
  await service.getSearchCatalog("hastes flexíveis", { relatedLimit: 0 });
  for (const sql of queries.slice(1)) {
    assert.ok(sql.values.includes("(^| )(haste|hastes)($| )"));
    assert.ok(sql.values.includes("(^| )(flexivel|flexiveis)($| )"));
  }
});

const product = (id: string, extra = {}) => ({
  id, name: `Losartana 50mg ${id}`, slug: id, stock: 3, price: "10.00", promotionalPrice: null,
  activeIngredients: ["losartana potássica"], inventorySource: "PHARMACY", imageUrl: "/public.webp",
  requiresPrescription: true, ...extra,
});

test("Extra G normaliza como XG no SQL e não vira um filtro extra", async () => {
  const queries: Prisma.Sql[] = [];
  const service = await fixture({ $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return []; }, product: { findMany: async () => [] } });
  await service.getSearchCatalog("fralda Extra G", { relatedLimit: 0 });
  assert.ok(queries[0].text.includes("extra[ ]*g"));
  assert.ok(queries[0].values.includes("(^| )xg($| )"));
  assert.ok(!queries[0].values.includes("(^| )extra"));
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

test("tamanho de fralda ordena antes da relevância no SQL sem filtrar alternativas ou antecipar indisponíveis", async () => {
  const queries: Prisma.Sql[] = [];
  const rows = [
    product("g-unavailable", { name: "Fralda geriátrica G", stock: 0, activeIngredients: [] }),
    product("g", { name: "Fralda geriátrica B G", activeIngredients: [] }),
    product("xg", { name: "Fralda geriátrica A XG", activeIngredients: [] }),
    product("m", { name: "Fralda geriátrica M", activeIngredients: [] }),
  ];
  const service = await fixture({
    $queryRaw: async (sql: Prisma.Sql) => { queries.push(sql); return rows.map(row => ({ id: row.id, total: rows.length })); },
    product: { findMany: async () => [...rows].reverse() },
  });
  const result = await service.getSearchCatalog("fralda geriátrica G", { relatedLimit: 0 });
  assert.deepEqual(Array.from(result.products, row => row.id), ["g", "xg", "m", "g-unavailable"]);
  const query = queries[0];
  assert.match(query.text, /ORDER BY CASE WHEN regexp_replace[\s\S]+THEN 1 ELSE 0 END DESC, CASE/);
  assert.ok(query.text.includes("\\m[0-9]+[ ]*g\\M"), "massa em gramas é excluída da preferência de tamanho");
  assert.equal(query.values.filter(value => value === "(^| )g($| )").length, 1, "limites de palavra são usados somente na ordenação");
  assert.ok(!query.values.includes("(^| )g"), "G não filtra os demais tamanhos");
  assert.equal(result.count, 4);
});

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
  assert.ok(hasDosePattern(queries[0], "Losartana 50 mg"));
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
  assert.ok(hasDosePattern(queries.at(-1)!, "Losartana 50 mg"));
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
  assert.ok(hasDosePattern(queries[0], "Losartana 50 mg"));
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
