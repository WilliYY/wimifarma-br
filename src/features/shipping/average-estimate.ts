import { estimateWeightOnly, WEIGHT_ESTIMATE_POLICY } from "./base-estimate";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema, normalizeLogisticsGtin } from "./logistics-evidence";
import { shippingDraftSchema, type ShippingDraft } from "./product-draft";

export type AverageEstimateIdentity = {
  gtin: string; name: string; category?: string | null; brand?: string | null; activeIngredients?: string[];
  requiresPrescription: boolean; prescriptionType?: string | null; isPopularPharmacy: boolean;
  logisticsEvidence?: unknown;
};
export const AVERAGE_PACKAGE_POLICY = {
  version: "comparable-package-v1", minimumReferenceGtins: 2, maximumSpreadRatio: 2,
  totalProtectionPerAxisCm: 2, externalPackagingReserveGrams: WEIGHT_ESTIMATE_POLICY.externalPackagingReserveGrams,
} as const;
export type AverageShippingEstimate = {
  policyVersion: string; basis: "EXACT_RETAIL_DIMENSIONS" | "ORAL_SOLID_COHORT";
  draft: ShippingDraft & { lengthCm: number; widthCm: number; heightCm: number };
  sourceGtins: string[]; sourceObservationIds: string[]; sourceSha256: string[];
  meanRetailSidesCm: number[]; meanRetailWeightGrams: number | null;
  maximumRetailSidesCm: number[]; maximumRetailWeightGrams: number | null;
  weightBasis: "EXACT_GTIN_GROSS" | "COHORT_ENVELOPE" | "WEIGHT_POLICY";
  protectionPerAxisCm: number; externalPackagingReserveGrams: number; explanation: string;
};
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function oralCohort(input: AverageEstimateIdentity) {
  const base = estimateWeightOnly({ ...input, logisticsEvidence: null });
  if (base?.family !== "ORAL_SOLID" || !base.declaredContent) return null;
  const name = normalize(input.name);
  if (/\b(?:frasco|pote|sache|envelope|sublingual|liberacao|prolongad\w*|retard|orodispers\w*|xr|sr|cr)\b/.test(name)) return null;
  const form = /\b(?:capsulas?|caps|cps)\b/.test(name) ? "capsule" : /\bdrageas?\b/.test(name) ? "dragee" : /\b(?:comprimidos?|comp|cp)\b/.test(name) ? "tablet" : null;
  const ingredients = [...new Set((input.activeIngredients ?? []).flatMap(value => normalize(value).split("+").map(part => part.trim())))].sort();
  if (!form || !ingredients.length || ingredients.some(value => value.length < 3 || /nao informado|desconhecid|unclassified/.test(value))) return null;
  return JSON.stringify({ ingredients, form, count: base.declaredContent });
}

function retailDimensions(input: AverageEstimateIdentity, requireGross: boolean) {
  const parsed = logisticsEvidenceSchema.safeParse(input.logisticsEvidence);
  if (!parsed.success || parsed.data.gtin !== input.gtin || evidenceStatus(parsed.data) === "conflict") return null;
  const rows = activeLogisticsObservations(parsed.data).filter(row => row.packagingLevel === "retail_unit" && row.units === 1 &&
    !row.identityConflict && row.sidesMm && row.dimensionsBasis !== "unlabeled" &&
    (!requireGross || row.weightBasis === "gross_explicit" && row.weightGrams !== null)).sort((a, b) => a.id.localeCompare(b.id));
  if (!rows.length) return null;
  const sides = [...rows[0].sidesMm!].sort((a, b) => b - a).map(mm => mm / 10);
  const gross = activeLogisticsObservations(parsed.data).find(row => row.packagingLevel === "retail_unit" && row.units === 1 && row.weightBasis === "gross_explicit" && row.weightGrams !== null);
  const sources = gross && !rows.some(row => row.id === gross.id) ? [...rows, gross] : rows;
  return { gtin: input.gtin, sides, weight: gross?.weightGrams ?? null, observations: sources.map(row => `${input.gtin}:${row.id}`), hashes: sources.map(row => row.source.sha256) };
}

/** Averages describe comparable references. Drafts use their maximum envelope plus hypothetical protection, never measured fit. */
export function estimateAverageShipping(input: AverageEstimateIdentity, catalog: AverageEstimateIdentity[]): AverageShippingEstimate | null {
  if (normalizeLogisticsGtin(input.gtin) !== input.gtin) return null;
  const base = estimateWeightOnly(input);
  if (!base) return null;
  const own = retailDimensions(input, false);
  const key = oralCohort(input);
  const counts = new Map<string, number>();
  for (const item of catalog) counts.set(item.gtin, (counts.get(item.gtin) ?? 0) + 1);
  const samples = own ? [own] : key ? catalog.filter(item => item.logisticsEvidence != null && normalizeLogisticsGtin(item.gtin) === item.gtin && counts.get(item.gtin) === 1 &&
    item.gtin !== input.gtin && oralCohort(item) === key && estimateWeightOnly(item) !== null)
    .map(item => retailDimensions(item, true)).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.gtin.localeCompare(b.gtin)) : [];
  if (!own && samples.length < AVERAGE_PACKAGE_POLICY.minimumReferenceGtins) return null;
  const weights = samples.flatMap(sample => sample.weight === null ? [] : [sample.weight]);
  if (!own && [...[0, 1, 2].map(axis => samples.map(sample => sample.sides[axis])), weights]
    .some(values => Math.max(...values) / Math.min(...values) > AVERAGE_PACKAGE_POLICY.maximumSpreadRatio)) return null;
  const meanRetailSidesCm = [0, 1, 2].map(axis => samples.reduce((sum, sample) => sum + sample.sides[axis], 0) / samples.length);
  const maximumRetailSidesCm = [0, 1, 2].map(axis => Math.max(...samples.map(sample => sample.sides[axis])));
  const sides = maximumRetailSidesCm.map(side => Math.ceil((side + AVERAGE_PACKAGE_POLICY.totalProtectionPerAxisCm) * 2) / 2);
  if (sides.some(side => side > 200)) return null;
  const meanRetailWeightGrams = weights.length ? weights.reduce((sum, weight) => sum + weight, 0) / weights.length : null;
  const maximumRetailWeightGrams = weights.length ? Math.max(...weights) : null;
  const ownGross = base.family === "EXACT_GROSS_REFERENCE";
  const weightGrams = ownGross || maximumRetailWeightGrams === null ? base.draft.weightGrams : Math.ceil((maximumRetailWeightGrams + AVERAGE_PACKAGE_POLICY.externalPackagingReserveGrams) / 10) * 10;
  const ownWeightSources = ownGross ? activeLogisticsObservations(logisticsEvidenceSchema.parse(input.logisticsEvidence)).filter(row => base.sourceObservationIds.includes(row.id)) : [];
  const draft = shippingDraftSchema.safeParse({ enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams,
    lengthCm: sides[0], widthCm: sides[1], heightCm: sides[2], reference: null });
  if (!draft.success) return null;
  return {
    policyVersion: AVERAGE_PACKAGE_POLICY.version, basis: own ? "EXACT_RETAIL_DIMENSIONS" : "ORAL_SOLID_COHORT",
    draft: { ...draft.data, lengthCm: sides[0], widthCm: sides[1], heightCm: sides[2] },
    sourceGtins: [...new Set([...samples.map(sample => sample.gtin), ...ownWeightSources.map(() => input.gtin)])].sort(),
    sourceObservationIds: [...new Set([...samples.flatMap(sample => sample.observations), ...ownWeightSources.map(row => `${input.gtin}:${row.id}`)])].sort(),
    sourceSha256: [...new Set([...samples.flatMap(sample => sample.hashes), ...ownWeightSources.map(row => row.source.sha256)])].sort(), meanRetailSidesCm, meanRetailWeightGrams, maximumRetailSidesCm, maximumRetailWeightGrams,
    weightBasis: ownGross ? "EXACT_GTIN_GROSS" : maximumRetailWeightGrams === null ? "WEIGHT_POLICY" : "COHORT_ENVELOPE",
    protectionPerAxisCm: AVERAGE_PACKAGE_POLICY.totalProtectionPerAxisCm, externalPackagingReserveGrams: AVERAGE_PACKAGE_POLICY.externalPackagingReserveGrams,
    explanation: `${own ? "Dimensões comerciais declaradas para o próprio GTIN" : `Média descritiva de ${samples.length} GTINs com mesma composição cadastrada, forma e contagem; dispersão limitada a 2 vezes`}. Eixos ordenados para permitir rotação. Rascunho usa o maior lado observado de cada eixo + 2 cm totais de proteção hipotética, arredondados para cima em 0,5 cm. ${ownGross ? "Peso prioriza o bruto declarado do próprio GTIN" : maximumRetailWeightGrams === null ? "Peso conserva a hipótese da política anterior" : "Peso usa o maior bruto da coorte"}, com 100 g hipotéticos de caixa/proteção e arredondamento em 10 g; não somar tara novamente. Não é pesagem, média representativa do mercado ou limite físico garantido; materiais, lote e encaixe continuam pendentes.`,
  };
}
