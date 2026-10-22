import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { groupCategoryNames, catalogGroup } from "./home-shortcuts";

async function fixture(rows: object[], brands: { brand: string | null; category?: string; requiresPrescription?: boolean; catalogClassification?: unknown }[] = []) {
  let query: Record<string, unknown> = {};
  const queries: Record<string, unknown>[] = [];
  const db = { product: { fields: { price: "fixture-price" }, count: async () => rows.length, findMany: async (input: Record<string, unknown>) => { queries.push(input); if ((input.select as { brand?: boolean; id?: boolean }).brand && !(input.select as { id?: boolean }).id) return brands; query = input; return input.take ? rows.slice(Number(input.skip ?? 0), Number(input.skip ?? 0) + Number(input.take)) : rows; } } };
  const bundle = await build({ entryPoints: ["src/features/products/storefront.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "storefront-db", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>fixture.db;" }));
  } }] });
  const loaded = { exports: {} as typeof import("./storefront") };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: { db }, URL });
  return { service: loaded.exports, query: () => query, queries };
}

test("grupo Medicamentos abrange genéricos, similares, éticos e MIP sem inventar categorias", () => {
  const names = ["Medicamentos", "Genéricos", "Similares", "Éticos", "Medicamentos MIP", "Perfumaria"];
  assert.deepEqual(groupCategoryNames(names.map(name => ({ name })), "medicines"), names.slice(0, -1));
  assert.equal(catalogGroup("invalid"), undefined);
  assert.equal(catalogGroup(["medicines"]), undefined);
});

test("categoria Medicamentos reúne singular e plural preservando os nomes originais do filtro", async () => {
  const { service, query } = await fixture(["Medicamento", "Medicamentos", " MEDICAMENTO ", "Medicamentos MIP", "Perfumaria"].map((category, i) => ({ category, id: String(i), name: `Produto ${i}`, stock: 1, price: "1", promotionalPrice: null })));
  const categories = await service.getPublicCategories();
  assert.equal(categories.filter(category => category.slug === "medicamentos").length, 1);
  assert.equal(categories.some(category => category.slug === "medicamento"), false);
  const medicines = categories.find(category => category.slug === "medicamentos")!;
  assert.equal(medicines.name, "Medicamentos");
  assert.deepEqual(Array.from(medicines.names), ["Medicamento", "Medicamentos", " MEDICAMENTO "]);
  assert.equal(categories.find(category => category.slug === "medicamentos-mip")?.name, "Medicamentos MIP");
  await service.getStorefrontProducts({ categories: medicines.names });
  assert.equal(JSON.stringify((query().where as { category: unknown }).category), JSON.stringify({ in: medicines.names }));
});

test("marcas consultam publicados e metadados mínimos sem perder registros conflitantes", async () => {
  const { service, queries } = await fixture([], [{ brand: "Marca Nova" }, { brand: "marca nova" }, { brand: null }]);
  const brands = await service.getPublicBrands();
  assert.equal(brands.length, 1);
  assert.equal(brands[0].name, "Marca Nova");
  assert.equal(JSON.stringify(queries[0]), JSON.stringify({ where: { status: "ACTIVE", brand: { not: null } }, select: { brand: true, category: true, requiresPrescription: true, catalogClassification: true }, orderBy: { brand: "asc" } }));
});

test("consulta de marcas separa laboratórios de medicamentos sem alterar filtro direto", async () => {
  const { service, query } = await fixture([], [
    { brand: "Aradois", catalogClassification: { kind: "MEDICINE" } },
    { brand: "Angipress", requiresPrescription: true },
    { brand: "EMS", requiresPrescription: true },
    { brand: "Aché", catalogClassification: { kind: "MEDICINE" } },
    { brand: "Marca desconhecida", category: "Medicamentos" },
    { brand: "Marca Mista", category: "Perfumaria" },
    { brand: "Marca Mista", catalogClassification: { kind: "MEDICINE" } },
    { brand: "Marca Nova sem logo", category: "Perfumaria" },
  ]);
  assert.deepEqual(Array.from(await service.getPublicBrands(), brand => brand.name), ["Aché", "EMS", "Marca Nova sem logo"]);
  await service.getStorefrontProducts({ brand: "Aradois" });
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE", brand: { in: ["Aradois"] } }));
});

test("marca filtra variantes exatas e marca desconhecida mantém filtro vazio", async () => {
  const { service, query } = await fixture([], [{ brand: "Água & Sol" }, { brand: " agua sol " }, { brand: "Agua Sol Extra" }]);
  await service.getStorefrontProducts({ brand: "AGUA SOL", sort: "preco-asc", categories: ["Perfumaria"] });
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE", category: { in: ["Perfumaria"] }, brand: { in: ["Água & Sol", " agua sol "] } }));
  await service.getStorefrontProducts({ brand: "Marca inexistente", sort: "preco-asc" });
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE", brand: { in: [] } }));
  assert.equal(service.catalogPageHref("/catalogo?grupo=medicines&ordem=preco-asc&marca=Marca+Nova", 2), "/catalogo?grupo=medicines&ordem=preco-asc&marca=Marca+Nova&pagina=2");
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

test("catálogo inteiro coloca disponíveis antes dos indisponíveis, inclusive entre páginas", async () => {
  const unavailable = Array.from({ length: 5 }, (_, i) => ({ id: `a-${i}`, name: `A indisponível ${i}`, stock: 0, price: "1.00", promotionalPrice: null }));
  const available = Array.from({ length: 27 }, (_, i) => ({ id: `z-${i}`, name: `Z disponível ${String(i).padStart(2, "0")}`, stock: 2, price: "10.00", promotionalPrice: null }));
  const { service } = await fixture([...unavailable, ...available]);
  const first = await service.getStorefrontProducts();
  const second = await service.getStorefrontProducts({ page: 2 });
  assert.equal(first.count, 32);
  assert.equal(second.count, 32);
  assert.equal(first.products.length, 24);
  assert.equal(second.products.length, 8);
  assert.deepEqual(first.products.map(product => product.id), available.slice(0, 24).map(product => product.id));
  assert.deepEqual(second.products.map(product => product.id), [...available.slice(24), ...unavailable].map(product => product.id));
});

test("disponibilidade comercial usa cotação preservada por demanda antes de ordenar preço", async () => {
  const now = Date.now();
  const offer = { id: "synthetic-offer", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 1000, retailCeilingCents: null, available: true, stockQuantity: null, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 60_000), validUntil: new Date(now + 3_600_000) };
  const rows = [
    { id: "expired", name: "A oferta vencida", inventorySource: "DISTRIBUTOR", ean: "1234567890128", stock: 100, price: "0.50", promotionalPrice: null, supplierOffers: [{ ...offer, validUntil: new Date(now - 1) }] },
    { id: "fresh", name: "Z oferta válida", inventorySource: "DISTRIBUTOR", ean: "1234567890128", stock: 0, price: "99.00", promotionalPrice: null, supplierOffers: [offer] },
    { id: "physical", name: "B estoque físico", inventorySource: "PHARMACY", stock: 2, price: "40.00", promotionalPrice: "20.00" },
  ];
  const { service, query } = await fixture(rows, [{ brand: "Marca sintética" }]);
  for (const options of [{ sort: "preco-asc" as const }, { categories: ["Perfumaria"] }, { group: "beauty" as const }, { brand: "Marca sintética" }]) {
    const result = await service.getStorefrontProducts(options);
    assert.deepEqual(result.products.map(product => product.id), ["expired", "fresh", "physical"]);
    assert.deepEqual(result.products.map(product => product.stock > 0), [true, true, true]);
    assert.equal(result.count, 3);
    assert.equal(query().take, undefined);
  }
  const offers = await service.getStorefrontProducts({ offers: true });
  assert.deepEqual(offers.products.map(product => product.id), ["expired", "physical", "fresh"]);
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE", promotionalPrice: { lt: "fixture-price" } }));
});

test("ordena todos os resultados por preço decrescente e nomes antes de paginar", async () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Produto ${String(i).padStart(2, "0")}`, stock: 2, price: String(i + 1), promotionalPrice: i === 29 ? "1" : null }));
  const { service } = await fixture(rows);
  assert.equal((await service.getStorefrontProducts({ sort: "preco-desc" })).products[0].id, "28");
  assert.equal((await service.getStorefrontProducts({ sort: "nome-desc" })).products[0].id, "29");
  assert.equal((await service.getStorefrontProducts({ sort: "nome-asc", page: 2 })).products[0].id, "24");
  assert.equal(service.catalogPageNumber(["2"]), 1);
  assert.equal(service.catalogPageNumber("Infinity"), 1);
});

test("assunto e busca usam identidade revisada, dose e filtros antes da paginação", async () => {
  const rows = [
    { id: "a", name: "Metformina 500mg", category: "Medicamentos", activeIngredients: ["cloridrato de metformina"], searchTerms: [], price: "10", promotionalPrice: null, stock: 2 },
    { id: "b", name: "Metformina 850mg", category: "Medicamentos", activeIngredients: ["cloridrato de metformina"], searchTerms: [], price: "20", promotionalPrice: null, stock: 2 },
    { id: "c", name: "Produto neutro", category: "Medicamentos", activeIngredients: ["metformina inventada"], searchTerms: [], price: "5", promotionalPrice: null, stock: 2 },
  ];
  const { service } = await fixture(rows);
  assert.deepEqual((await service.getStorefrontProducts({ section: "diabetes", query: "500mg" })).products.map(item => item.id), ["a"]);
  assert.equal((await service.getStorefrontProducts({ query: "pressão baixa" })).count, 0);
});

test("lateral oferece somente subcategorias com produtos publicados compatíveis", async () => {
  const { service } = await fixture([
    { id: "a", name: "Shampoo sintético", category: "Higiene", activeIngredients: [], searchTerms: [], catalogClassification: { kind: "HYGIENE" } },
    { id: "b", name: "Produto sintético", category: "Medicamentos", activeIngredients: ["metformina"], searchTerms: [], catalogClassification: { kind: "MEDICINE" } },
  ]);
  assert.deepEqual(Array.from(await service.getPublicCatalogSections()), ["diabetes", "hair"]);
});

test("indisponíveis continuam visíveis e página fora do catálogo fica vazia", async () => {
  const { service } = await fixture([{ id: "a", name: "A", stock: 0, price: "1", promotionalPrice: null }, { id: "b", name: "B", stock: 0, price: "2", promotionalPrice: null }]);
  const result = await service.getStorefrontProducts();
  assert.equal(result.count, 2);
  assert.deepEqual(result.products.map(product => product.id), ["a", "b"]);
  assert.equal((await service.getStorefrontProducts({ page: 2 })).products.length, 0);
});
