import assert from "node:assert/strict";
import test from "node:test";
import { isMedicineImagePlaceholder, MEDICINE_PLACEHOLDER_URL } from "./image-placeholder";

test("ilustração identifica categorias de medicamento e classificações existentes", () => {
  for (const category of ["Medicamento", "Medicamentos", "Medicamentos / Pressão arterial", "Genéricos", "Éticos", "Farmácia Popular"]) {
    assert.equal(isMedicineImagePlaceholder({ category }), true, category);
  }
  assert.equal(isMedicineImagePlaceholder({ requiresPrescription: true }), true);
  assert.equal(isMedicineImagePlaceholder({ isPopularPharmacy: true }), true);
});

test("perfumaria, suplementos e classificação ausente não recebem caixa de medicamento", () => {
  for (const category of ["Perfumaria", "Higiene", "Suplementos", "Vitaminas", "Cuidados infantis", null, ""]) {
    assert.equal(isMedicineImagePlaceholder({ category }), false, String(category));
  }
  assert.equal(isMedicineImagePlaceholder({}), false);
  assert.equal(MEDICINE_PLACEHOLDER_URL, "/brand/medicamento-sem-foto.webp");
});
