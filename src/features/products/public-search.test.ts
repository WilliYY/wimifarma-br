import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProductSearchText,
  parseProductTerms,
  rankProductsForQuery,
  rankRelatedProducts,
} from "./public-search";

test("normaliza termos, remove repeticoes e preserva a grafia de exibicao", () => {
  assert.deepEqual(
    parseProductTerms("Paracetamol, cafeína; PARACETAMOL\nFenilefrina"),
    ["Paracetamol", "cafeína", "Fenilefrina"],
  );
});

test("monta texto pesquisavel sem acentos a partir dos dados do produto", () => {
  assert.equal(
    buildProductSearchText({
      activeIngredients: ["Maleato de clorfeniramina"],
      brand: "Cimed",
      category: "Gripes e resfriados",
      description: "Alívio dos sintomas",
      ean: "7890000000000",
      name: "Cimegripe 20 cápsulas",
      searchTerms: ["gripe", "resfriado"],
      sku: "CIM-20",
    }),
    "cimegripe 20 capsulas cimed gripes e resfriados alivio dos sintomas 7890000000000 cim 20 maleato de clorfeniramina gripe resfriado",
  );
});

test("prioriza nome exato e inicio do nome antes de outras ocorrencias", () => {
  const products = [
    { id: "description", name: "Outro produto", searchText: "outro produto cimegripe" },
    { id: "prefix", name: "Cimegripe 20cp", searchText: "cimegripe 20cp" },
    { id: "exact", name: "Cimegripe", searchText: "cimegripe" },
  ];

  assert.deepEqual(
    rankProductsForQuery(products, "cimégrípe").map((product) => product.id),
    ["exact", "prefix", "description"],
  );
});

test("correlaciona primeiro por principio ativo, depois por termo e categoria", () => {
  const source = {
    activeIngredients: ["Paracetamol", "Fenilefrina"],
    category: "Gripes e resfriados",
    id: "source",
    name: "Produto principal",
    searchTerms: ["gripe"],
  };
  const candidates = [
    {
      activeIngredients: [],
      category: "Gripes e resfriados",
      id: "category",
      name: "Mesma categoria",
      searchTerms: [],
    },
    {
      activeIngredients: [],
      category: "Outros",
      id: "term",
      name: "Mesmo termo",
      searchTerms: ["gripe"],
    },
    {
      activeIngredients: ["Paracetamol"],
      category: "Outros",
      id: "ingredient",
      name: "Mesmo principio",
      searchTerms: [],
    },
    source,
  ];

  assert.deepEqual(
    rankRelatedProducts(source, candidates).map((product) => product.id),
    ["ingredient", "term", "category"],
  );
});
