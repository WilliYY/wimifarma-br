import assert from "node:assert/strict";
import test from "node:test";
import { canDisplayPmcSavings, pmcSavingsPercent, resolveCmedReference, type CmedReference } from "./cmed-reference";
import { gtinVariants, normalizeGtin } from "./gtin";

const now = Date.parse("2026-10-23T12:00:00.000Z");
const ean = "7896004724577";
const sourceUrl = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_conformidade_2026_10_v1.xlsx/@@download/file";
function reference(patch: Partial<CmedReference> = {}): CmedReference {
  return {
    version: 1, eanNormalized: "07896004724577", product: "Medicamento sintético", presentation: "10 MG CT 30 COM",
    laboratory: "Laboratório sintético", registration: "1234567890123", sourceUrl,
    sourceSha256: "a".repeat(64), publishedOn: "2026-10-09", observedAt: "2026-10-22T12:00:00.000Z",
    rates: [{ label: "PMC 20%", cents: 2500 }, { label: "PMC Sem Impostos", cents: 2000 }], ...patch,
  };
}

test("GTIN helpers preserve checksum, zero padding and packaging identity", () => {
  assert.equal(normalizeGtin(ean), "07896004724577");
  assert.deepEqual(gtinVariants(ean), [ean, "07896004724577"]);
  assert.equal(normalizeGtin("7896004724578"), null);
  assert.equal(normalizeGtin(7896004724577), null);
});

test("CMED returns the lowest positive regular PMC and preserves official rate labels", () => {
  const result = resolveCmedReference(reference(), ean, now);
  assert.deepEqual(result, {
    amountCents: 2500, column: "PMC 20%", publishedOn: "2026-10-09", sourceUrl,
    presentation: "10 MG CT 30 COM", laboratory: "Laboratório sintético", registration: "1234567890123",
    rates: reference().rates,
  });
});

test("CMED excludes tax-free and ALC columns from comparison and keeps them in detail", () => {
  const rates = [{ label: "PMC Sem Impostos", cents: 100 }, { label: "PMC 12 %  ALC", cents: 200 }, { label: "PMC 17,5 %", cents: 2000 }, { label: "PMC 0 %", cents: 1900 }];
  const result = resolveCmedReference(reference({ rates }), ean, now);
  assert.equal(result?.amountCents, 1900);
  assert.equal(result?.column, "PMC 0 %");
  assert.deepEqual(result?.rates, rates);
  assert.equal(resolveCmedReference(reference({ rates: rates.slice(0, 2) }), ean, now), null);
});

test("CMED requires canonical exact GTIN with a valid checksum", () => {
  for (const invalid of ["07896004724578", ean, "17896004724574", "0000000000000", "", null]) {
    assert.equal(resolveCmedReference({ ...reference(), eanNormalized: invalid }, ean, now), null);
  }
  assert.equal(resolveCmedReference(reference(), "7896004724578", now), null);
  assert.equal(resolveCmedReference(reference(), "17896004724574", now), null);
});

test("CMED accepts only the official HTTPS XLSX download URL", () => {
  for (const invalid of [
    sourceUrl.replace("https:", "http:"), sourceUrl.replace("www.gov.br", "www.gov.br.evil.test"),
    sourceUrl.replace("www.gov.br", "anvisa.gov.br"), sourceUrl.replace("https://", "https://user:pass@"),
    `${sourceUrl}?download=1`, `${sourceUrl}#file`, `${sourceUrl}?`, `${sourceUrl}#`,
    sourceUrl.replace(".xlsx", ".xls"), sourceUrl.replace("/arquivos/", "/other/"),
    sourceUrl.replace("/@@download/file", ""), sourceUrl.replace("https://", "https://www.gov.br@"),
    sourceUrl.replace("www.gov.br", "www.gov.br:444"), sourceUrl.replace("lista_conformidade", "../lista_conformidade"),
  ]) assert.equal(resolveCmedReference(reference({ sourceUrl: invalid }), ean, now), null, invalid);
});

test("CMED requires version, source hash and nonempty identity strings", () => {
  for (const value of [undefined, null, [], "text", {}, { ...reference(), version: 2 }]) {
    assert.equal(resolveCmedReference(value, ean, now), null);
  }
  for (const sourceSha256 of ["", "a".repeat(63), "g".repeat(64)]) {
    assert.equal(resolveCmedReference(reference({ sourceSha256 }), ean, now), null);
  }
  for (const field of ["product", "presentation", "laboratory", "registration"] as const) {
    assert.equal(resolveCmedReference(reference({ [field]: " " }), ean, now), null);
    assert.equal(resolveCmedReference({ ...reference(), [field]: 123 }, ean, now), null);
  }
});

test("CMED validates calendar dates and never refreshes an old edition from observedAt", () => {
  for (const publishedOn of ["2026-02-30", "2026-13-01", "2026-10-24", "2026-10-09T00:00:00Z", "2026-9-09", "2026-09-07"]) {
    assert.equal(resolveCmedReference(reference({ publishedOn }), ean, now), null, publishedOn);
  }
  for (const observedAt of ["invalid", "2026-10-24T00:00:00.000Z", "2026-10-08T23:59:59Z", "2026-02-30T00:00:00Z", "2026-10-22"]) {
    assert.equal(resolveCmedReference(reference({ observedAt }), ean, now), null, observedAt);
  }
  assert.ok(resolveCmedReference(reference({ publishedOn: "2026-09-08" }), ean, Date.parse("2026-10-23T00:00:00Z")));
  assert.equal(resolveCmedReference(reference({ publishedOn: "2026-09-08" }), ean, Date.parse("2026-10-23T00:00:00.001Z")), null);
  assert.equal(resolveCmedReference(reference(), ean, Number.NaN), null);
});

test("CMED rejects invalid monetary values and non-PMC columns", () => {
  for (const cents of [-1, 1.1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, 100_000_001, "100"] ) {
    assert.equal(resolveCmedReference({ ...reference(), rates: [{ label: "PMC 18%", cents }] }, ean, now), null);
  }
  for (const label of ["PF 18%", "PMVG 18%", "PMCC 18%", "PMC PF", "PMC PMVG", "", "PMC 18%\nPF 18%"]) {
    assert.equal(resolveCmedReference(reference({ rates: [{ label, cents: 1000 }] }), ean, now), null, label);
  }
  for (const rates of [[], [{ label: "PMC 18%", cents: 0 }]]) {
    assert.equal(resolveCmedReference(reference({ rates }), ean, now), null);
  }
  assert.equal(resolveCmedReference({ ...reference(), rates: "PMC" }, ean, now), null);
  assert.equal(resolveCmedReference({ ...reference(), rates: [null] }, ean, now), null);
  assert.equal(resolveCmedReference(reference({ rates: [{ label: "PMC 18%", cents: 0 }, { label: "PMC 20%", cents: 1234 }] }), ean, now)?.amountCents, 1234);
});

test("CMED rejects conflicting duplicate rates and consolidates identical repeats", () => {
  assert.equal(resolveCmedReference(reference({ rates: [{ label: "PMC 18%", cents: 1000 }, { label: " pmc 18% ", cents: 1100 }] }), ean, now), null);
  assert.equal(resolveCmedReference(reference({ rates: [{ label: "PMC 17,5 %", cents: 1000 }, { label: "PMC 17.50%", cents: 1100 }] }), ean, now), null);
  const rates = [{ label: "PMC 18%", cents: 1000 }, { label: "PMC 18%", cents: 1000 }];
  assert.deepEqual(resolveCmedReference(reference({ rates }), ean, now)?.rates, [rates[0]]);
});

test("CMED accepts every official numeric rate including decimal and ALC headers", () => {
  const rates = ["0", "12", "17", "17,5", "18", "19", "19,5", "20", "20,5", "21", "22", "22,5", "23"].flatMap((rate, index) => [
    { label: `PMC ${rate} %`, cents: 1000 + index }, { label: `PMC ${rate} %  ALC`, cents: 800 + index },
  ]);
  assert.deepEqual(resolveCmedReference(reference({ rates }), ean, now)?.rates, rates);
});

test("savings use integer floor and cannot exaggerate, promote non-discounts or invalid prices", () => {
  assert.equal(pmcSavingsPercent(3000, 2000), 33);
  assert.equal(pmcSavingsPercent(10000, 9901), null);
  assert.equal(pmcSavingsPercent(10000, 9900), 1);
  assert.equal(pmcSavingsPercent(10000, 100), 99);
  for (const [referenceCents, saleCents] of [[1000, 1000], [1000, 1001], [0, 100], [100, 0], [-1, 1], [1.1, 1], [100, Number.NaN], [Number.MAX_SAFE_INTEGER + 1, 100], [100_000_001, 100]]) {
    assert.equal(pmcSavingsPercent(referenceCents, saleCents), null);
  }
});

test("promotional savings require explicit MIP classification and no prescription or Popular Pharmacy", () => {
  const product = { requiresPrescription: false, catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true } };
  assert.equal(canDisplayPmcSavings(product), true);
  assert.equal(canDisplayPmcSavings({ ...product, prescriptionType: "UNREVIEWED" }), true);
  for (const patch of [{ requiresPrescription: true }, { requiresPrescription: undefined }, { isPopularPharmacy: true }, { prescriptionType: "ORDINARY" }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "ANTIMICROBIAL" }, { prescriptionType: "" }, { catalogClassification: undefined }, { catalogClassification: { kind: "MEDICINE", otc: true } }, { catalogClassification: { ...product.catalogClassification, otc: false } }, { catalogClassification: { ...product.catalogClassification, kind: "HYGIENE" } }]) {
    assert.equal(canDisplayPmcSavings({ ...product, ...patch }), false);
  }
});
