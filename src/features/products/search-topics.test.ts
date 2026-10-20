import assert from "node:assert/strict";
import test from "node:test";
import { buildProductSearchText, productSearchPlan, rankProductsForQuery } from "./public-search";

function product(id: string, name: string, ingredients: string[] = [], extra = {}) {
  const data = { id, name, activeIngredients: ingredients, searchTerms: [] as string[], category: "Medicamentos", ...extra };
  return { ...data, searchText: buildProductSearchText(data) };
}
const products = [
  product("flu", "Cimegrip 20cp"),
  product("pain", "Dipirona monoidratada 500mg", ["DIPIRONA MONOIDRATADA"]),
  product("pressure", "Losartana potássica 50mg", ["losartana potássica"]),
  product("diabetes", "Cloridrato de metformina 850mg", ["cloridrato de metformina"]),
  product("cholesterol", "Sinvastatina 20mg", ["sinvastatina"]),
  product("stomach", "Omeprazol 20mg", ["omeprazol"]),
  product("deodorant", "Desodorante Dove", [], { category: "Higiene" }),
];
const ids = (query: string, rows = products) => rankProductsForQuery(rows, query).map(row => row.id);

test("assuntos encontram produtos mesmo sem termos de busca cadastrados", () => {
  for (const query of ["grip", "gripe", "influenza"]) assert.deepEqual(ids(query), ["flu"], query);
  for (const query of ["dor", "febre", "cabeça", "dor de cabeça", "cefaleia"]) assert.deepEqual(ids(query), ["pain"], query);
  for (const query of ["pressão", "pressao alta", "hipertensão"]) assert.deepEqual(ids(query), ["pressure"], query);
  for (const query of ["diabete", "diabetes", "diabetes tipo 2", "diabete tipo2"]) assert.deepEqual(ids(query), ["diabetes"], query);
  for (const query of ["colesterol", "colesterol alto", "hipercolesterolemia"]) assert.deepEqual(ids(query), ["cholesterol"], query);
  for (const query of ["azia", "refluxo"]) assert.deepEqual(ids(query), ["stomach"], query);
});

test("condições distintas não recebem a expansão do termo genérico", () => {
  for (const query of ["pressão baixa", "hipotensão", "pressao muito baixa", "diabetes tipo 1", "diabetes gestacional", "pré diabetes", "hipoglicemia", "colesterol baixo", "resfriado"]) {
    assert.deepEqual(ids(query), [], query);
  }
});

test("assunto mantém fabricante, dosagem decimal e combinação de termos como requisitos", () => {
  const rows = [product("right", "Dipirona monoidratada 500mg EMS", ["dipirona monoidratada"]),
    product("dose", "Dipirona monoidratada 1000mg EMS", ["dipirona monoidratada"]),
    product("brand", "Dipirona monoidratada 500mg Medley", ["dipirona monoidratada"])];
  assert.deepEqual(ids("dor e febre 500 mg EMS", rows), ["right"]);
  assert.deepEqual(ids("diabetes tipo 2 850mg"), ["diabetes"]);
  assert.deepEqual(productSearchPlan("diabetes tipo 2").dosePatterns, []);
  const decimals = [product("whole", "Atenolol 5mg", ["atenolol"]), product("decimal", "Atenolol 2,5mg", ["atenolol"])];
  assert.deepEqual(ids("pressao 5mg", decimals), ["whole"]);
});

test("não transforma contraindicação, efeito adverso ou ingrediente cosmético em indicação", () => {
  const rows = [product("warning", "Produto sem relação", [], { description: "Pode causar febre. Contraindicado na hipertensão.", searchTerms: ["não usar para febre"] }),
    product("cosmetic", "Creme", ["dipirona monoidratada"], { category: "Higiene", catalogClassification: { kind: "HYGIENE" } }),
    product("tag", "Termômetro digital", [], { category: "Cuidados", searchTerms: ["febre"] })];
  assert.deepEqual(ids("febre", rows), ["tag"]);
  assert.deepEqual(ids("pressao alta", rows), []);
  for (const query of ["sem febre", "não quero para pressão", "alergia a dipirona febre", "febre em criança"]) assert.deepEqual(ids(query), [], query);
});

test("identidades completas e classificação prevalecem sobre prefixos de sais", () => {
  const rows = [product("right", "Produto A", ["besilato de anlodipino"]), product("wrong", "Produto B", ["besilato de atracúrio"]),
    product("association", "Produto C", ["losartana potássica + hidroclorotiazida"])];
  assert.deepEqual(ids("pressão", rows).sort(), ["association", "right"]);
});

test("produtos futuros entram por ingrediente ou termo explícito, sem inventar cadastros", () => {
  const rows = [product("new", "Nova apresentação", ["fosfato de sitagliptina monoidratado"]), product("unreviewed", "Novo medicamento sem composição")];
  assert.deepEqual(ids("diabetes", rows), ["new"]);
  assert.deepEqual(ids("doença inexistente", rows), []);
});

test("nome explícito de um cuidado continua pesquisável e SKU não vira assunto", () => {
  const rows = [product("monitor", "Aparelho de pressão digital", [], { category: "Cuidados" }), product("sku", "Produto sintético", [], { sku: "GRIP-123" })];
  assert.deepEqual(ids("aparelho de pressão", rows), ["monitor"]);
  for (const sku of ["GRIP-123", "GRIP_123", "GRIP-ABC", "P-DOR-001", "DOR"]) {
    assert.deepEqual(ids(sku, [product("sku", "Produto sintético", [], { category: "Higiene", sku })]), ["sku"], sku);
  }
});
