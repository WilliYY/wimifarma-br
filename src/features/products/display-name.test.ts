import assert from "node:assert/strict";
import test from "node:test";
import { productDisplayName, productTitleBrand } from "./display-name";

test("marca no título distingue apresentações sem duplicar palavras já presentes", () => {
  assert.equal(productTitleBrand("Tadalafila 20 mg 2 comprimidos", "ACHÉ LABORATÓRIOS FARMACÊUTICOS S.A"), "ACHÉ LABORATÓRIOS FARMACÊUTICOS S.A");
  assert.equal(productTitleBrand("Sabonete Dove 90 g", "DOVE"), null);
  assert.equal(productTitleBrand("Produto Ache 20 mg", "Aché"), null);
  assert.equal(productTitleBrand("Creme biomed 30 g", "Med"), "Med");
  assert.equal(productTitleBrand("Produto sem marca", null), null);
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
