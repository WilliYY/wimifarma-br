import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { groupCategoryNames, catalogGroup } from "./home-shortcuts";
import type { PublicCatalogIdentity } from "../catalog-identities/types";

function matchesWhere(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Record<string, unknown>[]).some(clause => matchesWhere(row, clause));
    if (key === "AND") return (value as Record<string, unknown>[]).every(clause => matchesWhere(row, clause));
    if (typeof value !== "object" || value === null) return row[key] === value;
    const filter = value as { in?: unknown[]; contains?: string; equals?: unknown; path?: string[] };
    if (filter.in) return filter.in.includes(row[key]);
    if (filter.contains !== undefined) return String(row[key] ?? "").toLowerCase().includes(filter.contains.toLowerCase());
    if (filter.path) return filter.path.reduce<unknown>((current, part) => (current as Record<string, unknown> | null)?.[part], row[key]) === filter.equals;
    return true;
  });
}

async function fixture(rows: object[], brands: Parameters<typeof import("./brands").buildPublicBrands>[0] = [], validPhotos: string[] = [], respectSelect = false, respectWhere = false, identities: PublicCatalogIdentity[] = []) {
  let query: Record<string, unknown> = {};
  const queries: Record<string, unknown>[] = [];
  const photoChecks: (string | null)[][] = [];
  const db = { product: { fields: { price: "fixture-price" }, count: async () => rows.length, findMany: async (input: Record<string, unknown>) => { queries.push(input); if ((input.select as { brand?: boolean; id?: boolean }).brand && !(input.select as { id?: boolean }).id) return brands; query = input; const matching = respectWhere ? rows.filter(row => matchesWhere(row as Record<string, unknown>, input.where as Record<string, unknown>)) : rows; const selected = input.take ? matching.slice(Number(input.skip ?? 0), Number(input.skip ?? 0) + Number(input.take)) : matching; return respectSelect ? selected.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => (input.select as Record<string, unknown>)[key] === true))) : selected; } } };
  const bundle = await build({ entryPoints: ["src/features/products/storefront.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "storefront-db", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|home-photos$|catalog-identities\/public-query$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("public-query") ? "export const getPublicCatalogIdentities=async()=>fixture.identities;" : args.path.endsWith("home-photos") ? "export const validatedHomePhotos=async urls=>{fixture.photoChecks.push(urls);return new Set(urls.filter(url=>fixture.validPhotos.includes(url)))};" : "export const getPrisma=()=>fixture.db;" }));
  } }] });
  const loaded = { exports: {} as typeof import("./storefront") };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: { db, validPhotos, photoChecks, identities }, URL });
  return { service: loaded.exports, query: () => query, queries, photoChecks };
}

test("catálogo misto pagina depois da mesclagem e não insere consultas nas ofertas ou marcas inferidas", async () => {
  const identity: PublicCatalogIdentity = { kind: "CONSULTATION", id: "catalog:07891800002829", gtinCanonical: "07891800002829", ean: "7891800002829", name: "Shampoo sintético", categoryName: "Higiene", categorySlug: "higiene", href: "/catalogo/item/7891800002829" };
  const rows = Array.from({ length: 24 }, (_, i) => ({ id: `sale-${i}`, name: `Shampoo ${i}`, category: "Higiene", activeIngredients: [], searchTerms: [], stock: 1, price: "10", promotionalPrice: null }));
  const { service } = await fixture(rows, [], [], false, false, [identity]);
  const result = await service.getPublicStorefrontProducts({ page: 2 });
  assert.equal(result.count, 25);
  assert.deepEqual(Array.from(result.products, item => item.id), [identity.id]);
  assert.equal("price" in result.products[0], false);
  assert.equal((await service.getStorefrontProducts({ page: 2 })).products.length, 0, "home/ofertas mantêm somente contratos comerciais");
  assert.equal((await service.getPublicStorefrontProducts({ offers: true })).products.some(item => item.id === identity.id), false);
  assert.equal((await service.getPublicStorefrontProducts({ brand: "Laboratório" })).products.some(item => item.id === identity.id), false);
  assert.ok((await service.getPublicStorefrontProducts({ group: "beauty", section: "hair", page: 2 })).products.some(item => item.id === identity.id));
});

test("mesmo SKU Bepantol Baby permanece na marca, Infantil e Cuidados infantis com SQL filtrando candidatos", async () => {
  const base = { status: "ACTIVE", stock: 5, price: "10", promotionalPrice: null, requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "UNREVIEWED", catalogClassification: { kind: "HYGIENE" }, activeIngredients: [], searchTerms: [] };
  const rows = [
    { ...base, id: "wipes", brand: "Bepantol", name: "Lenços Umedecidos Bepantol Baby Leve 96 Pague 80 unidades", category: "Lenços e toalhas umedecidas" },
    { ...base, id: "cream", brand: "Bepantol Baby", name: "Creme Bepantol Baby 30 g", category: "Infantil" },
    { ...base, id: "derma", brand: "Bepantol Derma", name: "Creme Bepantol Derma 20 g", category: "Dermo" },
    { ...base, id: "adult", brand: "Bepantol", name: "Lenços Umedecidos Bepantol Adulto 48 unidades", category: "Lenços e toalhas umedecidas" },
    { ...base, id: "adult-baby", brand: "Outra", name: "Lenços Baby para adultos 48 unidades", category: "Lenços e toalhas umedecidas" },
    { ...base, id: "medicine", brand: "Outra", name: "Creme Baby medicamento", category: "Medicamentos", requiresPrescription: true },
  ];
  const { service } = await fixture(rows, rows, [], true, true);
  for (const filters of [{ brand: "Bepantol Baby" }, { brand: "Bepantol", group: "baby" as const }, { brand: "Bepantol Baby", group: "baby" as const, section: "baby-care" }, { group: "baby" as const }]) {
    const result = await service.getStorefrontProducts(filters);
    assert.deepEqual(Array.from(result.products, row => row.id).sort(), ["cream", "wipes"], JSON.stringify(filters));
    assert.equal(result.count, 2);
    assert.equal(new Set(result.products.map(row => row.id)).size, 2);
  }
});

test("seção Cuidados infantis considera lenços Baby mesmo quando não existe categoria Infantil", async () => {
  const row = { id: "wipes-only", status: "ACTIVE", name: "Lenços Umedecidos", brand: "Bepantol Baby", category: "Lenços e toalhas umedecidas", stock: 1, price: "10", promotionalPrice: null, activeIngredients: [], searchTerms: [], catalogClassification: { kind: "HYGIENE" }, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
  const { service } = await fixture([row], [row], [], true, true);
  assert.ok((await service.getPublicCatalogSections()).includes("baby-care"));
  const result = await service.getStorefrontProducts({ group: "baby", section: "baby-care" });
  assert.equal(result.count, 1);
  assert.equal(result.products[0].id, "wipes-only");
});

test("recuperação SQL e seção preservam as flexões infantis e bebês aceitas no público infantil", async () => {
  for (const name of ["Lenços umedecidos infantis", "Sabonete para bebês", "Óleo infantil", "Creme hidratante"]) {
    const row = { id: "infant-care", status: "ACTIVE", name, brand: name === "Creme hidratante" ? "Bepantol Baby" : "Marca sintética", category: "Higiene", stock: 1, price: "10", promotionalPrice: null, activeIngredients: [], searchTerms: [], catalogClassification: { kind: "HYGIENE" }, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
    const { service } = await fixture([row], [row], [], true, true);
    assert.ok((await service.getPublicCatalogSections()).includes("baby-care"), name);
    assert.equal((await service.getStorefrontProducts({ group: "baby", section: "baby-care" })).count, 1, name);
  }
});

test("Vitaminas aplica a identidade antes da contagem e paginação sem absorver whey e creatina", async () => {
  const base = { category: "Suplementos", brand: "Marca sintética", inventorySource: "PHARMACY", catalogClassification: { kind: "SUPPLEMENT" }, stock: 10, price: "10.00", promotionalPrice: null, activeIngredients: [], searchTerms: [], searchText: "", requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
  const names = [...Array.from({ length: 25 }, () => "Centrum Essencial 30 comprimidos"), ...Array.from({ length: 3 }, () => "Vitamina C 500mg 30 comprimidos"), "Whey Protein 900g", "Creatina 300g", "Suplemento proteico 30 cápsulas"];
  const rows = names.map((name, index) => ({ ...base, id: `synthetic-${index}`, slug: `synthetic-${index}`, name }));
  const { service, queries } = await fixture(rows);
  const all = await service.getStorefrontProducts({ group: "vitamins" });
  const first = await service.getStorefrontProducts({ group: "vitamins", section: "vitamins" });
  const second = await service.getStorefrontProducts({ group: "vitamins", section: "vitamins", page: 2 });
  assert.equal(all.count, 31);
  assert.equal(first.count, 28);
  assert.equal(second.count, 28);
  assert.equal(first.products.length, 24);
  assert.equal(second.products.length, 4);
  assert.equal(new Set([...first.products, ...second.products].map(row => row.id)).size, 28);
  assert.equal([...first.products, ...second.products].filter(row => row.name.startsWith("Centrum Essencial")).length, 25);
  assert.ok([...first.products, ...second.products].every(row => !/whey|creatina|proteico/i.test(row.name)));
  assert.ok(queries.filter(query => (query.select as { id?: boolean })?.id).every(query => !query.take && !query.skip), "SQL retrieves the group before the shared JS predicate and pagination");
});

test("seções globais preservam os bloqueios de receita com Prisma que respeita select e categorias vazias", async () => {
  const base = { id: "synthetic-centrum", name: "Centrum Essencial 30 comprimidos", category: "Suplementos" as string | null, catalogClassification: { kind: "SUPPLEMENT" }, stock: 10, price: "10.00", promotionalPrice: null, activeIngredients: [], searchTerms: [], requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
  const row = { ...base };
  const { service } = await fixture([row], [], [], true);
  assert.ok((await service.getPublicCatalogSections()).includes("vitamins"));
  for (const conflict of [{ requiresPrescription: true }, { prescriptionType: "ORDINARY" }, { prescriptionType: "ANTIMICROBIAL" }, { prescriptionType: "CONTROLLED" }, { isPopularPharmacy: true }]) {
    Object.assign(row, base, conflict);
    assert.equal((await service.getPublicCatalogSections()).includes("vitamins"), false, JSON.stringify(conflict));
    assert.equal((await service.getStorefrontProducts({ section: "vitamins" })).count, 0, JSON.stringify(conflict));
  }
  for (const category of [null, "", "  "]) {
    Object.assign(row, base, { category });
    assert.equal((await service.getPublicCatalogSections()).includes("vitamins"), false, `category=${String(category)}`);
  }
  Object.assign(row, base);
  assert.ok((await service.getPublicCatalogSections()).includes("vitamins"));
});

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
  const photo = "/uploads/products/new-brand.webp";
  const { service, queries } = await fixture([], [{ brand: "Marca Nova", imageUrl: photo, imageAsset: { url: photo } }, { brand: "marca nova" }, { brand: null }], [photo]);
  const brands = await service.getPublicBrands();
  assert.equal(brands.length, 1);
  assert.equal(brands[0].name, "Marca Nova");
  assert.equal(JSON.stringify(queries[0]), JSON.stringify({ where: { status: "ACTIVE", brand: { not: null } }, select: { brand: true, name: true, category: true, requiresPrescription: true, isPopularPharmacy: true, catalogClassification: true }, orderBy: { brand: "asc" } }));
});

test("marcas não consultam nem repassam fotos de embalagens", async () => {
  const photo = "/uploads/products/synthetic.webp";
  const missing = "/uploads/products/missing.webp";
  const { service, photoChecks } = await fixture([], [
    { brand: "Johnson’s Baby", name: "Sabonete sintético", category: "Perfumaria", imageUrl: photo, imageAsset: { url: photo } },
    { brand: "Johnson’s", name: "Outro sabonete", category: "Perfumaria", imageUrl: photo, imageAsset: { url: photo } },
    { brand: "Outra", name: "Hidratante sintético", imageUrl: missing, imageAsset: { url: missing } },
  ], [photo]);
  const brands = await service.getPublicBrands();
  assert.equal(brands.filter(brand => brand.key === "johnson s").length, 1);
  assert.equal(brands.find(brand => brand.key === "johnson s")?.imageUrl, undefined);
  assert.equal(brands.find(brand => brand.key === "outra")?.imageUrl, undefined);
  assert.equal(photoChecks.length, 0);
});

test("cartão Johnson’s e link antigo Baby consultam todas as grafias da mesma marca", async () => {
  const { service, query } = await fixture([], [{ brand: "Johnson’s" }, { brand: "Johnson’s Baby" }, { brand: "Johnson & Johnson" }]);
  for (const brand of ["Johnson’s", "Johnson’s Baby"]) {
    await service.getStorefrontProducts({ brand });
    assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE", brand: { in: ["Johnson’s", "Johnson’s Baby"] } }));
  }
});

test("existência e ordem das fotos não alteram identidade nem inclusão da marca", async () => {
  const records = ["a", "b"].map(key => ({ brand: "Marca Alternativa", name: `Sabonete ${key}`, category: "Perfumaria", imageUrl: `/uploads/products/${key}.webp`, imageAsset: { url: `/uploads/products/${key}.webp` } }));
  for (const ordered of [records, [...records].reverse()]) {
    const { service, photoChecks } = await fixture([], ordered, ["/uploads/products/b.webp"]);
    const brands = await service.getPublicBrands();
    assert.equal(brands.length, 1);
    assert.equal(brands[0].name, "Marca Alternativa");
    assert.equal(brands[0].imageUrl, undefined);
    assert.equal(photoChecks.length, 0);
  }
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
    { brand: "Marca Nova sem logo", category: "Perfumaria", imageUrl: "/uploads/products/new-brand.webp", imageAsset: { url: "/uploads/products/new-brand.webp" } },
  ], ["/uploads/products/new-brand.webp"]);
  assert.deepEqual(Array.from(await service.getPublicBrands(), brand => brand.name), ["Aché", "EMS", "Marca Nova sem logo"]);
  await service.getStorefrontProducts({ brand: "Aradois" });
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE", brand: { in: ["Aradois"] } }));
});

test("marca elegível sem logo mantém nome sem usar fotos de produtos", async () => {
  const { service } = await fixture([], [{ brand: "Nova sem foto" }, { brand: "Eurofarma", category: "Medicamentos" }, { brand: "Nivea" }]);
  assert.deepEqual(Array.from(await service.getPublicBrands(), brand => brand.name), ["Eurofarma", "Nivea", "Nova sem foto"]);
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
  ].map(row => ({ ...row, status: "ACTIVE", brand: "Marca sintética", category: "Perfumaria" }));
  const { service, query } = await fixture(rows, [{ brand: "Marca sintética" }], [], false, true);
  for (const options of [{ sort: "preco-asc" as const }, { categories: ["Perfumaria"] }, { group: "beauty" as const }, { brand: "Marca sintética" }]) {
    const result = await service.getStorefrontProducts(options);
    assert.deepEqual(result.products.map(product => product.id), ["expired", "fresh", "physical"]);
    assert.deepEqual(result.products.map(product => product.stock > 0), [true, true, true]);
    assert.equal(result.count, 3);
    assert.equal(query().take, undefined);
  }
  const offers = await service.getStorefrontProducts({ offers: true });
  assert.deepEqual(offers.products.map(product => product.id), ["physical"]);
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE" }));
});

test("ofertas usam preço resolvido, PMC atual, disponibilidade e paginação estável", async () => {
  const now = Date.now();
  const ean = "1234567890128";
  const reference = { version: 1, eanNormalized: "01234567890128", product: "MIP sintético", presentation: "10 MG CT 10 COM", laboratory: "Laboratório sintético", registration: "123", sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_sintetica.xlsx/@@download/file", sourceSha256: "a".repeat(64), publishedOn: new Date(now - 86_400_000).toISOString().slice(0, 10), observedAt: new Date(now - 60_000).toISOString(), rates: [{ label: "PMC 20%", cents: 3000 }] };
  const base = { stock: 2, price: "20", promotionalPrice: "10", requiresPrescription: false, isPopularPharmacy: false, activeIngredients: [] };
  const rows: object[] = Array.from({ length: 30 }, (_, index) => ({ ...base, id: `manual-${index}`, name: `Produto ${index}` }));
  rows.push({ ...base, id: "supplier-pmc", name: "MIP sintético", promotionalPrice: null, inventorySource: "DISTRIBUTOR", ean, cmedReference: reference, catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true }, supplierOffers: [{ id: "offer", supplier: "ANB", eanNormalized: reference.eanNormalized, unitCostCents: 1000, substitutionTaxCents: 0, available: true, stockQuantity: 5, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 60_000), validUntil: new Date(now + 3_600_000) }] });
  rows.push(...[
    { id: "expired-pmc", ean, cmedReference: { ...reference, publishedOn: "2020-01-01" }, promotionalPrice: null },
    { id: "unavailable", stock: 0 }, { id: "rx", requiresPrescription: true }, { id: "popular", isPopularPharmacy: true }, { id: "no-discount", promotionalPrice: null },
  ].map(patch => ({ ...base, name: patch.id, ...patch })));
  const { service, query } = await fixture(rows);
  const first = await service.getStorefrontProducts({ offers: true });
  const second = await service.getStorefrontProducts({ offers: true, page: 2 });
  const repeated = await service.getStorefrontProducts({ offers: true });
  assert.equal(first.count, 31);
  assert.equal(first.products.length, 24);
  assert.equal(second.products.length, 7);
  assert.deepEqual(first.products.map(product => product.id), repeated.products.map(product => product.id));
  const all = [...first.products, ...second.products];
  assert.equal(new Set(all.map(product => product.id)).size, 31);
  assert.equal(all.find(product => product.id === "supplier-pmc")?.price, "16.00");
  assert.equal(JSON.stringify(query().where), JSON.stringify({ status: "ACTIVE" }));
  const byPrice = await service.getStorefrontProducts({ offers: true, sort: "preco-desc" });
  assert.equal(byPrice.products[0].id, "supplier-pmc");
  assert.equal((await service.getStorefrontProducts()).count, 36);
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

test("Cabelos usa suas próprias subcategorias sem consulta global ou produtos de Higiene", async () => {
  const row = (id: string, name: string, category: string) => ({ id, name, category, activeIngredients: [], searchTerms: [], price: "10", promotionalPrice: null, stock: 1, catalogClassification: { kind: "HYGIENE" } });
  const { service, queries } = await fixture([row("hair", "Shampoo sintético", "Cabelos")]);
  const selected = await service.getStorefrontProducts({ categories: ["Cabelos"] });
  assert.deepEqual(Array.from(selected.categorySections ?? []), ["hair"]);
  assert.equal(queries.length, 1);
  assert.equal(JSON.stringify((queries[0].where as { category: unknown }).category), JSON.stringify({ in: ["Cabelos"] }));
  const global = await fixture([row("hair", "Shampoo sintético", "Cabelos"), row("soap", "Sabonete sintético", "Higiene"), row("deodorant", "Desodorante sintético", "Higiene")]);
  assert.deepEqual(Array.from(await global.service.getPublicCatalogSections()), ["hair", "bath", "deodorant"]);
});

test("subcategorias da categoria consideram todos os resultados antes de assunto e paginação", async () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: "Shampoo sintético", category: "Higiene", activeIngredients: [], searchTerms: [], price: "10", promotionalPrice: null, stock: 1 }));
  rows.push({ ...rows[0], id: "soap-late", name: "Sabonete sintético" });
  const { service } = await fixture(rows);
  const selected = await service.getStorefrontProducts({ categories: ["Higiene"], section: "hair", page: 1 });
  assert.equal(selected.products.length, 24);
  assert.deepEqual(Array.from(selected.categorySections ?? []), ["hair", "bath"]);
});

test("indisponíveis continuam visíveis e página fora do catálogo fica vazia", async () => {
  const { service } = await fixture([{ id: "a", name: "A", stock: 0, price: "1", promotionalPrice: null }, { id: "b", name: "B", stock: 0, price: "2", promotionalPrice: null }]);
  const result = await service.getStorefrontProducts();
  assert.equal(result.count, 2);
  assert.deepEqual(result.products.map(product => product.id), ["a", "b"]);
  assert.equal((await service.getStorefrontProducts({ page: 2 })).products.length, 0);
});

test("filtros de ofertas refletem a seleção disponível e atalhos abrem o catálogo da categoria", async () => {
  const base = { activeIngredients: [], searchTerms: [], price: "20", promotionalPrice: "15", stock: 2, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, catalogClassification: { kind: "HYGIENE" } };
  const { service } = await fixture([
    { ...base, id: "soap", name: "Sabonete sintético", category: "Higiene" },
    { ...base, id: "adult", name: "Fralda adulta sintética", category: "Fraldas adultas", promotionalPrice: null },
    { ...base, id: "baby", name: "Fralda infantil sintética", category: "Infantil", promotionalPrice: null },
    { ...base, id: "gone", name: "Shampoo sintético", category: "Cabelos", stock: 0 },
    { ...base, id: "rx", name: "Medicamento sintético", category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY", catalogClassification: { kind: "MEDICINE" } },
  ]);
  const result = await service.getStorefrontProducts({ offers: true });
  assert.deepEqual(result.products.map(product => product.id), ["soap"]);
  const navigation = (result as unknown as { offerNavigation: { categories: { name: string }[]; sections: string[]; browseLinks: { label: string; href: string }[] } }).offerNavigation;
  assert.ok(navigation, "Ofertas precisa de filtros próprios, sem categorias globais vazias");
  assert.deepEqual(Array.from(navigation.categories, category => category.name), ["Higiene"]);
  assert.deepEqual(Array.from(navigation.sections), ["bath"]);
  assert.ok(navigation.browseLinks.some(link => link.label === "Higiene e beleza" && link.href === "/catalogo?grupo=beauty"));
  assert.ok(navigation.browseLinks.some(link => link.label === "Infantil" && link.href === "/catalogo?grupo=baby"));
  assert.ok(navigation.browseLinks.some(link => link.label === "Fraldas adultas" && link.href === "/categorias/fraldas-adultas"));
  assert.ok(navigation.browseLinks.every(link => !link.href.includes("ofertas") && !/medicamentos|cabelos/.test(link.href)));
});

test("grupo de beleza preserva a classificação explícita e não traz medicamento categorizado incorretamente", async () => {
  const base = { category: "Higiene", activeIngredients: [], searchTerms: [], price: "10", promotionalPrice: null, stock: 2, requiresPrescription: false };
  const { service } = await fixture([
    { ...base, id: "soap", name: "Sabonete sintético", catalogClassification: { kind: "HYGIENE" } },
    { ...base, id: "medicine", name: "Medicamento sintético", catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", otc: true } },
    { ...base, id: "complete-medicine", name: "Outro medicamento sintético", catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", otc: true, ethical: false } },
    { ...base, id: "rx", name: "Receita sintética", requiresPrescription: true, prescriptionType: "ORDINARY" },
  ]);
  const result = await service.getStorefrontProducts({ group: "beauty" });
  assert.deepEqual(result.products.map(product => product.id), ["soap"]);
});
