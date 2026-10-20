import assert from "node:assert/strict";
import test from "node:test";
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
