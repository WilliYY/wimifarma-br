import assert from "node:assert/strict";
import test from "node:test";
import { requiresPharmacyShippingSupport } from "./eligibility";
import { validateShippingProduct } from "./rules";

const profile = { enabled: true, transportReviewed: true, weightGrams: 200, widthCm: 15, heightCm: 10, lengthCm: 20 };
const product = { id: "synthetic-product", name: "Produto teste", category: null as string | null, requiresPrescription: false, isPopularPharmacy: false, shippingProfile: profile, updatedAt: new Date(0) };

test("pharmacy shipping support preserves category matching, accents and commercial restrictions", () => {
  for (const category of ["Medicamentos", "MEDICAMENTO", "Médicamentos", "Farmácia Popular", "FARMÁCIA", "Farmacia", "Farma\u0301cia", "Outros medicamentos"]) {
    const restricted = { ...product, category };
    assert.equal(requiresPharmacyShippingSupport(restricted), true, category);
    assert.throws(() => validateShippingProduct(restricted), /o envio precisa de atendimento da farmácia/, category);
  }
  for (const restriction of [{ requiresPrescription: true }, { isPopularPharmacy: true }]) {
    const restricted = { ...product, ...restriction };
    assert.equal(requiresPharmacyShippingSupport(restricted), true);
    assert.throws(() => validateShippingProduct(restricted), /o envio precisa de atendimento da farmácia/);
  }
});

test("non-medicine categories do not require pharmacy support but still require approved packaging", () => {
  for (const category of [null, "", "Higiene", "Perfumaria", "Alimentos e chocolates", "Fraldas", "Cosméticos"]) {
    const eligible = { ...product, category };
    assert.equal(requiresPharmacyShippingSupport(eligible), false, String(category));
    assert.deepEqual(validateShippingProduct(eligible), profile);
    assert.throws(() => validateShippingProduct({ ...eligible, shippingProfile: null }), /ainda não foi liberado/);
  }
});
