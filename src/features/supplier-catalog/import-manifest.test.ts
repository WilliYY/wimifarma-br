import assert from "node:assert/strict";
import test from "node:test";

test("importação rejeita instruções comerciais internas e apresentação duplicada", () => {
  for (const patch of [
    { description: "Fralda Bigfral para adultos. Dividir custos pelo número de unidades antes de cadastrar o produto na loja." },
    { description: "Fralda Bigfral Derma Plus Juvenil 10 unidades. Unidade comercial identificada na fonte do distribuidor, sem fracionar caixa ou dividir custos. Confira o tamanho, a quantidade e as orientações na embalagem." },
    { name: "Fralda Bigfral Adulto G 10un Adulto G 10un" },
    { name: "Fralda Bigfral Derma Plus Adulto J 10Unadulto Bigfral Derma Plus J Pacote 10 unidades" },
  ]) assert.equal(supplierImportManifestSchema.safeParse({ products: [{ ...row, ...patch }] }).success, false);
});
import { supplierImportManifestSchema, assertImportTarget, persistedPrescriptionType } from "./import-manifest";

const evidence = { sourceUrl: "https://example.org/presentation", observedAt: "2026-10-01T10:00:00Z" };
const offer = { supplier: "ANB", externalCode: "synthetic", unitCostCents: 100, available: true,
  observedAt: "2026-10-18T10:00:00Z", validUntil: "2026-10-19T10:00:00Z", sourceUrl: evidence.sourceUrl };
const row = { ean: "7896004708539", name: "Produto sintético", slug: "produto-sintetico", brand: "Teste", category: "Teste",
  description: "Descrição sintética de apresentação para testes internos sem promessa clínica ou associação com catálogo real.",
  activeIngredients: ["Sintético"], requiresPrescription: true, prescriptionType: "ORDINARY", offers: [{ ...offer, retailCeilingCents: 1000 }] };
const mixed = () => ({ manifestVersion: 1, products: [{ ...row, supplierMarkupBps: 3500,
  catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false },
  evidence: { identity: { ...evidence }, classification: { ...evidence } } }] });

test("associações exigem pares explícitos e conferidos, sem associar doses pela ordem", () => {
  const base = mixed();
  const busco = { ...base.products[0], name: "Buscoduo 10 mg + 500 mg 20 comprimidos revestidos", activeIngredients: ["PARACETAMOL", "BUTILBROMETO DE ESCOPOLAMINA"] };
  for (const description of [row.description, "Paracetamol 10 mg + Butilbrometo de escopolamina 500 mg. " + row.description,
    "Paracetamol 500 mg + Butilbrometo de escopolamina 10 mg. Paracetamol 10 mg. " + row.description]) {
    assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...busco, description }] }).success, false);
  }
  assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...busco, description: "Paracetamol 500 mg + Butilbrometo de escopolamina 10 mg. " + row.description }] }).success, true);
  const unknown = { ...busco, name: "Associação sintética 10 mg + 500 mg 20 comprimidos", activeIngredients: ["Sintético A", "Sintético B"] };
  assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [unknown] }).success, false);
  assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...unknown, description: "Sintético A 10 mg + Sintético B 500 mg. " + row.description }] }).success, false);
  assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...unknown, name: "Sintético A 10 mg + Sintético B 500 mg 20 comprimidos" }] }).success, true);
});

test("manifestos Rx e OTC recusam associação com ingredientes vazios, agrupados ou título sem pares", () => {
  for (const otc of [false, true]) {
    const base = mixed();
    const medicine = { ...base.products[0], name: "Associação sintética 450 mg + 50 mg 12 comprimidos", requiresPrescription: !otc, prescriptionType: otc ? "NONE" : "ORDINARY", catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc }, description: "Paracetamol 450 mg + Cafeína 50 mg. " + row.description };
    for (const activeIngredients of [[], ["PARACETAMOL + CAFEÍNA"], ["PARACETAMOL"], ["PARACETAMOL", "CAFEÍNA"]]) {
      assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...medicine, activeIngredients }] }).success, false);
      for (const strength of ["450 + 50 mg", "450/50 mg", "450mg+50", "450 + 50 + 35 mg"]) {
        assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...medicine, name: `Associação sintética ${strength} 20 comprimidos`, activeIngredients }] }).success, false, strength);
      }
    }
    for (const name of ["Associação sintética 450 mg 20 comprimidos", "Associação sintética 20 comprimidos"]) {
      assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...medicine, name, activeIngredients: ["PARACETAMOL", "CAFEÍNA"] }] }).success, false, name);
    }
    assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...medicine, name: "Paracetamol 450 mg + Cafeína 50 mg 12 comprimidos", activeIngredients: ["CAFEÍNA", "PARACETAMOL"] }] }).success, true);
    for (const name of ["Suspensão 125 mg/5 mL frasco 60 mL", "Creme 10 mg/g bisnaga 30 g", "Suspensão 125 mg/5 mL frasco 60 g"]) {
      assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [{ ...medicine, name, activeIngredients: ["Sintético"] }] }).success, true, name);
    }
  }
});

test("importação do Alenia exige nome inalatório e não inventa acessório", () => {
  const base = mixed();
  const alenia = { ...base.products[0], name: "Alenia 6 mcg + 200 mcg 60 cápsulas dura", activeIngredients: ["BUDESONIDA", "FUMARATO DE FORMOTEROL DIIDRATADO"], description: "Budesonida 200 mcg + Fumarato de formoterol di-hidratado 6 mcg. " + row.description };
  assert.equal(supplierImportManifestSchema.safeParse({ ...base, products: [alenia] }).success, false);
  const result = supplierImportManifestSchema.parse({ ...base, products: [{ ...alenia, name: `${alenia.name} · pó para inalação` }] });
  assert.doesNotMatch(result.products[0].name, /inalador|refil/i);
});

test("manifest preserves numeric ST and missing ST remains an explicit pending observation", () => {
  for (const substitutionTaxCents of [null, 0, 95]) {
    const input = mixed();
    const parsed = supplierImportManifestSchema.parse({ ...input, products: [{ ...input.products[0], offers: [{ ...row.offers[0], supplier: "PROFARMA", substitutionTaxCents }] }] });
    assert.equal(parsed.products[0].offers[0].substitutionTaxCents, substitutionTaxCents);
  }
});

test("manifest accepts four distinct commercial suppliers and rejects references or duplicate GAM", () => {
  const input = mixed();
  const offers = ["ANB", "PROFARMA", "DM", "GAM"].map(supplier => ({ ...row.offers[0], supplier }));
  const manifest = (rows: typeof offers) => ({ ...input, products: [{ ...input.products[0], offers: rows }] });
  assert.deepEqual(supplierImportManifestSchema.parse(manifest(offers)).products[0].offers.map(item => item.supplier), ["ANB", "PROFARMA", "DM", "GAM"]);
  for (const supplier of ["eGAM", "SANTA_CRUZ", "OTHER", "gam", "dm", "DM "]) {
    assert.equal(supplierImportManifestSchema.safeParse(manifest([{ ...offers[0], supplier }])).success, false);
  }
  assert.equal(supplierImportManifestSchema.safeParse(manifest([offers[3], offers[3]])).success, false);
  assert.equal(supplierImportManifestSchema.safeParse(manifest([...offers, offers[3]])).success, false);
});

test("explicit antimicrobial imports retain the prescription type and never become ordinary or controlled", () => {
  const antimicrobial = { ...mixed().products[0], prescriptionType: "ANTIMICROBIAL" };
  const parsed = supplierImportManifestSchema.parse({ manifestVersion: 1, products: [antimicrobial] }).products[0];
  assert.equal(persistedPrescriptionType(parsed), "ANTIMICROBIAL");
  assert.doesNotThrow(() => assertImportTarget(parsed, { ...antimicrobial, inventorySource: "DISTRIBUTOR", deletedAt: null, isPopularPharmacy: false }));
  assert.throws(() => assertImportTarget(parsed, { ...antimicrobial, prescriptionType: "ORDINARY", inventorySource: "DISTRIBUTOR", deletedAt: null, isPopularPharmacy: false }));
  for (const patch of [
    { requiresPrescription: false }, { prescriptionType: "CONTROLLED" },
    { activeIngredients: [] }, { offers: [offer] },
    { catalogClassification: { ...antimicrobial.catalogClassification, otc: true } },
  ]) assert.equal(supplierImportManifestSchema.safeParse({ manifestVersion: 1, products: [{ ...antimicrobial, ...patch }] }).success, false);
  assert.equal(supplierImportManifestSchema.safeParse({ products: [{ ...row, prescriptionType: "ANTIMICROBIAL" }] }).success, false);
});

test("legacy prescription files retain 60% and explicit mixed entries require evidence and markup", () => {
  assert.equal(supplierImportManifestSchema.parse({ products: [row] }).products[0].supplierMarkupBps, 6000);
  assert.equal(supplierImportManifestSchema.parse(mixed()).products[0].supplierMarkupBps, 3500);
  for (const field of ["supplierMarkupBps", "catalogClassification", "evidence"] as const) {
    const input = mixed(); delete (input.products[0] as Record<string, unknown>)[field];
    assert.equal(supplierImportManifestSchema.safeParse(input).success, false);
  }
});

test("mixed OTC/hygiene accepts no ceiling; prescription needs ceiling and never derives Rx from kind", () => {
  const input = mixed();
  Object.assign(input.products[0], { requiresPrescription: false, prescriptionType: "NONE", offers: [offer],
    catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true } });
  assert.equal(supplierImportManifestSchema.safeParse(input).success, true);
  assert.equal(persistedPrescriptionType(supplierImportManifestSchema.parse(input).products[0]), "UNREVIEWED");
  Object.assign(input.products[0], { catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } });
  assert.equal(supplierImportManifestSchema.safeParse(input).success, true);
  Object.assign(input.products[0], { requiresPrescription: true, prescriptionType: "ORDINARY" });
  assert.equal(supplierImportManifestSchema.safeParse(input).success, false);
  assert.equal(supplierImportManifestSchema.safeParse({ products: [{ ...row, offers: [offer] }] }).success, false);
});

for (const kind of ["OTHER", "SUPPLEMENT", "FOOD"]) test(`explicit non-medicinal ${kind} imports keep evidence and cannot acquire prescription or medicine flags`, () => {
  const input = mixed();
  const classification = { kind, medicineClass: "UNCLASSIFIED", ethical: false, otc: false };
  Object.assign(input.products[0], { requiresPrescription: false, prescriptionType: "NONE", activeIngredients: [], offers: [offer], catalogClassification: classification });
  assert.equal(supplierImportManifestSchema.safeParse(input).success, true);
  for (const patch of [
    { requiresPrescription: true, prescriptionType: "ORDINARY" },
    { requiresPrescription: true, prescriptionType: "ANTIMICROBIAL" },
    { requiresPrescription: false, prescriptionType: "ORDINARY" },
    { catalogClassification: { ...classification, medicineClass: "GENERIC" } },
    { catalogClassification: { ...classification, otc: true } },
    { catalogClassification: { ...classification, ethical: true } },
  ]) assert.equal(supplierImportManifestSchema.safeParse({ ...input, products: [{ ...input.products[0], ...patch }] }).success, false);
});

test("a single mixed batch keeps prescription, OTC and perfumery rules separate", () => {
  const rx = mixed().products[0];
  const otc = { ...rx, ean: "7896181915638", slug: "otc-sintetico", requiresPrescription: false, prescriptionType: "NONE",
    supplierMarkupBps: 2500, offers: [offer], catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true } };
  const perfumery = { ...otc, ean: "7896422507738", slug: "perfumaria-sintetica", activeIngredients: [],
    supplierMarkupBps: 10000, catalogClassification: { kind: "PERFUMERY", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } };
  const result = supplierImportManifestSchema.parse({ manifestVersion: 1, products: [rx, otc, perfumery] });
  assert.deepEqual(result.products.map(product => [product.requiresPrescription, product.supplierMarkupBps]), [[true, 3500], [false, 2500], [false, 10000]]);
  assert.equal(supplierImportManifestSchema.safeParse({ manifestVersion: 1, products: Array(51).fill(rx) }).success, false);
  assert.equal(supplierImportManifestSchema.safeParse({ products: [otc] }).success, false);
  assert.equal(supplierImportManifestSchema.safeParse({ manifestVersion: 1, products: [{ ...rx,
    catalogClassification: { ...rx.catalogClassification, medicineClass: "UNCLASSIFIED" } }] }).success, false);
});

test("strict manifest rejects duplicate GTIN, fields, credential URLs and unsafe classifications", () => {
  const input = mixed();
  assert.equal(supplierImportManifestSchema.safeParse({ ...input, products: [...input.products, { ...input.products[0], ean: "07896004708539" }] }).success, false);
  for (const fields of [{ stock: 50 }, { isPopularPharmacy: true }, { imageUrl: "https://example.org/a.jpg" }, { prescriptionType: "CONTROLLED" }, { supplierMarkupBps: 10001 }]) {
    assert.equal(supplierImportManifestSchema.safeParse({ ...input, products: [{ ...input.products[0], ...fields }] }).success, false);
  }
  for (const url of ["http://example.org", "https://user:password@example.org", "https://example.org/?token=secret"]) {
    const invalid = mixed(); invalid.products[0].evidence.identity.sourceUrl = url;
    assert.equal(supplierImportManifestSchema.safeParse(invalid).success, false);
  }
});

test("shipping estimates cannot enable transport and internal pictures remain Rx-only", () => {
  const input = mixed(); const shippingProfile = { measurementBasis: "estimated", enabled: false, transportReviewed: false,
    weightGrams: 500, widthCm: 21, heightCm: 21, lengthCm: 22 };
  assert.equal(supplierImportManifestSchema.safeParse({ ...input, products: [{ ...input.products[0], shippingProfile }] }).success, true);
  for (const fields of [{ enabled: true }, { transportReviewed: true }, { measurementBasis: "measured" }, { unexpected: true }]) {
    assert.equal(supplierImportManifestSchema.safeParse({ ...input, products: [{ ...input.products[0], shippingProfile: { ...shippingProfile, ...fields } }] }).success, false);
  }
  assert.equal(supplierImportManifestSchema.safeParse({ ...input, products: [{ ...input.products[0], requiresPrescription: false, prescriptionType: "NONE",
    internalImage: { filePath: "private.webp", mimeType: "image/webp", sourceUrl: evidence.sourceUrl, ean: row.ean } }] }).success, false);
});

test("existing identity, physical/deleted collisions and prescription transitions fail closed", () => {
  const parsed = supplierImportManifestSchema.parse(mixed()).products[0];
  const current = { ...row, inventorySource: "DISTRIBUTOR", deletedAt: null, isPopularPharmacy: false };
  assert.doesNotThrow(() => assertImportTarget(parsed, current));
  for (const fields of [{ inventorySource: "PHARMACY" }, { deletedAt: new Date() }, { isPopularPharmacy: true }, { ean: "7896181915638" }, { name: "Other" }, { requiresPrescription: false }, { prescriptionType: "CONTROLLED" }]) {
    assert.throws(() => assertImportTarget(parsed, { ...current, ...fields }));
  }
});
