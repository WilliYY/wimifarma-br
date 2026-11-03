import assert from "node:assert/strict";
import test from "node:test";
import { medicineCompositionImportIssue, normalizeVerifiedMedicineProduct, productIngredientLabel, verifiedMedicinePresentation } from "./medicine-presentation";

test("Cimegrip legado é apresentado como Cimegripe somente no EAN de 20 cápsulas conferido", () => {
  const original = { name: "Cimegrip20cp", ean: "7896523200576", brand: "Cimed", activeIngredients: [] as string[], stock: 4, slug: "cimegrip-20cp" };
  const normalized = normalizeVerifiedMedicineProduct(original);
  assert.equal(original.name, "Cimegrip20cp");
  assert.deepEqual(original.activeIngredients, []);
  assert.equal(normalized.name, "Cimegripe 400 mg + 4 mg + 4 mg 20 cápsulas");
  assert.equal(normalized.slug, original.slug);
  assert.equal(normalized.stock, original.stock);
  assert.equal(productIngredientLabel(normalized), "Paracetamol 400 mg + Maleato de clorfeniramina 4 mg + Cloridrato de fenilefrina 4 mg");
  assert.deepEqual(normalizeVerifiedMedicineProduct(normalized), normalized);
  const { brand: _brand, ...withoutBrand } = original;
  const { activeIngredients: _ingredients, ...withoutIngredients } = original;
  void [_brand, _ingredients];
  assert.equal(normalizeVerifiedMedicineProduct(withoutBrand), withoutBrand);
  assert.equal(normalizeVerifiedMedicineProduct(withoutIngredients), withoutIngredients);
  for (const patch of [{ ean: "7896523210889" }, { ean: null }, { name: "Cimegripe gotas 20mL" }, { name: "Cimegripe 750mg 20 comprimidos" }, { brand: "Outra marca" }, { activeIngredients: ["Ibuprofeno"] }, { activeIngredients: ["Paracetamol"] }]) {
    const conflicting = { ...original, ...patch };
    assert.equal(normalizeVerifiedMedicineProduct(conflicting), conflicting);
  }
});

test("associa a dose ao ingrediente conferido, nunca à posição do array", () => {
  assert.equal(productIngredientLabel({ name: "Dorilax DT 450 mg + 50 mg + 35 mg 12 comprimidos", activeIngredients: ["CITRATO DE ORFENADRINA", "CAFEÍNA ANIDRA", "PARACETAMOL"] }), "Paracetamol 450 mg + Cafeína anidra 50 mg + Citrato de orfenadrina 35 mg");
  assert.equal(productIngredientLabel({ name: "Buscoduo 10 mg + 500 mg 20 comprimidos revestidos", activeIngredients: ["PARACETAMOL", "BUTILBROMETO DE ESCOPOLAMINA"] }), "Butilbrometo de escopolamina 10 mg + Paracetamol 500 mg");
});

test("Alenia exige identidade, dose e ingredientes exatos sem inventar acessório", () => {
  const product = { name: "Alenia 6 mcg + 200 mcg 60 cápsulas dura", activeIngredients: ["BUDESONIDA", "FUMARATO DE FORMOTEROL DIIDRATADO"] };
  assert.equal(verifiedMedicinePresentation(product)?.inhalation, true);
  assert.equal(productIngredientLabel(product), "Fumarato de formoterol di-hidratado 6 mcg + Budesonida 200 mcg");
  for (const name of ["Alenia 6 mcg + 400 mcg 60 cápsulas dura", "Alenia outro 6 mcg + 200 mcg 60 cápsulas dura", "Outro 6 mcg + 200 mcg 60 cápsulas dura"]) assert.equal(verifiedMedicinePresentation({ ...product, name }), null);
  assert.equal(verifiedMedicinePresentation({ ...product, activeIngredients: ["BUDESONIDA", "FORMOTEROL"] }), null);
});

test("associações desconhecidas e ingredientes divergentes não recebem doses fabricadas", () => {
  const activeIngredients = ["Ingrediente B", "Ingrediente A"];
  assert.equal(productIngredientLabel({ name: "Outro 10 mg + 500 mg 20 comprimidos", activeIngredients }), "Ingrediente B + Ingrediente A");
  assert.equal(productIngredientLabel({ name: "Buscoduo 10 mg + 500 mg 20 comprimidos revestidos", activeIngredients }), "Ingrediente B + Ingrediente A");
  assert.equal(verifiedMedicinePresentation({ name: "Buscoduo 10 mg + 500 mg 20 comprimidos revestidos XR", activeIngredients: ["PARACETAMOL", "BUTILBROMETO DE ESCOPOLAMINA"] }), null);
});

test("associação no título exige componentes separados mesmo com lista ausente ou agrupada", () => {
  const base = { name: "Associação sintética 450 mg + 50 mg 12 comprimidos", description: "Paracetamol 450 mg + Cafeína 50 mg." };
  for (const activeIngredients of [undefined, [], ["PARACETAMOL + CAFEÍNA"], ["PARACETAMOL"], ["PARACETAMOL", "CAFEÍNA"]]) {
    assert.ok(medicineCompositionImportIssue({ ...base, activeIngredients }));
  }
  assert.equal(medicineCompositionImportIssue({ ...base, name: "Paracetamol 450 mg + Cafeína 50 mg 12 comprimidos", activeIngredients: ["CAFEÍNA", "PARACETAMOL"] }), null);
  assert.ok(medicineCompositionImportIssue({ ...base, name: "Paracetamol + Cafeína 450 mg + 50 mg 12 comprimidos", activeIngredients: ["PARACETAMOL + CAFEÍNA", "OUTRO"] }));
});

test("monofármacos com denominador e massa de embalagem não viram associações", () => {
  for (const name of ["Suspensão 125 mg/5 mL frasco 60 mL", "Suspensão 125mg/5mL frasco 60mL", "Creme 10 mg/g bisnaga 30 g", "Creme 10 mg/5 g bisnaga 30 g", "Suspensão 125 mg/5 mL frasco 60 g", "Produto 5 mg 30 g", "Solução 10 mg/mL frasco 20 mL"]) {
    assert.equal(medicineCompositionImportIssue({ name, activeIngredients: ["Sintético"], description: "Apresentação sintética." }), null, name);
  }
});

test("unidade compartilhada ou incompleta não esconde associação com componentes ausentes", () => {
  for (const strength of ["450 + 50 mg", "450/50 mg", "450mg+50", "450 + 50 + 35 mg"]) {
    for (const activeIngredients of [[], ["PARACETAMOL + CAFEÍNA"], ["PARACETAMOL", "CAFEÍNA"]]) {
      assert.ok(medicineCompositionImportIssue({ name: `Associação sintética ${strength} 20 comprimidos`, activeIngredients, description: "Paracetamol 450 mg + Cafeína 50 mg." }), strength);
    }
  }
  for (const name of ["Associação sintética 450 mg 20 comprimidos", "Associação sintética 20 comprimidos"]) {
    assert.ok(medicineCompositionImportIssue({ name, activeIngredients: ["PARACETAMOL", "CAFEÍNA"], description: "Paracetamol 450 mg + Cafeína 50 mg." }), name);
  }
});
