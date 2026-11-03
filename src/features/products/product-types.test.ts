import assert from "node:assert/strict";
import test from "node:test";
import { productTypeHint } from "./product-types";

test("hint de futuras entradas preserva identidade vitamínica Centrum antes da forma comprimidos", () => {
  for (const name of ["Centrum Essencial 30 comprimidos", "Suplementos Centrum Essencial 30 comprimidos", "Centrum Adulto 30 comprimidos", "Centrum Select Mulher 30 comprimidos"]) {
    assert.equal(productTypeHint(name), "supplement", name);
  }
  for (const name of ["Medicamentos Centrum Essencial 30 comprimidos", "Medicamento Centrum Homem 30 comprimidos", "Losartana 50mg 30 comprimidos", "Dipirona 500mg 20 cápsulas"]) {
    assert.equal(productTypeHint(name), "medicine", name);
  }
  for (const name of ["Centrum Produto desconhecido 30 comprimidos", "Centrum Essencial creme 30g", "Creme com vitamina C 30g"]) {
    assert.notEqual(productTypeHint(name), "supplement", name);
  }
  assert.equal(productTypeHint("Sabonete Dove 90g"), "hygiene");
  assert.equal(productTypeHint("Shampoo com vitamina E 200mL"), "hygiene");
});
