import { z } from "zod";
import type { AverageEstimateIdentity } from "./average-estimate";
import { estimateWeightOnly, type WeightOnlyEstimate } from "./base-estimate";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema, logisticsGtinSchema } from "./logistics-evidence";
import { shippingDraftSchema, type ShippingDraft } from "./product-draft";

const uniqueGtins = (minimum: number, maximum: number) => z.array(logisticsGtinSchema).min(minimum).max(maximum)
  .refine(values => new Set(values).size === values.length, "GTIN repetido no cenário de caixa.");
const plannedContainerShape = {
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), label: z.string().trim().min(3).max(200),
  geometryMarginCm: z.number().int().min(1).max(3),
  outerBoxCm: z.tuple([z.literal(24), z.literal(15), z.literal(10)]),
  memberGtins: uniqueGtins(1, 500), referenceGtins: uniqueGtins(2, 100),
  rationale: z.string().trim().min(10).max(2000), packingHypothesis: z.string().trim().min(10).max(2000),
};
export const plannedContainerSchema = z.discriminatedUnion("kind", [
  z.object({ ...plannedContainerShape, kind: z.literal("NORMAL_TABLETS_1_TO_30"), countMin: z.literal(1), countMax: z.literal(30) }).strict(),
  z.object({ ...plannedContainerShape, kind: z.literal("DENTAL_TUBE_UP_TO_140G"), contentMaxGrams: z.literal(140) }).strict(),
  z.object({ ...plannedContainerShape, kind: z.literal("SHAMPOO_BOTTLE_UP_TO_400ML"), contentMaxMl: z.literal(400) }).strict(),
]);
export const plannedContainersSchema = z.array(plannedContainerSchema).max(100).superRefine((containers, context) => {
  const ids = new Set<string>();
  const members = new Set<string>();
  for (const container of containers) {
    if (ids.has(container.id)) context.addIssue({ code: "custom", message: "Identificador de cenário repetido." });
    ids.add(container.id);
    for (const gtin of container.memberGtins) {
      if (members.has(gtin)) context.addIssue({ code: "custom", message: "GTIN membro de mais de um cenário." });
      members.add(gtin);
    }
  }
});
export type PlannedContainer = z.infer<typeof plannedContainerSchema>;
export type PlannedContainerEstimate = {
  policyVersion: "planned-container-v2"; basis: "PLANNED_OUTER_BOX"; containerId: string;
  draft: ShippingDraft & { lengthCm: number; widthCm: number; heightCm: number };
  weightBasis: "EXACT_GTIN_GROSS" | "WEIGHT_POLICY";
  weightComputation: Pick<WeightOnlyEstimate, "policyVersion" | "family" | "declaredContent" | "declaredUnit" | "densityHypothesisGramsPerMl" | "estimatedRetailGrams" | "retailPackagingReserveGrams" | "externalPackagingReserveGrams"> & { roundingStepGrams: 10 };
  sourceGtins: string[]; sourceObservationIds: string[]; sourceSha256: string[];
  minimumRetailSidesCm: number[]; meanRetailSidesCm: number[]; maximumRetailSidesCm: number[];
  sampleCount: number; observedCounts: number[]; observedContentsGrams: number[]; observedContentsMl: number[];
  externalBoxSource: "OWNER_DECLARED"; innerDimensions: null; tare: null;
  packingFitConfirmed: false; protectionCalibrated: false;
  operationalUpperSidesCm: number[]; geometryMarginCm: number;
  externalPackagingReserveGrams: 100; explanation: string;
};

const normalizedPresentation = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/([a-z])(?=\d)/g, "$1 ").replace(/(\d)(?=[a-z])/g, "$1 ");
function normalTabletCount(input: AverageEstimateIdentity) {
  if (!logisticsGtinSchema.safeParse(input.gtin).success || input.prescriptionType === "ANTIMICROBIAL") return null;
  const base = estimateWeightOnly({ ...input, logisticsEvidence: null });
  if (base?.family !== "ORAL_SOLID" || base.declaredUnit !== "count" || !Number.isInteger(base.declaredContent) || base.declaredContent! < 1 || base.declaredContent! > 30) return null;
  const name = normalizedPresentation(input.name);
  if (!/\b(?:comprimidos?|comp|cp)\b/.test(name) ||
    /\b(?:caps\w*|cps|drage\w*|frasco\w*|pote\w*|sache\w*|envelope\w*|subling\w*|liberacao|prolongad\w*|retard\w*|orodispers\w*|dispers\w*|gastro[ -]?r?resist\w*|enteric\w*|efervescent\w*|mastig\w*|xr|sr|cr|mr|dr|er|ec|lp|lc|odt|kits?|combo\w*|multipack|packs?|duopack|tripack|leve|pague)\b|\bl\s*\d+\s*p\s*\d+\b/.test(name)) return null;
  return base.declaredContent!;
}
const dentalCategories = new Set(["higiene", "higiene bucal", "higiene e beleza", "higiene pessoal", "higiene e cuidados pessoais", "cuidados pessoais", "perfumaria"]);
const shampooCategories = new Set(["higiene", "higiene e beleza", "higiene pessoal", "higiene e cuidados pessoais", "cuidados pessoais", "perfumaria", "cabelos", "cuidados com os cabelos", "infantil", "higiene infantil", "higiene e cuidados do bebe"]);
const excludedHygienePresentation = /\b(?:refil\w*|pote\w*|doses?|porcao|porcoes|kits?|combo\w*|multipack|packs?|leve|pague|clinic\w*|profissiona\w*|hospital\w*|cirurg\w*|inflamav\w*|flammab\w*)\b|\bl\s*\d+\s*p\s*\d+\b|\b\d+\s*(?:unidades?|unid|und|un)\b/;
function hygieneContent(input: AverageEstimateIdentity, categories: ReadonlySet<string>, unit: "g" | "ml", maximum: number) {
  if (!logisticsGtinSchema.safeParse(input.gtin).success || input.requiresPrescription || ["CONTROLLED", "ANTIMICROBIAL"].includes(input.prescriptionType ?? "") ||
    !categories.has(normalizedPresentation(input.category ?? "").trim())) return null;
  const base = estimateWeightOnly({ ...input, logisticsEvidence: null });
  if (base?.family !== (unit === "g" ? "HYGIENE_MASS" : "HYGIENE_VOLUME") || base.declaredUnit !== unit || base.declaredContent === null || base.declaredContent > maximum) return null;
  return base.declaredContent;
}
function dentalContentGrams(input: AverageEstimateIdentity) {
  const content = hygieneContent(input, dentalCategories, "g", 140);
  if (content === null) return null;
  const name = normalizedPresentation(input.name);
  if (!/\bdental\b/.test(name) || !/\b(?:creme|gel|pasta|tubo|bisnaga)\b/.test(name) ||
    excludedHygienePresentation.test(name)) return null;
  return content;
}
function shampooContentMl(input: AverageEstimateIdentity) {
  const content = hygieneContent(input, shampooCategories, "ml", 400);
  if (content === null) return null;
  const brand = normalizedPresentation(input.brand ?? "").trim();
  if (brand.length < 2 || !/[a-z]/.test(brand) || /^(?:nao informado|desconhecid[oa]|generico|sem marca|n\/?a|consulte os detalhes)$/.test(brand)) return null;
  const name = normalizedPresentation(input.name);
  if (!/\bshampoos?\b/.test(name) || excludedHygienePresentation.test(name) ||
    /\b(?:pump\w*|valvul\w*|dosad\w*|dispens\w*|sache\w*|envelope\w*|tubo\w*|bisnaga\w*|solid\w*|barras?|medicin\w*|medicament\w*|terapeut\w*|cetoconazol\w*|aero\w*|spray\w*)\b/.test(name)) return null;
  return content;
}
function declaredContent(input: AverageEstimateIdentity, container: PlannedContainer) {
  if (container.kind === "NORMAL_TABLETS_1_TO_30") return normalTabletCount(input);
  return container.kind === "DENTAL_TUBE_UP_TO_140G" ? dentalContentGrams(input) : shampooContentMl(input);
}
function currentEvidence(input: AverageEstimateIdentity) {
  const parsed = logisticsEvidenceSchema.safeParse(input.logisticsEvidence);
  return parsed.success && parsed.data.gtin === input.gtin && evidenceStatus(parsed.data) !== "conflict" ? parsed.data : null;
}
function retailGeometry(input: AverageEstimateIdentity) {
  const evidence = currentEvidence(input);
  if (!evidence) return null;
  const sources = activeLogisticsObservations(evidence).filter(row => row.packagingLevel === "retail_unit" && row.units === 1 && !row.identityConflict && row.sidesMm && row.dimensionsBasis !== "unlabeled")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!sources.length) return null;
  return { gtin: input.gtin, sides: [...sources[0].sidesMm!].sort((a, b) => b - a).map(side => side / 10), sources };
}

/** An owner-declared outer-box scenario, separate from retail geometry and calibrated packaging recipes. */
export function estimatePlannedContainer(input: AverageEstimateIdentity, catalog: AverageEstimateIdentity[], manifests: unknown): PlannedContainerEstimate | null {
  const parsed = plannedContainersSchema.safeParse(manifests);
  if (!parsed.success) return null;
  const container = parsed.data.find(item => item.memberGtins.includes(input.gtin));
  if (!container || declaredContent(input, container) === null || input.logisticsEvidence != null && !currentEvidence(input) || retailGeometry(input)) return null;
  const ownWeight = estimateWeightOnly(input);
  if (!ownWeight) return null;
  const { policyVersion, family, declaredContent: weightDeclaredContent, declaredUnit, densityHypothesisGramsPerMl, estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams } = ownWeight;
  const counts = new Map<string, number>();
  for (const item of catalog) counts.set(item.gtin, (counts.get(item.gtin) ?? 0) + 1);
  if ((counts.get(input.gtin) ?? 0) > 1) return null;
  const samples = catalog.filter(item => item.gtin !== input.gtin && container.referenceGtins.includes(item.gtin) && counts.get(item.gtin) === 1)
    .map(item => ({ geometry: retailGeometry(item), content: declaredContent(item, container) }))
    .filter((item): item is { geometry: NonNullable<typeof item.geometry>; content: number } => item.geometry !== null && item.content !== null)
    .sort((a, b) => a.geometry.gtin.localeCompare(b.geometry.gtin));
  const requiredAnchor = container.kind === "NORMAL_TABLETS_1_TO_30" ? container.countMax : container.kind === "DENTAL_TUBE_UP_TO_140G" ? container.contentMaxGrams : container.contentMaxMl;
  if (samples.length < 2 || !samples.some(sample => sample.content === requiredAnchor)) return null;
  const axes = [0, 1, 2].map(axis => samples.map(sample => sample.geometry.sides[axis]));
  if (axes.some(values => Math.max(...values) / Math.min(...values) > 2)) return null;
  const minimumRetailSidesCm = axes.map(values => Math.min(...values));
  const meanRetailSidesCm = axes.map(values => values.reduce((sum, value) => sum + value, 0) / values.length);
  const maximumRetailSidesCm = axes.map(values => Math.max(...values));
  const operationalUpperSidesCm = maximumRetailSidesCm.map(side => side + container.geometryMarginCm);
  if (operationalUpperSidesCm.some((side, axis) => side >= container.outerBoxCm[axis])) return null;
  const ownSources = ownWeight.family === "EXACT_GROSS_REFERENCE" ? activeLogisticsObservations(currentEvidence(input)!).filter(row => ownWeight.sourceObservationIds.includes(row.id)) : [];
  const sourceObservationIds = [...samples.flatMap(sample => sample.geometry.sources.map(row => `${sample.geometry.gtin}:${row.id}`)), ...ownSources.map(row => `${input.gtin}:${row.id}`)];
  const draft = shippingDraftSchema.safeParse({ ...ownWeight.draft, approvedServiceIds: [], lengthCm: 24, widthCm: 15, heightCm: 10 });
  if (!draft.success) return null;
  const observedContents = [...new Set(samples.map(sample => sample.content))].sort((a, b) => a - b);
  const observedCounts = container.kind === "NORMAL_TABLETS_1_TO_30" ? observedContents : [];
  const observedContentsGrams = container.kind === "DENTAL_TUBE_UP_TO_140G" ? observedContents : [];
  const observedContentsMl = container.kind === "SHAMPOO_BOTTLE_UP_TO_400ML" ? observedContents : [];
  const observedPresentation = container.kind === "NORMAL_TABLETS_1_TO_30" ? `contagens observadas ${observedCounts.join(", ")}, incluindo 30 comprimidos` : container.kind === "DENTAL_TUBE_UP_TO_140G" ? `conteúdos declarados observados ${observedContentsGrams.join(", ")} g, incluindo 140 g` : `volumes declarados observados ${observedContentsMl.join(", ")} ml, incluindo 400 ml`;
  return {
    policyVersion: "planned-container-v2", basis: "PLANNED_OUTER_BOX", containerId: container.id,
    draft: { ...draft.data, lengthCm: 24, widthCm: 15, heightCm: 10 },
    weightBasis: ownWeight.family === "EXACT_GROSS_REFERENCE" ? "EXACT_GTIN_GROSS" : "WEIGHT_POLICY",
    weightComputation: { policyVersion, family, declaredContent: weightDeclaredContent, declaredUnit, densityHypothesisGramsPerMl, estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams, roundingStepGrams: 10 },
    sourceGtins: [...new Set([...samples.map(sample => sample.geometry.gtin), ...ownSources.map(() => input.gtin)])].sort(),
    sourceObservationIds: [...new Set(sourceObservationIds)].sort(),
    sourceSha256: [...new Set([...samples.flatMap(sample => sample.geometry.sources.map(row => row.source.sha256)), ...ownSources.map(row => row.source.sha256)])].sort(),
    minimumRetailSidesCm, meanRetailSidesCm, maximumRetailSidesCm, sampleCount: samples.length, observedCounts, observedContentsGrams, observedContentsMl,
    externalBoxSource: "OWNER_DECLARED", innerDimensions: null, tare: null, packingFitConfirmed: false, protectionCalibrated: false,
    operationalUpperSidesCm, geometryMarginCm: container.geometryMarginCm, externalPackagingReserveGrams: 100,
    explanation: `Caixa externa planejada de 24 × 15 × 10 cm, informada pelo lojista; cenário ${container.id} (${container.label}). ${container.rationale} Hipótese de preparação: ${container.packingHypothesis} Geometrias comerciais de ${samples.length} GTINs distintos, com ${observedPresentation}. Marcas e composições podem diferir; não se presume identidade das embalagens. Eixos ordenados têm dispersão máxima de 2 vezes; máximos observados + uma única margem operacional de ${container.geometryMarginCm} cm totais por eixo ficam estritamente abaixo da caixa externa, condição necessária que não comprova encaixe interno. Não há limite inferior operacional inferido. O peso é individual: ${ownWeight.explanation} Não se usam médias ou máximos de pesos heterogêneos das referências. Dimensões internas, tara, material, fechamento e proteção não foram calibrados; compatibilidade física e encaixe não confirmados. A caixa planejada não é dimensão comercial do alvo, receita calibrada ou aprovação de transporte/serviços.`,
  };
}
