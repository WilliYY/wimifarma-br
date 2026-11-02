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

test("retirada usa estoque físico ou calendário de distribuidor sem prometer hoje indevidamente", () => {
  const now = new Date("2026-11-02T13:00:00Z");
  assert.match(productPickupInformation("PHARMACY", now).title, /Retirada hoje/);
  assert.match(productPickupInformation("PHARMACY", now).description, /10:30/);
  const supplier = productPickupInformation("DISTRIBUTOR", now);
  assert.doesNotMatch(supplier.title, /hoje/i);
  assert.match(supplier.description, /03\/11.*18h30/);
  assert.match(productPickupInformation("PHARMACY", new Date("2026-11-03T22:00:00Z")).title, /Próxima retirada/);
});
