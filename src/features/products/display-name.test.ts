import assert from "node:assert/strict";
import test from "node:test";
import { productDisplayName, productTitleBrand } from "./display-name";

test("marca no título distingue apresentações sem duplicar palavras já presentes", () => {
  assert.equal(productTitleBrand("Tadalafila 20 mg 2 comprimidos", "ACHÉ LABORATÓRIOS FARMACÊUTICOS S.A"), "ACHÉ");
  assert.equal(productTitleBrand("Sabonete Dove 90 g", "DOVE"), null);
  assert.equal(productTitleBrand("Produto Ache 20 mg", "Aché"), null);
  assert.equal(productTitleBrand("Creme biomed 30 g", "Med"), "Med");
  assert.equal(productTitleBrand("Produto sem marca", null), null);
});

test("marca curta remove razão social sem inventar laboratório ou apagar denominação composta", () => {
  for (const [name, brand, expected] of [
    ["Loratadina 10 mg 12 comprimidos", "BIOLAB SANUS FARMACÊUTICA LTDA", "BIOLAB"],
    ["Tadalafila 20 mg 4 comprimidos", "EUROFARMA LABORATÓRIOS S.A", "EUROFARMA"],
    ["Produto 2,5 mg 30 comprimidos", "GEOLAB INDÚSTRIA FARMACÊUTICA S/A", "GEOLAB"],
    ["Produto 50 mg 10 comprimidos", "BAYER S.A.", "BAYER"],
    ["Produto 50 mg 10 comprimidos", "SANOFI MEDLEY", "SANOFI MEDLEY"],
    ["Produto", "COSMED INDUSTRIA DE COSMETICOS E MEDICAMENTOS S.A.", "COSMED"],
    ["Produto", "PF CONSUMER HEALTHCARE BRAZIL IMPORTADORA E DISTRIBUIDORA DE MEDICAMENTOS LTDA", "PF CONSUMER HEALTHCARE BRAZIL"],
    ["Produto", "LABORATORIO TEUTO BRASILEIRO S/A", "TEUTO"],
    ["Produto", "ABBOTT LABORATORIOS DO BRASIL LTDA", "ABBOTT"],
    ["Produto", "ALTHAIA S.A. INDUSTRIA FARMACEUTICA", "ALTHAIA"],
    ["Produto", "ASTRAZENECA DO BRASIL LTDA", "ASTRAZENECA"],
    ["Tadalafila 20 mg 4 comprimidos Eurofarma", "EUROFARMA LABORATÓRIOS S.A", null],
    ["Loratadina 10 mg 12 comprimidos Biolab", "BIOLAB SANUS FARMACÊUTICA LTDA", null],
    ["Produto Aché Laboratórios Farmacêuticos S.A", "ACHÉ LABORATÓRIOS FARMACÊUTICOS S.A", null],
  ] as const) {
    assert.equal(productTitleBrand(name, brand), expected);
  }
});

test("marca Multilab remove somente o complemento empresarial completo no final", () => {
  for (const brand of ["MULTILAB INDUSTRIA E COMERCIO DE PRODUTOS FARMACEUTICOS LTDA", "MULTILAB INDÚSTRIA E COMÉRCIO DE PRODUTOS FARMACÊUTICOS LTDA"]) {
    assert.equal(productTitleBrand("Tadalafila 20 mg 4 comprimidos revestidos", brand), "MULTILAB");
    assert.equal(productTitleBrand("Tadalafila 5 mg 30 comprimidos revestidos Multilab", brand), null);
  }
  assert.equal(productTitleBrand("Produto", "MARCA COMPOSTA INDUSTRIA E COMERCIO DE PRODUTOS FARMACEUTICOS LTDA"), "MARCA COMPOSTA");
  assert.equal(productTitleBrand("Produto", "MULTILAB INDUSTRIA E COMERCIO DE PRODUTOS FARMACEUTICOS ESPECIAIS LTDA"), "MULTILAB INDUSTRIA E COMERCIO DE PRODUTOS FARMACEUTICOS ESPECIAIS");
});

test("encurta losartana mantendo dose, quantidade e fabricante", () => {
  assert.equal(productDisplayName("Losartana Potássica 50 mg 30 Comprimidos Revestidos Germed"), "Losartana 50 mg · 30 comprimidos · Germed");
  assert.equal(productDisplayName("Losartana Potássica 50 Mg C/30 Comprimidos Revestidos Teuto"), "Losartana 50 mg · 30 comprimidos · Teuto");
  assert.equal(productDisplayName("Losartana Potássica 50 mg 30 Comprimidos Revestidos Nova Química"), "Losartana 50 mg · 30 comprimidos · Nova Química");
});

test("referências e apresentações de 30 e 60 comprimidos continuam distintas", () => {
  assert.equal(productDisplayName("Aradois Losartana Potássica 50 mg 30 Comprimidos Revestidos"), "Aradois 50 mg · 30 comprimidos");
  assert.equal(productDisplayName("Aradois Losartana Potássica 50 mg 60 Comprimidos Revestidos"), "Aradois 50 mg · 60 comprimidos");
  assert.equal(productDisplayName("Corus Losartana Potássica 50 mg 30 Comprimidos Revestidos"), "Corus 50 mg · 30 comprimidos");
});

test("não simplifica associações, liberação especial ou produtos fora do formato conferido", () => {
  for (const name of ["Losartana + Hidroclorotiazida 50 mg + 12,5 mg 30 Comprimidos Revestidos", "Losartana Potássica 50 mg 30 Comprimidos de Liberação Prolongada", "Losartana Potássica 50 mg 30 Comprimidos Revestidos Outra Marca", "Metformina XR 500 mg 30 Comprimidos Revestidos", "Sabonete Dove 90 g"]) {
    assert.equal(productDisplayName(name), name);
  }
});
