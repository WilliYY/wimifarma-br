import assert from "node:assert/strict";
import test from "node:test";

test("Alenia inalação recupera somente a apresentação CMED conferida sem remover doses ou outros termos", () => {
  const verified = {
    id: "verified", name: "Alenia 6 mcg + 200 mcg 60 cápsulas dura",
    activeIngredients: ["BUDESONIDA", "FUMARATO DE FORMOTEROL DIIDRATADO"],
    cmedReference: { presentation: "6 MCG + 200 MCG CAP DURA PO INAL CT FR PLAS OPC X 60" },
    searchText: "alenia 6 mcg 200 mcg 60 capsulas dura budesonida fumarato de formoterol diidratado",
  };
  const products = [verified, { ...verified, id: "wrong-pair", activeIngredients: ["BUDESONIDA"] },
    { ...verified, id: "wrong-cmed", cmedReference: { presentation: "OUTRA APRESENTACAO" } }];
  assert.deepEqual(rankProductsForQuery(products, "Alenia inalação").map(p => p.id), ["verified"]);
  assert.deepEqual(rankProductsForQuery([verified], "Alenia 6/200").map(p => p.id), ["verified"]);
  for (const query of ["Alenia inalação 12/400", "Alenia inalação refil", "Alenia inalação inalador", "Alenia inalação xarope"]) {
    assert.deepEqual(rankProductsForQuery([verified], query), [], query);
  }
});

test("marca da loja no texto livre não torna losartana um resultado de Wimifarma", () => {
  const products = [
    { id: "irrelevant", name: "Losartana 50mg", brand: "Geolab", searchTerms: [], description: "Disponível na Wimifarma", searchText: "losartana 50mg geolab disponivel na wimifarma" },
    { id: "brand", name: "Produto próprio", brand: "Wimifarma", searchText: "produto proprio wimifarma" },
    { id: "term", name: "Produto institucional", searchTerms: ["Wimifarma"], searchText: "produto institucional wimifarma" },
  ];
  for (const query of ["wimi", "wimifarm", "wimifarma"]) {
    assert.deepEqual(new Set(rankProductsForQuery(products, query).map(p => p.id)), new Set(["brand", "term"]), query);
  }
  assert.deepEqual(rankProductsForQuery(products, "losartana 50mg").map(p => p.id), ["irrelevant"]);
});

test("haste flexível e hastes flexíveis recuperam as mesmas apresentações sem correção ortográfica", () => {
  const products = ["Hastes Flexíveis Cotonetes 75 unidades", "Hastes Flexíveis Topz 75 unidades", "Haste Flexível Cotonetes 150 unidades", "Losartana 50mg"]
    .map((name, id) => ({ id: String(id), name, searchText: normalizeProductSearch(name) }));
  for (const query of ["haste flexível", "hastes flexíveis", "hastes flexível", "haste flexíveis"]) {
    assert.deepEqual(new Set(rankProductsForQuery(products, query).map(p => p.id)), new Set(["0", "1", "2"]), query);
  }
  assert.deepEqual(productSearchPlan("haste flexível").patterns, productSearchPlan("hastes flexíveis").patterns);
});

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

test("sintoma, categoria e ingrediente parcial não bastam para correlacionar medicamentos", () => {
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
    [],
  );
});

test("medicamentos relacionados preservam composição completa, dose e formulação", () => {
  const source = { id: "source", name: "Losartana 50 mg 30 comprimidos", category: "Medicamentos", activeIngredients: ["Losartana potássica"], searchTerms: ["pressão"] };
  const candidate = (id: string, name: string, activeIngredients = source.activeIngredients) => ({ ...source, id, name, activeIngredients });
  const matching = candidate("matching", "Losartana 50mg 60 comprimidos");
  const rows = [matching, candidate("dose", "Losartana 100mg 30 comprimidos"), candidate("form", "Losartana 50mg 30 cápsulas"), candidate("release", "Losartana 50mg 30 comprimidos de liberação prolongada"), candidate("other", "Atenolol 50mg 30 comprimidos", ["Atenolol"]), candidate("missing", "Losartana 30 comprimidos"), candidate("association", "Losartana 50mg + Hidroclorotiazida 12,5mg 30 comprimidos", ["Losartana potássica", "Hidroclorotiazida"])];
  assert.deepEqual(rankRelatedProducts(source, rows).map(row => row.id), ["matching"]);
});

test("qualificadores completos de formulação ou via nunca somem da identidade de relacionados", () => {
  const source = { id: "source", name: "Paracetamol 500mg 20 comprimidos", category: "Medicamentos", activeIngredients: ["Paracetamol"], searchTerms: [] };
  for (const qualifier of ["orodispersíveis", "dispersíveis", "entéricos", "vaginais", "microencapsulados experimentais"]) {
    for (const name of [`Paracetamol 500mg 20 comprimidos ${qualifier}`, `Paracetamol 500mg ${qualifier} 20 comprimidos`, `Paracetamol ${qualifier} 500mg 20 comprimidos`]) {
      const candidate = { ...source, id: "different", name };
      assert.deepEqual(rankRelatedProducts(source, [candidate]), [], name);
      assert.deepEqual(rankRelatedProducts(candidate, [source]), [], `sentido inverso: ${name}`);
    }
  }
  assert.deepEqual(rankRelatedProducts(source, [{ ...source, id: "safe", name: "PARACETAMOL 500 mg 60 comprimido" }]).map(row => row.id), ["safe"]);
  const explicit = { ...source, name: "Paracetamol 500mg 20 comprimidos orodispersíveis" };
  assert.deepEqual(rankRelatedProducts(explicit, [{ ...explicit, id: "same", name: "Paracetamol 500 mg 40 comprimidos orodispersiveis" }]).map(row => row.id), ["same"]);
});

test("associação sem pares de concentração conferidos não recomenda monofármaco ou outra associação", () => {
  const source = { id: "source", name: "Antigripal 400mg + 4mg + 4mg 20 cápsulas", category: "Medicamentos", activeIngredients: ["Paracetamol", "Maleato de clorfeniramina", "Cloridrato de fenilefrina"], searchTerms: ["gripe"] };
  assert.deepEqual(rankRelatedProducts(source, [{ ...source, id: "copy" }, { ...source, id: "mono", name: "Paracetamol 400mg 20 cápsulas", activeIngredients: ["Paracetamol"] }]), []);
});

test("relacionados preservam dose decimal e denominador da concentração", () => {
  const source = { id: "source", name: "Sintético 2,5 mg 30 comprimidos", category: "Medicamentos", activeIngredients: ["Ingrediente sintético"], searchTerms: [] };
  assert.deepEqual(rankRelatedProducts(source, [{ ...source, id: "decimal", name: "Sintético 2.5mg 60 comprimidos" }, { ...source, id: "integer", name: "Sintético 5mg 30 comprimidos" }]).map(row => row.id), ["decimal"]);
  const liquid = { ...source, name: "Sintético 125mg/5mL suspensão 60mL" };
  assert.deepEqual(rankRelatedProducts(liquid, [{ ...liquid, id: "same", name: "Sintético 125 mg/5 mL suspensão 100mL" }, { ...liquid, id: "wrong", name: "Sintético 125mg/mL suspensão 60mL" }]).map(row => row.id), ["same"]);
});

test("associação conferida compara os pares de dose, independentemente da posição dos ingredientes", () => {
  const source = { id: "source", name: "Dorilax DT 450 mg + 50 mg + 35 mg 12 comprimidos", category: "Medicamentos", activeIngredients: ["Paracetamol", "Cafeína anidra", "Citrato de orfenadrina"], searchTerms: [] };
  const matching = { ...source, id: "matching", name: "Dorilax DT 450 mg + 50 mg + 35 mg 100 comprimidos", activeIngredients: [...source.activeIngredients].reverse() };
  assert.deepEqual(rankRelatedProducts(source, [matching, { ...matching, id: "conflicting", name: "Dorilax DT 35 mg + 50 mg + 450 mg 100 comprimidos" }]).map(row => row.id), ["matching"]);
});

test("famílias adicionais de higiene não misturam itens por marca, categoria ou termo genérico", () => {
  const source = { id: "source", name: "Lenços Umedecidos Marca Suave 48 unidades", brand: "Marca", category: "Infantil", activeIngredients: [], searchTerms: ["bebê"] };
  const rows = ["Sabonete Marca Suave 90g", "Fralda Marca Suave 20 unidades", "Lenços Umedecidos Marca Suave 96 unidades"].map((name, id) => ({ ...source, id: String(id), name }));
  assert.deepEqual(rankRelatedProducts(source, rows).map(row => row.id), ["2"]);
});

test("cadastro sem família reconhecida não usa somente categoria ou sintomas como recomendação", () => {
  const source = { id: "source", name: "Produto incompleto", category: "Perfumaria", activeIngredients: [], searchTerms: ["cuidado"] };
  assert.deepEqual(rankRelatedProducts(source, [{ ...source, id: "other", name: "Outro produto" }]), []);
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
