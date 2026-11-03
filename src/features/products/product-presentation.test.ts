import assert from "node:assert/strict";
import test from "node:test";
import { productCareInformation, productPackagePresentation, productPickupInformation } from "./product-presentation";

const soap = { name: "Sabonete Rexona Multivitaminas 84g", category: "Higiene pessoal", requiresPrescription: false, prescriptionType: "UNREVIEWED" as const, catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } };

test("sabonete mostra conteúdo e apresentação sem tratar conteúdo como peso de envio", () => {
  assert.deepEqual(productPackagePresentation(soap), { content: "84 g", presentation: "1 unidade" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Kit sabonete Rexona Multivitaminas 6x84g" }), { content: "84 g por unidade", presentation: "Kit com 6 unidades" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Kit Sabonete Rexona 6un 84g Antibacterial Fresh" }), { content: "84 g por unidade", presentation: "Kit com 6 unidades" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Kit 6 Sabonetes Rexona Multivitaminas 84g" }), { content: "84 g por unidade", presentation: "Kit com 6 unidades" });
  assert.equal(productPackagePresentation({ ...soap, name: "Kit Sabonetes Rexona" }).presentation, "Kit — confira a composição na embalagem");
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Sabonete líquido Rexona refil 200ml" }), { content: "200 mL", presentation: "Refil" });
});

test("higiene recebe cuidados da embalagem; medicamentos preservam bula e orientação", () => {
  assert.doesNotMatch(productCareInformation(soap).description, /bula|medicamento/i);
  assert.match(productCareInformation(soap).description, /embalagem/);
  const medicine = { ...soap, name: "Paracetamol 750 mg 20 comprimidos", category: "Medicamentos", catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true } };
  assert.match(productCareInformation(medicine).description, /bula/);
  assert.deepEqual(productPackagePresentation(medicine), { content: null, presentation: "20 comprimidos" });
});

test("multipacks distinguem embalagem comercial, conteúdo individual e total líquido", () => {
  for (const name of ["Sabonete Protex 85g L6P5", "Sabonete Protex BALANCE SAUDAVEL85gL6P5", "Sabonete Protex Leve 6 Pague 5 85g", "Sabonete Protex 6barras85g"]) {
    assert.deepEqual(productPackagePresentation({ ...soap, name }), { content: "6 barras de 85 g · 510 g líquidos", presentation: "1 pacote com 6 barras" });
  }
  for (const color of ["Algodão Doce", "Gabriele"]) {
    assert.deepEqual(productPackagePresentation({ ...soap, name: `Esmalte Colorama ${color} caixa com 6 frascos de 8 ml` }), { content: "6 frascos de 8 mL · 48 mL no total", presentation: "1 caixa com 6 frascos" });
  }
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Absorvente Intimus Leve8Pague7" }), { content: "8 absorventes", presentation: "1 pacote com 8 absorventes" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Absorvente Interno Intimus Mini Leve 16 unidades Pague 15 unidades" }), { content: "16 absorventes", presentation: "1 pacote com 16 absorventes" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Lenços Umedecidos Bepantol Baby Leve 96 Pague 80 unidades" }), { content: "96 unidades", presentation: "1 pacote com 96 unidades" });
});

test("multipacks não inventam pesos, composição ou quantidade a partir de doses", () => {
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Sabonete Protex 90g L6P5" }), { content: "6 barras de 90 g · 540 g líquidos", presentation: "1 pacote com 6 barras" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Sabonete Protex L6P5" }), { content: "6 barras", presentation: "1 pacote com 6 barras" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Esmalte Colorama caixa com 6 frascos" }), { content: "6 frascos", presentation: "1 caixa com 6 frascos" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Esmalte Colorama 8 ml" }), { content: "8 mL", presentation: "1 unidade" });
  const medicine = { ...soap, name: "Medicamento 6 x 5 mg 20 comprimidos", category: "Medicamentos", catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true } };
  assert.deepEqual(productPackagePresentation(medicine), { content: null, presentation: "20 comprimidos" });
  for (const name of ["Caixa 6 frascos de 8ml + 2 frascos de 10ml", "Caixa com 2 pacotes de 6 frascos de 8ml", "Esmalte 6 frascos 8 frascos de 8ml"]) {
    assert.deepEqual(productPackagePresentation({ ...soap, name }), { content: null, presentation: "Embalagem — confira a composição na embalagem" });
  }
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Sabonete 6 barras peso líquido total 510g" }), { content: "6 barras", presentation: "1 pacote com 6 barras" });
});

test("retirada usa estoque físico ou calendário de distribuidor sem prometer hoje indevidamente", () => {
  const now = new Date("2026-11-02T13:00:00Z");
  assert.match(productPickupInformation("PHARMACY", now).title, /Retirada hoje/);
  assert.match(productPickupInformation("PHARMACY", now).description, /10:30/);
  const supplier = productPickupInformation("DISTRIBUTOR", now);
  assert.doesNotMatch(supplier.title, /hoje/i);
  assert.match(supplier.description, /03\/11.*18h30/);
  assert.match(productPickupInformation("PHARMACY", new Date("2026-11-03T22:00:00Z")).title, /Próxima retirada/);
});

test("promoção não substitui contagem independente conflitante", () => {
  for (const name of [
    "Sabonete Protex 12 barras 85g L6P5",
    "Caixa Colorama 6 frascos de 8mL L12P10",
    "Sabonete Protex 12x85g L6P5",
    "Absorvente Intimus 8 unidades Leve 16 unidades Pague 15 unidades",
  ]) {
    assert.deepEqual(productPackagePresentation({ ...soap, name }), { content: null, presentation: "Embalagem — confira a composição na embalagem" }, name);
  }
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Sabonete Protex 6 barras 85g L6P5" }), { content: "6 barras de 85 g · 510 g líquidos", presentation: "1 pacote com 6 barras" });
  assert.deepEqual(productPackagePresentation({ ...soap, name: "Absorvente Intimus 16 unidades Leve 16 unidades Pague 15 unidades" }), { content: "16 absorventes", presentation: "1 pacote com 16 absorventes" });
});
