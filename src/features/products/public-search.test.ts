import assert from "node:assert/strict";
import test from "node:test";

test("Extra G e ExtraG são XG, separados de G, sem sobrar extra na consulta", () => {
  const products = ["Fralda Bigfral Extra G 10un", "Fralda Bigfral G 10un", "Fralda Bigfral ExtraG 10un", "Fralda Bigfral XG 10un"].map((name, id) => ({ id: String(id), name, searchText: normalizeProductSearch(name) }));
  assert.equal(rankProductsForQuery(products, "fralda G")[0].id, "1");
  for (const query of ["fralda Extra G", "fralda ExtraG", "fralda XG"]) {
    assert.deepEqual(new Set(rankProductsForQuery(products, query).slice(0, 3).map(p => p.id)), new Set(["0", "2", "3"]), query);
  }
});

test("PediaSure recupera e recomenda a própria família em vez de Ensure", () => {
  const source = { id: "source", name: "PediaSure Baunilha 400g", brand: "Abbott", category: "Nutrição", activeIngredients: [], searchTerms: ["baunilha"] };
  const candidates = ["Ensure Baunilha 400g", "PediaSure Chocolate 850g", "PediaSure Morango 400g"].map((name, id) => ({ ...source, name, id: String(id) }));
  assert.deepEqual(relatedProductFamilySearchTerms(source), ["pediasure"]);
  assert.deepEqual(rankRelatedProducts(source, candidates).map(p => p.id), ["1", "2"]);
});
import {
  buildProductSearchText,
  normalizeProductSearch,
  parseProductTerms,
  rankProductsForQuery,
  rankRelatedProducts,
  relatedProductFamilySearchTerms,
  productSearchHref,
  ingredientSearchIdentities,
  isProductAssociation,
  correctProductSearchQuery,
  productSpellingVocabulary,
  productSearchPlan,
  productSearchSize,
} from "./public-search";

test("corrige erros próximos de nomes e marcas sem alterar doses, EAN ou SKU", () => {
  const vocabulary = productSpellingVocabulary([
    { name: "Tadalafila 20 mg", brand: "Geolab" }, { name: "Dipirona 500 mg" },
    { name: "Losartana 50 mg" }, { name: "Sabonete Dove" }, { name: "Bisoprolol 2,5 mg" },
  ]);
  assert.equal(correctProductSearchQuery("tadalaflia 20 mg", vocabulary), "tadalafila 20 mg");
  assert.equal(correctProductSearchQuery("diperona 500mg", vocabulary), "dipirona 500mg");
  assert.equal(correctProductSearchQuery("losartna geolba 50 mg", vocabulary), "losartana geolab 50 mg");
  assert.equal(correctProductSearchQuery("dvoe", vocabulary), "dove");
  assert.equal(correctProductSearchQuery("bisoprlol 2,5 mg", vocabulary), "bisoprolol 2,5 mg");
  for (const query of ["tada", "tadalafila 75mg", "7896181915639", "GEOLBA-123", "GEOLBA_123", "GEOLBA123", "x".repeat(81)]) {
    assert.equal(correctProductSearchQuery(query, vocabulary), null, query);
  }
  assert.equal(correctProductSearchQuery("casa", ["capa", "cama"]), null, "ambiguidade não escolhe uma palavra arbitrária");
});

test("busca aproximada só entra quando não há literal e mantém os filtros de dose e contexto", () => {
  const products = ["Tadalafila 20 mg", "Tadalafila 5 mg", "Bisoprolol 2,5 mg", "Bisoprolol 5 mg", "Dipirona 500 mg", "Diperona especial 500 mg"]
    .map((name, index) => ({ id: String(index), name, searchText: buildProductSearchText({ name, activeIngredients: [], searchTerms: [] }) }));
  assert.deepEqual(rankProductsForQuery(products, "tadalaflia 20mg").map(p => p.id), ["0"]);
  assert.deepEqual(rankProductsForQuery(products, "tadalaflia 75mg"), []);
  assert.deepEqual(rankProductsForQuery(products, "bisoprlol 5mg").map(p => p.id), ["3"]);
  assert.deepEqual(rankProductsForQuery(products, "diperona 500mg").map(p => p.id), ["5"], "nome literal prevalece");
  assert.deepEqual(rankProductsForQuery(products, "sem dipirona"), []);
});

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

test("fralda prioriza tamanho G exato e preserva alternativas sem confundir massa ou palavras", () => {
  const products = ["Fralda geriátrica A XG", "Fralda geriátrica B M", "Fralda geriátrica C G", "Fralda geriátrica D 90 g", "Fralda geriátrica E 5mg", "Fralda geriátrica F Grande"].map((name, index) => ({
    id: String(index), name, searchText: buildProductSearchText({ name, activeIngredients: [], searchTerms: [] }),
  }));
  const ranked = rankProductsForQuery(products, "fralda geriátrica G");
  assert.equal(ranked[0].id, "2");
  assert.equal(ranked.length, products.length, "tamanho prioriza sem eliminar alternativas");
  for (const size of ["P", "M", "G", "GG", "XG", "XXG", "RN"]) {
    const alternatives = [`Fralda geriátrica A X${size}`, `Fralda geriátrica B ${size}`].map((name, index) => ({ id: String(index), name, searchText: buildProductSearchText({ name, activeIngredients: [], searchTerms: [] }) }));
    assert.equal(rankProductsForQuery(alternatives, `fralda geriátrica ${size}`)[0].id, "1", size);
  }
  assert.deepEqual(rankProductsForQuery(products, "fralda geriátrica 90 g").map(p => p.id), ["3"], "gramas continuam sendo unidade");
  assert.equal(productSearchSize("sabonete 90 g"), null);
  assert.equal(productSearchSize("fralda geriátrica 90 g"), null);
  assert.equal(productSearchSize("fralda geriátrica 5mg"), null);
  assert.equal(productSearchSize("fralda geriátrica gramas"), null);
  assert.deepEqual(productSearchPlan("fralda geriátrica 90 g tamanho G").dosePatterns, productSearchPlan("fralda geriátrica 90 g").dosePatterns);
});

test("busca dose e marca em qualquer posição sem confundir doses", () => {
  const products = [
    { id: "corus", name: "Corus 50 mg 30 comprimidos", searchText: "corus 50 mg 30 comprimidos losartana potassica" },
    { id: "generic", name: "Losartana Potássica 50mg", searchText: "losartana potassica 50mg" },
    { id: "wrong-dose", name: "Losartana 100mg", searchText: "losartana 100mg" },
  ];
  assert.deepEqual(rankProductsForQuery(products, "losartana 50mg").map(p => p.id).sort(), ["corus", "generic"]);
  assert.deepEqual(rankProductsForQuery(products, "losartana 50 mg (corus)").map(p => p.id), ["corus"]);
  assert.deepEqual(rankProductsForQuery(products, " + "), []);
});

test("Enter usa URL de resultados e preserva caracteres sem permitir outro destino", () => {
  const url = new URL(productSearchHref(" losartana + hidro (50 mg) & x=1 ", 2), "https://wimifarma.com.br");
  assert.equal(url.pathname, "/busca");
  assert.equal(url.searchParams.get("q"), "losartana + hidro (50 mg) & x=1");
  assert.equal(url.searchParams.get("pagina"), "2");
  assert.equal(url.searchParams.get("x"), null);
});

test("separa associações sem tratar sal do mesmo princípio como outra substância", () => {
  assert.deepEqual(ingredientSearchIdentities(["Losartana potássica", "Losartana", "Hidroclorotiazida"]), ["losartana", "hidroclorotiazida"]);
  assert.equal(isProductAssociation({ name: "Corus 50mg", activeIngredients: ["Losartana potássica"] }), false);
  assert.equal(isProductAssociation({ name: "Corus H", activeIngredients: ["Losartana potássica + Hidroclorotiazida"] }), true);
  assert.equal(isProductAssociation({ name: "Losartana + hidro 50mg", activeIngredients: [] }), true);
});

test("dose decimal não corresponde ao fragmento de outra dose", () => {
  const products = ["5mg", "2,5mg", "2.5 mg", "12,5mg", "50mg"].map((dose, index) => ({
    id: String(index), name: `Bisoprolol ${dose}`, searchText: buildProductSearchText({ name: `Bisoprolol ${dose}`, activeIngredients: ["bisoprolol"], searchTerms: [] }),
  }));
  assert.deepEqual(rankProductsForQuery(products, "bisoprolol 5mg").map(p => p.id), ["0"]);
  assert.deepEqual(rankProductsForQuery(products, "bisoprolol 5").map(p => p.id), ["0"]);
  assert.deepEqual(rankProductsForQuery(products, "bisoprolol 2,5 mg").map(p => p.id).sort(), ["1", "2"]);
  assert.deepEqual(rankProductsForQuery(products, "bisoprolol 2.5mg").map(p => p.id).sort(), ["1", "2"]);
});

test("EAN pode ser encontrado sem exigir código no nome público", () => {
  const p = { id: "ean", name: "Losartana 50mg", searchText: "losartana 50mg 7896181915638" };
  assert.deepEqual(rankProductsForQuery([p], "7896181915638"), [p]);
});

test("código cadastrado tem prioridade sem depender do índice textual e aceita zeros equivalentes", () => {
  for (const ean of ["78923454", "036000291452", "7896004724577", "17896004724574"]) {
    const exact = { id: "exact", name: "Z Produto cadastrado", ean, searchText: "indice antigo" };
    const normalized = ean.padStart(14, "0");
    const indexed = { id: "indexed", name: ean, searchText: ean };
    for (const query of [ean, ` ${normalized} `]) {
      const results = rankProductsForQuery([indexed, exact], query);
      assert.equal(results[0]?.id, "exact", query);
    }
    assert.equal(rankProductsForQuery([{ ...exact, ean: null, eanNormalized: normalized }], ean)[0]?.id, "exact");
  }
});

test("EAN não confunde embalagem, dígito verificador ou fragmentos do código", () => {
  const product = { id: "ean", name: "Produto cadastrado", ean: "7896004724577", searchText: "produto cadastrado" };
  for (const query of ["17896004724574", "7896004724578", "78960047", "abc7896004724577", "7896004724577 mg"]) {
    assert.deepEqual(rankProductsForQuery([product], query), [], query);
  }
});

test("SKU hifenizado ou alfanumérico não vira requisito de dosagem no nome", () => {
  for (const sku of ["FAR-123", "FAR123", "FAR/123"]) {
    const p = { id: "sku", name: "Losartana 50mg", searchText: buildProductSearchText({ name: "Losartana 50mg", sku, activeIngredients: [], searchTerms: [] }) };
    assert.deepEqual(rankProductsForQuery([p], sku), [p]);
  }
});

test("identidade completa não confunde ácidos e sais de substâncias diferentes", () => {
  assert.deepEqual(ingredientSearchIdentities(["Besilato de anlodipino", "Besilato de atracúrio", "Ácido acetilsalicílico", "Ácido ascórbico"]),
    ["besilato de anlodipino", "besilato de atracurio", "acido acetilsalicilico", "acido ascorbico"]);
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

test("sabonete prioriza mesma marca e linha, incluindo kit em categoria diferente", () => {
  const source = { id: "source", name: "Sabonete Rexona Antibacterial Bamboo 84g", brand: "Rexona", category: "Higiene", activeIngredients: [], searchTerms: [] };
  const candidate = (id: string, name: string, brand: string, category = "Higiene") => ({ ...source, id, name, brand, category });
  const kit = candidate("kit-six", "Kit 6 Sabonetes Rexona Antibacterial Bamboo 84g", "Rexona", "Kits");
  const sameBrand = candidate("rexona-soap", "Sabonete Rexona Antibacterial Limpeza Profunda 84g", "Rexona");
  const otherBrand = candidate("other-soap", "Sabonete Dove Original 90g", "Dove");
  const deodorant = candidate("deodorant", "Desodorante Rexona Bamboo", "Rexona");
  assert.deepEqual(rankRelatedProducts(source, [deodorant, otherBrand, sameBrand, kit, source]).map(product => product.id), ["kit-six", "rexona-soap", "other-soap"]);
  const sameLineSingle = candidate("single-same-line", "Sabonete Rexona Antibacterial Bamboo 90g", "Rexona");
  assert.equal(rankRelatedProducts(source, [sameLineSingle, kit])[0].id, "kit-six", "kit da mesma linha em outra categoria precede outro avulso");
});

test("linhas Rexona disponíveis no catálogo levam o kit de seis antes de outras linhas", () => {
  const lines = ["Multivitaminas", "Fresh", "Limpeza Profunda"];
  const source = { id: "source", name: "", brand: "Rexona", category: "Higiene pessoal", activeIngredients: [], searchTerms: [] };
  const kits = lines.map(line => ({ ...source, id: line, name: `Kit sabonete Rexona ${line} 6x84g` }));
  for (const line of lines) {
    const product = { ...source, name: `Sabonete Rexona ${line} 84g` };
    assert.deepEqual(relatedProductFamilySearchTerms(product), ["sabonete"]);
    assert.equal(rankRelatedProducts(product, kits)[0].id, line);
  }
});
