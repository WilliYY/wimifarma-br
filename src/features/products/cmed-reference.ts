import { readClassification } from "./catalog-operations";
import { normalizeGtin } from "./gtin";

type CmedRate = { label: string; cents: number };

export type CmedReference = {
  version: 1;
  eanNormalized: string;
  product: string;
  presentation: string;
  laboratory: string;
  registration: string;
  sourceUrl: string;
  sourceSha256: string;
  publishedOn: string;
  observedAt: string;
  rates: CmedRate[];
};

export type PublicPmcReference = {
  amountCents: number;
  column: string;
  publishedOn: string;
  sourceUrl: string;
  presentation: string;
  laboratory: string;
  registration: string;
  rates: CmedRate[];
};

const MAX_CENTS = 100_000_000;
const MAX_EDITION_AGE_MS = 45 * 86_400_000;
const PMC_LABEL = /^PMC\s+(?:Sem\s+Impostos|(?:\d|[1-9]\d)(?:[.,]\d{1,2})?\s*%(?:\s+ALC)?)$/i;
const REGULAR_PMC_LABEL = /^PMC\s+(?:\d|[1-9]\d)(?:[.,]\d{1,2})?\s*%$/i;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MAX_CENTS;
}

function identity(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 2000 && !/[\u0000-\u001f\u007f]/.test(value);
}

function calendarDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

function observationDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value) || calendarDate(value.slice(0, 10)) === null) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function officialSource(value: unknown): value is string {
  // Match the original string too: URL parsing alone normalizes traversal and empty query/hash delimiters.
  if (typeof value !== "string" || !/^https:\/\/www\.gov\.br\/anvisa\/pt-br\/assuntos\/medicamentos\/cmed\/precos\/arquivos\/[A-Za-z0-9][A-Za-z0-9_.-]*\.xlsx\/@@download\/file$/.test(value)) return false;
  const url = new URL(value);
  return url.origin === "https://www.gov.br" && !url.username && !url.password && !url.search && !url.hash;
}

/** An edition is current for at most 45 days; a later import cannot renew it. */
export function resolveCmedReference(value: unknown, ean: unknown, now = Date.now()): PublicPmcReference | null {
  if (!record(value) || value.version !== 1 || !Number.isFinite(now)) return null;
  const canonical = normalizeGtin(ean);
  if (!canonical || value.eanNormalized !== canonical || normalizeGtin(value.eanNormalized) !== canonical) return null;
  if (!identity(value.product) || !identity(value.presentation) || !identity(value.laboratory) || !identity(value.registration) || !officialSource(value.sourceUrl) || typeof value.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.sourceSha256)) return null;
  const publishedAt = calendarDate(value.publishedOn);
  const observedAt = observationDate(value.observedAt);
  if (publishedAt === null || observedAt === null || publishedAt > now || now - publishedAt > MAX_EDITION_AGE_MS || observedAt < publishedAt || observedAt > now) return null;
  if (!Array.isArray(value.rates) || value.rates.length === 0 || value.rates.length > 128) return null;
  const rates: CmedRate[] = [];
  const seen = new Map<string, number>();
  for (const rate of value.rates) {
    if (!record(rate) || typeof rate.label !== "string" || rate.label.length > 100 || /[\u0000-\u001f\u007f]/.test(rate.label) || !PMC_LABEL.test(rate.label.trim()) || !validCents(rate.cents)) return null;
    const key = rate.label.trim().toUpperCase().replace(/\s+/g, " ").replace(/\s*%/g, "%").replace(",", ".").replace(/\d+(?:\.\d+)?/, number => String(Number(number)));
    if (seen.has(key)) {
      if (seen.get(key) !== rate.cents) return null;
      continue;
    }
    seen.set(key, rate.cents);
    rates.push({ label: rate.label, cents: rate.cents });
  }
  // Special columns remain available for detail, but do not anchor the comparison.
  const selected = rates.filter(rate => rate.cents > 0 && REGULAR_PMC_LABEL.test(rate.label.trim())).sort((a, b) => a.cents - b.cents)[0];
  if (!selected) return null;
  return {
    amountCents: selected.cents, column: selected.label, publishedOn: value.publishedOn as string,
    sourceUrl: value.sourceUrl, presentation: value.presentation, laboratory: value.laboratory,
    registration: value.registration, rates,
  };
}

export function pmcSavingsPercent(referenceCents: number, saleCents: number): number | null {
  if (!validCents(referenceCents) || !validCents(saleCents) || saleCents < 1 || referenceCents <= saleCents) return null;
  const percent = Math.floor((referenceCents - saleCents) * 100 / referenceCents);
  return percent >= 1 ? percent : null;
}

export function canDisplayPmcSavings(product: { requiresPrescription?: boolean; prescriptionType?: string; isPopularPharmacy?: boolean; catalogClassification?: unknown }): boolean {
  const classification = readClassification(product.catalogClassification);
  return classification.kind === "MEDICINE" && classification.otc === true && product.requiresPrescription === false && product.isPopularPharmacy !== true && (product.prescriptionType === undefined || product.prescriptionType === "UNREVIEWED");
}
