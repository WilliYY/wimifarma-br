import assert from "node:assert/strict";
import test from "node:test";
import { reviewEstimatedShipping, reviewOrdinaryMedicineShipping, estimatedReviewSha256, createEstimatedDraftOnly } from "./estimated-review";

const profile = () => ({ enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 300, lengthCm: 24, widthCm: 15, heightCm: 10, reference: null, approvedServiceIds: [], cargoKinds: ["unspecified"], provenance: { source: "owner-estimate", measured: false } });
const product = (catalogClassification: { kind: string } | null = null) => ({ id: "synthetic", name: "Higiene sintética", ean: "7890000000000", eanNormalized: "07890000000000", category: "Higiene", status: "ACTIVE", deletedAt: null, updatedAt: new Date(0), requiresPrescription: false, prescriptionType: "UNREVIEWED" as const, isPopularPharmacy: false, catalogClassification, shippingProfile: profile() });
const entry = (row = product()) => ({ productId: row.id, expectedEan: row.ean, expectedName: row.name, expectedUpdatedAt: row.updatedAt.toISOString(), expectedShippingProfile: structuredClone(row.shippingProfile), expectedProfileSha256: estimatedReviewSha256(row.shippingProfile), cargoKinds: ["general"], approvedServiceIds: [1, 3] });

test("revisão conserva estimativa, medidas, proveniência e objeto original", () => {
  const row = product(), before = structuredClone(row);
  const result = reviewEstimatedShipping(row, entry(row), [1, 3]);
  assert.deepEqual(row, before);
  assert.deepEqual(result, { ...row.shippingProfile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1, 3] });
});

test("desodorante para pés em pó sem perfume conserva estimativa e não exige carga perfume", () => {
  const row = { ...product({ kind: "PERFUMERY" }), id: "cmvoizyv700000rqrkh1d38dh", name: "Desodorante para pés Tenys Pé Baruel Sem Perfume em pó 100g" }, before = structuredClone(row);
  const result = reviewEstimatedShipping(row, entry(row), [1, 3]);
  assert.deepEqual(result, { ...row.shippingProfile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1, 3] });
  assert.deepEqual(row, before);
  for (const marker of ["spray", "creme", "cremoso", "cremosa", "em pasta", "pastoso", "pastosa", "oleoso", "oleosa", "oleosos", "oleosas", "álcool", "solvente", "elétrico"]) {
    const ambiguous = { ...row, name: `Desodorante para pés sem perfume em pó ${marker} 100g` };
    assert.throws(() => reviewEstimatedShipping(ambiguous, entry(ambiguous), [1, 3]), /explicitamente|elétric/);
  }
});

test("recusa identidade, timestamp e perfil divergentes", () => {
  for (const patch of [{ id: "other" }, { ean: "7890000000017" }, { name: "Outro" }, { updatedAt: new Date(1) }, { shippingProfile: { ...profile(), weightGrams: 301 } }]) {
    assert.throws(() => reviewEstimatedShipping({ ...product(), ...patch }, entry(), [1, 3]));
  }
  assert.throws(() => reviewEstimatedShipping(product(), { ...entry(), expectedProfileSha256: "0".repeat(64) }, [1, 3]));
});

test("recusa notify, medicamentos, Popular, receitas e perfis não estimados completos", () => {
  for (const patch of [{ status: "DRAFT" }, { deletedAt: new Date() }, { requiresPrescription: true }, { prescriptionType: "ORDINARY" }, { isPopularPharmacy: true }, { category: "Medicamentos" }, { catalogClassification: { kind: "MEDICINE" } }]) {
    const row = { ...product(), ...patch };
    assert.throws(() => reviewEstimatedShipping(row, entry(product()), [1, 3]));
  }
  for (const patch of [{ notifyOnlyPendingLogistics: true }, { measurementBasis: "measured" }, { weightGrams: null }, { transportReviewed: true }, { enabled: true }]) {
    const row = { ...product(), shippingProfile: { ...profile(), ...patch } };
    assert.throws(() => reviewEstimatedShipping(row, { ...entry(), expectedShippingProfile: row.shippingProfile, expectedProfileSha256: estimatedReviewSha256(row.shippingProfile) }, [1, 3]));
  }
});

test("não amplia serviços anteriores; recusa configuração ausente ou aceitação condicional", () => {
  const row = { ...product(), shippingProfile: { ...profile(), approvedServiceIds: [1] } };
  const expected = { ...entry(), expectedShippingProfile: row.shippingProfile, expectedProfileSha256: estimatedReviewSha256(row.shippingProfile) };
  assert.throws(() => reviewEstimatedShipping(row, expected, [1, 3]));
  assert.deepEqual(reviewEstimatedShipping(row, { ...expected, approvedServiceIds: [1] }, [1, 3]).approvedServiceIds, [1]);
  for (const cargo of ["unspecified", "medication", "perishable", "temperature_sensitive", "liquid"]) {
    assert.throws(() => reviewEstimatedShipping(product(), { ...entry(), cargoKinds: [cargo] }, [1, 3]));
  }
  assert.throws(() => reviewEstimatedShipping(product(), entry(), [1]));
  assert.throws(() => reviewEstimatedShipping(product(), { ...entry(), approvedServiceIds: [999] }, [999]), /Serviço/);
  assert.throws(() => reviewEstimatedShipping(product(), { ...entry(), cargoKinds: ["perfume"] }, [1, 3]));
  assert.deepEqual(reviewEstimatedShipping(product(), { ...entry(), cargoKinds: ["perfume"], approvedServiceIds: [3] }, [1, 3]).approvedServiceIds, [3]);
  const restricted = { ...product(), shippingProfile: { ...profile(), cargoKinds: ["liquid"] } };
  assert.throws(() => reviewEstimatedShipping(restricted, { ...entry(), expectedShippingProfile: restricted.shippingProfile, expectedProfileSha256: estimatedReviewSha256(restricted.shippingProfile) }, [1, 3]), /restrições de carga/);
  const perfume = { ...product(), name: "Perfume sintético" };
  assert.throws(() => reviewEstimatedShipping(perfume, { ...entry(), expectedName: perfume.name }, [1, 3]), /explicitamente/);
});

test("qualificador com ou sem perfume em absorvente seco por unidades não declara perfume líquido", () => {
  for (const name of [
    "Absorvente Always Diários Com Perfume 40 unidades",
    "Absorvente Always Sem Perfume 80 unidades",
    "Absorvente Carefree Proteção Com Perfume 15Un",
    "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 15 unidades",
    "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 40 unidades",
    "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 80 unidades",
  ]) {
    const row = { ...product({ kind: "HYGIENE" }), name }, before = structuredClone(row);
    assert.deepEqual(reviewEstimatedShipping(row, entry(row), [1, 3]), { ...row.shippingProfile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1, 3] }, name);
    assert.deepEqual(row, before);
  }
});

test("exceção de absorvente não libera perfume, apresentação ambígua, spray ou restrição anterior", () => {
  for (const name of [
    "Perfume 40 unidades", "Higiene sem perfume 40 unidades", "Absorvente com perfume",
    "Absorvente perfume 40 unidades", "Absorvente com perfume 40 unidades + perfume 100 ml",
    "Absorvente com perfume 40 unidades + eau de toilette", "Absorvente com perfume 40 unidades + deo colonia",
    "Absorvente com perfume 40 unidades + body splash", "Absorvente com perfume líquido 40 unidades",
    "Absorvente com perfume spray 40 unidades", "Absorvente com perfume aerossol 40 unidades",
    "Absorvente com perfume aerosol 40 unidades", "Absorvente com perfume elétrico 40 unidades",
  ]) {
    const row = { ...product(), name };
    assert.throws(() => reviewEstimatedShipping(row, entry(row), [1, 3]), /explicitamente|elétric/, name);
  }
  const restricted = { ...product(), name: "Absorvente sem perfume 40 unidades", shippingProfile: { ...profile(), cargoKinds: ["perfume"] } };
  assert.throws(() => reviewEstimatedShipping(restricted, entry(restricted), [1, 3]), /restrições de carga/);
});

test("DRAFT_ONLY aceita receita pendente somente com perfil nulo e nunca habilita transporte", () => {
  const row = { ...product(), requiresPrescription: true, shippingProfile: null };
  const input = { ...entry(), action: "DRAFT_ONLY", expectedShippingProfile: null, expectedProfileSha256: estimatedReviewSha256(null),
    draftProfile: { ...profile(), cargoKinds: ["medication"], approvedServiceIds: [] } };
  const { cargoKinds: _cargo, approvedServiceIds: _services, ...draftInput } = input;
  void _cargo; void _services;
  const { provenance: _provenance, ...draftProfile } = input.draftProfile;
  void _provenance;
  const value = { ...draftInput, draftProfile };
  assert.deepEqual(createEstimatedDraftOnly(row, value), draftProfile);
  assert.equal(row.shippingProfile, null);
  for (const patch of [{ enabled: true }, { transportReviewed: true }, { measurementBasis: "measured" }, { approvedServiceIds: [1] }, { weightGrams: 301 }]) {
    assert.throws(() => createEstimatedDraftOnly(row, { ...value, draftProfile: { ...draftProfile, ...patch } }));
  }
  assert.throws(() => createEstimatedDraftOnly(product(), value));
  assert.throws(() => reviewEstimatedShipping(row, entry(), [1, 3]));
});

test("revisor genérico recusa escovas elétricas e refis ambíguos, preservando escova manual", () => {
  const cases = [
    ["Escova dental elétrica Oral-B INF CARS 3+ANO 1UN", "04210201334774"],
    ["Escova dental elétrica Oral-B INF PRINCESS 3+ANO 1UN", "04210201334712"],
    ["Escova dental elétrica Oral-B REF INF PRINCESS 2UN", "04210201338444"],
    ["Escova dental eletrica sem acento", "7890000000000"],
    ["Escova dental electric", "7890000000000"],
    ["Escova dental com bateria", "7890000000000"],
    ["Escova dental a pilha", "7890000000000"],
    ["Escova dental recarregável", "7890000000000"],
  ];
  for (const [name, ean] of cases) {
    const row = { ...product(), name, ean, eanNormalized: ean.padStart(14, "0") }, before = structuredClone(row);
    assert.throws(() => reviewEstimatedShipping(row, entry(row), [1, 3]), /elétric|bateria|pilha|recarreg/);
    assert.deepEqual(row, before);
  }
  const manual = { ...product(), name: "Escova dental manual Oral-B infantil Cars 1un" };
  assert.equal(reviewEstimatedShipping(manual, entry(manual), [1, 3]).enabled, true);
});

const ordinaryMedicineEvidence = {
  carrierCaseId: "2100064", presentation: "50 MG COM REV CT BL X 30", registration: "1000000000001",
  leafletUrl: "https://consultas.anvisa.gov.br/synthetic.pdf", minTemperatureC: 15, maxTemperatureC: 30,
  originalPackaging: true, refrigerationRequired: false, protectFromLight: true, protectFromMoisture: true,
};

function ordinaryFixture() {
  const row = { ...product(), catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false },
    category: "Medicamentos", name: "Losartana sintética 50 mg 30 comprimidos",
    requiresPrescription: true, prescriptionType: "ORDINARY", shippingProfile: { ...profile(), cargoKinds: ["medication", "unspecified"] } };
  const input = { ...entry({ ...row, prescriptionType: "UNREVIEWED" }), action: "REVIEW_MELHOR_ENVIO_ORDINARY", cargoKinds: ["medication"], approvedServiceIds: [1, 2], ordinaryMedicineEvidence };
  return { row, input };
}

test("revisão de medicamento comum mantém perfil e exige ação própria, PAC e SEDEX ativos", () => {
  const { row, input } = ordinaryFixture();
  const before = structuredClone(row);
  const result = reviewOrdinaryMedicineShipping(row, input, [1, 2, 3]);
  assert.deepEqual(row, before);
  assert.deepEqual(result, { ...row.shippingProfile, enabled: true, transportReviewed: true, cargoKinds: ["medication"], approvedServiceIds: [1, 2] });
  assert.throws(() => reviewOrdinaryMedicineShipping(row, input, [1, 3]), /Serviço/);
  assert.throws(() => reviewOrdinaryMedicineShipping(row, { ...input, approvedServiceIds: [1, 3] }, [1, 2, 3]));
  assert.throws(() => reviewOrdinaryMedicineShipping(row, { ...input, cargoKinds: ["general"] }, [1, 2]));
  const { action: _action, ordinaryMedicineEvidence: _evidence, ...generic } = input;
  void _action; void _evidence;
  assert.throws(() => reviewEstimatedShipping(row, generic, [1, 2]));
});

test("operador de medicamento recusa classe divergente, insulina, frio e restrição anterior", () => {
  const { row, input } = ordinaryFixture();
  for (const patch of [{ catalogClassification: null }, { catalogClassification: { kind: "OTHER" } }, { catalogClassification: { kind: "MEDICINE" } },
    { catalogClassification: { ...row.catalogClassification, otc: true } }, { isPopularPharmacy: true }, { requiresPrescription: false },
    { prescriptionType: "CONTROLLED" }, { prescriptionType: "ANTIMICROBIAL" }, { prescriptionType: "UNREVIEWED" },
    { name: "Insulina sintética 50 unidades" }, { name: "Medicação termolábil sintética" }]) {
    const changed = { ...row, ...patch };
    assert.throws(() => reviewOrdinaryMedicineShipping(changed, { ...input, expectedName: changed.name }, [1, 2]), JSON.stringify(patch));
  }
  for (const patch of [{ cargoKinds: ["liquid"] }, { cargoKinds: ["temperature_sensitive"] }, { cargoKinds: ["aerosol"] }, { notifyOnlyPendingLogistics: true }, { approvedServiceIds: [1] }]) {
    const shippingProfile = { ...row.shippingProfile, ...patch };
    assert.throws(() => reviewOrdinaryMedicineShipping({ ...row, shippingProfile }, {
      ...input, expectedShippingProfile: shippingProfile, expectedProfileSha256: estimatedReviewSha256(shippingProfile),
    }, [1, 2]), JSON.stringify(patch));
  }
  assert.throws(() => reviewOrdinaryMedicineShipping({ ...row, updatedAt: new Date(1) }, input, [1, 2]), /Identidade, revisão ou perfil mudou/);
});

test("evidência não aceita armazenamento refrigerado, faixa invertida ou campos extras", () => {
  const { row, input } = ordinaryFixture();
  for (const leafletUrl of [
    "https://www.lbaldacci.com.br/exemplo.pdf", "https://produtos.apsen.com.br/exemplo",
    "https://www.fqmgrupo.com.br/exemplo.pdf", "https://momentafarma.com.br/exemplo.pdf",
  ]) {
    assert.doesNotThrow(() => reviewOrdinaryMedicineShipping(row, {
      ...input, ordinaryMedicineEvidence: { ...ordinaryMedicineEvidence, leafletUrl },
    }, [1, 2]));
  }
  for (const patch of [{ carrierCaseId: "other" }, { leafletUrl: "http://consultas.anvisa.gov.br/synthetic.pdf" }, { leafletUrl: "https://consultas.anvisa.gov.br.spoof.example/synthetic.pdf" }, { registration: "10000" },
    { minTemperatureC: 2, maxTemperatureC: 8 }, { minTemperatureC: 30, maxTemperatureC: 15 }, { minTemperatureC: 25 }, { maxTemperatureC: 25 },
    { originalPackaging: false }, { refrigerationRequired: true }, { unexpected: true }]) {
    assert.throws(() => reviewOrdinaryMedicineShipping(row, { ...input, ordinaryMedicineEvidence: { ...ordinaryMedicineEvidence, ...patch } }, [1, 2]), JSON.stringify(patch));
  }
  assert.throws(() => reviewOrdinaryMedicineShipping(row, { ...input, releaseNotifyOnly: true }, [1, 2]));
});
