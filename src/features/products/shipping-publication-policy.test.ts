import assert from "node:assert/strict";
import test from "node:test";
import { validateShippingPublication } from "./shipping-publication-policy";
import { productCreateSchema, productUpdateSchema } from "./schema";

const profile = { enabled: true, transportReviewed: true, measurementBasis: "measured", weightGrams: 250,
  widthCm: 10, heightCm: 8, lengthCm: 15, cargoKinds: ["general"], approvedServiceIds: [1] };
const product = { name: "Apresentação sintética", category: "Higiene", status: "ACTIVE", requiresPrescription: false,
  prescriptionType: "UNREVIEWED" as const, isPopularPharmacy: false, shippingProfile: profile };

test("somente novas publicações ACTIVE exigem prontidão; rascunhos e ativos legados continuam editáveis", () => {
  assert.doesNotThrow(() => validateShippingPublication(null, { ...product, status: "DRAFT", shippingProfile: null }));
  assert.doesNotThrow(() => validateShippingPublication(null, { ...product, status: "ARCHIVED", shippingProfile: null }));
  assert.doesNotThrow(() => validateShippingPublication({ status: "ACTIVE" }, { ...product, shippingProfile: null }));
  assert.throws(() => validateShippingPublication(null, { ...product, shippingProfile: null }), /peso|medidas/i);
  assert.throws(() => validateShippingPublication({ status: "DRAFT" }, { ...product, shippingProfile: null }), /peso|medidas/i);
  assert.throws(() => validateShippingPublication({ status: "ARCHIVED" }, { ...product, shippingProfile: null }), /peso|medidas/i);
});

test("publicação exige peso e três medidas completos, revisão e base measured explícita", () => {
  for (const changes of [{ weightGrams: null }, { weightGrams: 0 }, { widthCm: null }, { heightCm: 0 }, { lengthCm: null },
    { transportReviewed: false }, { transportReviewed: undefined }, { measurementBasis: "estimated" }, { measurementBasis: undefined }]) {
    assert.throws(() => validateShippingPublication(null, { ...product, shippingProfile: { ...profile, ...changes } }), /peso|medidas|revis/i);
  }
  assert.doesNotThrow(() => validateShippingPublication(null, product));
});

test("autoenvio exige enabled, carga explícita e ao menos um serviço aprovado compatível", () => {
  for (const changes of [{ enabled: false }, { cargoKinds: [] }, { cargoKinds: undefined }, { cargoKinds: ["unspecified"] },
    { cargoKinds: ["general", "unspecified"] }, { approvedServiceIds: [] }, { approvedServiceIds: undefined },
    { cargoKinds: ["perfume"], approvedServiceIds: [1] }]) {
    assert.throws(() => validateShippingPublication(null, { ...product, shippingProfile: { ...profile, ...changes } }), /transporte|carga|serviço/i);
  }
  assert.doesNotThrow(() => validateShippingPublication(null, { ...product, shippingProfile: { ...profile, cargoKinds: ["perfume"], approvedServiceIds: [1, 3] } }));
});

test("serviço desconhecido não aprova carga geral nem contorna carga proibida", () => {
  assert.throws(() => validateShippingPublication(null, { ...product, shippingProfile: { ...profile, approvedServiceIds: [999999] } }), /serviço/i);
  assert.doesNotThrow(() => validateShippingPublication(null, { ...product, shippingProfile: { ...profile, approvedServiceIds: [999999, 1] } }));
  assert.throws(() => validateShippingPublication(null, { ...product, shippingProfile: { ...profile, cargoKinds: ["perfume"], approvedServiceIds: [999999, 1] } }), /serviço/i);
});

test("serviços condicionais dependem da aprovação explícita existente; medicamento continua limitado a PAC/SEDEX", () => {
  const medicine = { ...product, category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY" as const,
    shippingProfile: { ...profile, cargoKinds: ["medication"], approvedServiceIds: [1] } };
  assert.doesNotThrow(() => validateShippingPublication(null, medicine));
  for (const approvedServiceIds of [[], [3], [12], [17]]) {
    assert.throws(() => validateShippingPublication(null, { ...medicine, shippingProfile: { ...medicine.shippingProfile, approvedServiceIds } }), /serviço|transporte/i);
  }
  assert.throws(() => validateShippingPublication(null, { ...medicine, shippingProfile: { ...medicine.shippingProfile, enabled: false } }), /transporte/i);
});

test("itens assistidos precisam de físico medido/revisado sem exigir habilitação de envio", () => {
  const assistedProfile = { ...profile, enabled: false, cargoKinds: undefined, approvedServiceIds: undefined };
  for (const changes of [{ requiresPrescription: true, prescriptionType: "CONTROLLED" as const },
    { requiresPrescription: true, prescriptionType: "UNREVIEWED" as const },
    { requiresPrescription: true, prescriptionType: "ANTIMICROBIAL" as const },
    { isPopularPharmacy: true }, { category: "Farmácia Popular" }]) {
    const assisted = { ...product, ...changes, shippingProfile: assistedProfile };
    assert.doesNotThrow(() => validateShippingPublication(null, assisted));
    assert.throws(() => validateShippingPublication(null, { ...assisted, shippingProfile: { ...assistedProfile, transportReviewed: false } }), /revis|medidas/i);
    assert.throws(() => validateShippingPublication(null, { ...assisted, shippingProfile: { ...assistedProfile, measurementBasis: "estimated" } }), /revis|medidas/i);
    assert.equal(assisted.shippingProfile.enabled, false);
  }
});

test("validação não converte estimativas nem altera flags/perfil", () => {
  const estimated = { ...product, shippingProfile: { ...profile, measurementBasis: "estimated", enabled: false, transportReviewed: false } };
  const before = structuredClone(estimated);
  assert.throws(() => validateShippingPublication(null, estimated));
  assert.deepEqual(estimated, before);
});

test("cadastro geral começa DRAFT e não aceita revisão ou habilitação logística no payload", () => {
  assert.equal(productCreateSchema.parse({ name: "Produto sintético", price: 10 }).status, "DRAFT");
  assert.equal(productCreateSchema.safeParse({ name: "Produto sintético", price: 10, shippingProfile: profile }).success, false);
});

test("update sem status não injeta default de publicação", () => {
  const parsed = productUpdateSchema.parse({ name: "Produto sintético", price: 12, stock: 5, expectedUpdatedAt: "2026-11-01T12:00:00.000Z" });
  assert.equal(Object.hasOwn(parsed, "status"), false);
});


const notifyProfile = { notifyOnlyPendingLogistics: true, enabled: false, transportReviewed: false, measurementBasis: "unknown", weightGrams: null, widthCm: null, heightCm: null, lengthCm: null, reference: null };
test("notify-only publication requires explicit valid unapproved draft and cannot silently release ACTIVE hold", () => {
  assert.doesNotThrow(() => validateShippingPublication(null, { ...product, shippingProfile: notifyProfile }));
  assert.equal(productCreateSchema.safeParse({ name: "Produto sintético", price: 10, status: "ACTIVE", shippingProfile: notifyProfile }).success, true);
  for (const changes of [{ notifyOnlyPendingLogistics: false }, { notifyOnlyPendingLogistics: "true" }, { enabled: true }, { measurementBasis: undefined }]) {
    assert.throws(() => validateShippingPublication(null, { ...product, shippingProfile: { ...notifyProfile, ...changes } }));
  }
  assert.throws(() => validateShippingPublication({ status: "ACTIVE", shippingProfile: notifyProfile }, { ...product, shippingProfile: null }));
  assert.doesNotThrow(() => validateShippingPublication({ status: "ACTIVE", shippingProfile: notifyProfile }, product));
});
