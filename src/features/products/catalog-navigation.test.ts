import assert from "node:assert/strict";
import test from "node:test";
import { catalogCategoryGroups, catalogFilters, catalogFilterHref, catalogPagination, catalogSections, matchesCatalogSection, sortCatalogProducts } from "./catalog-navigation";

test("normaliza parâmetros ambíguos e inválidos sem conservar página ao trocar filtro", () => {
  assert.deepEqual(catalogFilters({ pagina: ["2", "3"], ordem: "invalid", grupo: "invalid", marca: ["A"], assunto: "unknown" }), { page: 1, sort: "relevantes", group: undefined, brand: undefined, query: undefined, section: undefined, offers: false });
  const href = catalogFilterHref("/categorias/dermo?q=pele&marca=Marca&ordem=preco-desc&ofertas=1&pagina=4", { grupo: "beauty", assunto: "hair" });
  assert.equal(href, "/catalogo?q=pele&marca=Marca&ordem=preco-desc&ofertas=1&grupo=beauty&assunto=hair");
});

test("lateral reúne variações de higiene e preserva categorias fora dos grupos", () => {
  const categories = ["Higiene", "Higiene pessoal", "Higiene e beleza", "Primeiros socorros"].map(name => ({ name, names: [name], slug: name }));
  const result = catalogCategoryGroups(categories);
  assert.deepEqual(result.groups.find(group => group.id === "beauty")?.categories.map(category => category.name), ["Higiene", "Higiene pessoal", "Higiene e beleza"]);
  assert.deepEqual(result.others.map(category => category.name), ["Primeiros socorros"]);
});

test("paginação exibe janela inicial, atual e final com extremos e reticências", () => {
  assert.deepEqual(catalogPagination(1, 25), [1, 2, 3, 4, 5, 6, "gap-6", 25]);
  assert.deepEqual(catalogPagination(13, 25), [1, "gap-1", 11, 12, 13, 14, 15, "gap-15", 25]);
  assert.deepEqual(catalogPagination(25, 25), [1, "gap-1", 20, 21, 22, 23, 24, 25]);
  assert.deepEqual(catalogPagination(4, 4), [1, 2, 3, 4]);
});

test("ordena pelo preço comercial e pelo nome sem modificar a lista original", () => {
  const products = [{ id: "b", name: "Banho", price: "50", promotionalPrice: "2", stock: 1 }, { id: "a", name: "Água", price: "10", promotionalPrice: null, stock: 1 }];
  assert.deepEqual(sortCatalogProducts(products, "preco-asc").map(p => p.id), ["b", "a"]);
  assert.deepEqual(sortCatalogProducts(products, "preco-desc").map(p => p.id), ["a", "b"]);
  assert.deepEqual(sortCatalogProducts(products, "nome-asc").map(p => p.id), ["a", "b"]);
  assert.deepEqual(sortCatalogProducts(products, "nome-desc").map(p => p.id), ["b", "a"]);
  assert.equal(products[0].id, "b");
});

test("subcategorias usam curadoria clínica existente e apresentação de cuidados sem classificar medicamentos", () => {
  const diabetes = catalogSections.find(s => s.id === "diabetes")!;
  const hair = catalogSections.find(s => s.id === "hair")!;
  const base = { id: "x", name: "Produto", category: "Medicamentos", activeIngredients: ["cloridrato de metformina"], searchTerms: [] };
  assert.equal(matchesCatalogSection(base, diabetes), true);
  assert.equal(matchesCatalogSection({ ...base, activeIngredients: ["metformina inventada"] }, diabetes), false);
  assert.equal(matchesCatalogSection({ ...base, name: "Shampoo 200ml", category: "Higiene" }, hair), true);
  assert.equal(matchesCatalogSection({ ...base, name: "Shampoo 200ml", catalogClassification: { kind: "MEDICINE" } }, hair), false);
});

test("Perfumes não confunde características de fragrância com o tipo do produto", () => {
  const perfume = catalogSections.find(section => section.id === "perfume")!;
  for (const name of [
    "Desodorante Rexona Aerossol Clinical Sem Perfume 150ml",
    "Desodorante Roll-on Com Perfume 50ml",
    "Desodorante Aerossol Perfume Suave 150ml",
    "Antitranspirante Perfume Floral 150ml",
    "Sabonete Com Perfume de Colônia 90g",
    "Shampoo Perfume Prolongado 200ml",
    "Creme Hidratante Perfume Floral 200ml",
    "Creme Corporal Com Perfume 200ml",
    "Loção Corporal Perfume Floral 200ml",
    "Óleo de Banho Perfume Floral 200ml",
    "Lenços Umedecidos Com Perfume 50 Unidades",
    "Talco Perfume Floral 100g",
    "Cuidados Sem Perfume 100ml",
    "Cuidados Livre de Perfume 100ml",
    "Cuidados Isento de Perfume 100ml",
  ]) {
    assert.equal(matchesCatalogSection({ id: "care", name, category: "Higiene pessoal" }, perfume), false, name);
  }
});

test("Perfumes preserva perfumes e colônias, inclusive desodorante colônia", () => {
  const perfume = catalogSections.find(section => section.id === "perfume")!;
  for (const name of [
    "Perfume Floral 50ml",
    "Perfume Sólido em Creme 10g",
    "Colônia Infantil 100ml",
    "Desodorante Colônia Floral 100ml",
    "Colônia Desodorante Floral 100ml",
    "Fragrância Eau de Parfum 50ml",
    "Fragrância Eau de Toilette 100ml",
    "Fragrância Eau de Cologne 100ml",
  ]) {
    assert.equal(matchesCatalogSection({ id: "fragrance", name, category: "Perfumaria" }, perfume), true, name);
  }
});

test("o desodorante sem perfume continua na seção Desodorantes", () => {
  const deodorant = catalogSections.find(section => section.id === "deodorant")!;
  assert.equal(matchesCatalogSection({ id: "rexona", name: "Desodorante Rexona Aerossol Clinical Sem Perfume 150ml", category: "Higiene pessoal" }, deodorant), true);
});
