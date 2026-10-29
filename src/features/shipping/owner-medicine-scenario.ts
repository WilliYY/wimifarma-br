import { z } from "zod";
import type { AverageEstimateIdentity } from "./average-estimate";
import { estimateWeightOnly, type WeightOnlyEstimate } from "./base-estimate";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema, logisticsGtinSchema } from "./logistics-evidence";
import { shippingDraftSchema, type ShippingDraft } from "./product-draft";

const ownerMedicineScenarioSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), label: z.string().trim().min(3).max(200),
  kind: z.enum(["ORAL_SOLID_1_TO_30", "ORAL_SOLID_31_TO_60", "ORAL_SOLID_61_TO_120", "ORAL_LIQUID_UP_TO_60ML", "ORAL_LIQUID_61_TO_150ML", "TOPICAL_MASS_UP_TO_60G"]),
  memberGtins: z.array(logisticsGtinSchema).min(1).max(500).refine(values => new Set(values).size === values.length, "GTIN membro repetido."),
  hypothesizedRetailSidesCm: z.tuple([z.number().positive().max(200), z.number().positive().max(200), z.number().positive().max(200)])
    .refine(sides => sides[0] >= sides[1] && sides[1] >= sides[2], "Ordene os lados em ordem decrescente."),
  geometryMarginCm: z.number().int().min(1).max(3),
  outerBoxCm: z.tuple([z.literal(24), z.literal(15), z.literal(10)]),
  rationale: z.string().trim().min(3).max(2000), packingHypothesis: z.string().trim().min(3).max(2000),
}).strict();

export const ownerMedicineScenariosSchema = z.array(ownerMedicineScenarioSchema).max(100).superRefine((scenarios, context) => {
  const ids = new Set<string>(); const members = new Set<string>();
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) context.addIssue({ code: "custom", message: "Identificador de cenário repetido." });
    ids.add(scenario.id);
    for (const gtin of scenario.memberGtins) {
      if (members.has(gtin)) context.addIssue({ code: "custom", message: "GTIN membro de mais de um cenário." });
      members.add(gtin);
    }
  }
});
export type OwnerMedicineScenario = z.infer<typeof ownerMedicineScenarioSchema>;
export type OwnerMedicineScenarioEstimate = {
  policyVersion: "owner-package-hypothesis-v1"; basis: "OWNER_PACKAGE_HYPOTHESIS"; scenarioId: string;
  draft: ShippingDraft & { lengthCm: number; widthCm: number; heightCm: number };
  weightBasis: "EXACT_GTIN_GROSS" | "WEIGHT_POLICY";
  weightComputation: Pick<WeightOnlyEstimate, "policyVersion" | "family" | "declaredContent" | "declaredUnit" | "densityHypothesisGramsPerMl" | "estimatedRetailGrams" | "retailPackagingReserveGrams" | "externalPackagingReserveGrams"> & { roundingStepGrams: 10 };
  sourceGtins: string[]; sourceObservationIds: string[]; sourceSha256: string[];
  geometrySource: "OWNER_AUTHORIZED_HYPOTHESIS"; geometrySourceGtins: []; geometrySampleCount: 0;
  ownerExampleRetailBoxCm: [6, 4, 2]; ownerExampleUnitCount: null; ownerExampleGtin: null;
  hypothesizedRetailSidesCm: number[]; operationalUpperSidesCm: number[]; geometryMarginCm: number;
  declaredContent: number; declaredUnit: "count" | "ml" | "g";
  outerBoxSource: "OWNER_DECLARED"; innerDimensions: null; tare: null; material: null; closure: null;
  packingFitConfirmed: false; protectionCalibrated: false;
  hypothesis: { assumedContainer: "CARTON" | "BOTTLE" | "TUBE"; packingHypothesis: string };
  externalPackagingReserveGrams: 100; explanation: string;
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function matchesPresentation(input: AverageEstimateIdentity, base: WeightOnlyEstimate, kind: OwnerMedicineScenario["kind"]) {
  const name = normalize(input.name);
  const content = base.declaredContent;
  if (content === null || content <= 0 || /\b(?:kits?|combos?|multipack|packs?|duopack|tripack|refil|refis|potes?|saches?|envelopes?|leve\s+\d+|pague\s+\d+)\b/.test(name)) return false;
  if (base.family === "ORAL_SOLID") {
    if (/\b(?:frascos?|soft\s*gel\w*|moles?|mole|sl|subling\w*|orodispers\w*)\b/.test(name)) return false;
    return kind === "ORAL_SOLID_1_TO_30" ? content <= 30 : kind === "ORAL_SOLID_31_TO_60" ? content > 30 && content <= 60 : kind === "ORAL_SOLID_61_TO_120" && content > 60 && content <= 120;
  }
  if (base.family === "ORAL_LIQUID") {
    if (/\b(?:topic\w*|uso externo|cutane\w*)\b/.test(name)) return false;
    return kind === "ORAL_LIQUID_UP_TO_60ML" ? content <= 60 : kind === "ORAL_LIQUID_61_TO_150ML" && content > 60 && content <= 150;
  }
  return base.family === "TOPICAL_MASS" && kind === "TOPICAL_MASS_UP_TO_60G" && content <= 60 && /\b(?:cremes?|pomadas?|gel)\b/.test(name);
}

/** Owner-authorized planning hypothesis; no sampled geometry, physical evidence or carrier approval is created. */
export function estimateOwnerMedicineScenario(input: AverageEstimateIdentity, manifests: unknown): OwnerMedicineScenarioEstimate | null {
  const parsed = ownerMedicineScenariosSchema.safeParse(manifests);
  if (!parsed.success || !logisticsGtinSchema.safeParse(input.gtin).success || input.isPopularPharmacy ||
    ["CONTROLLED", "ANTIMICROBIAL"].includes(input.prescriptionType ?? "") ||
    (input.requiresPrescription && input.prescriptionType === "UNREVIEWED") ||
    !(input.requiresPrescription || /\bmedicamentos?\b/.test(normalize(input.category ?? "")))) return null;
  const scenario = parsed.data.find(item => item.memberGtins.includes(input.gtin));
  // Parse identity without references so a gross-only source cannot bypass the presentation and cargo gates.
  const identity = estimateWeightOnly({ ...input, logisticsEvidence: null });
  if (!scenario || !identity || !matchesPresentation(input, identity, scenario.kind)) return null;
  const ownEvidence = input.logisticsEvidence == null ? null : logisticsEvidenceSchema.safeParse(input.logisticsEvidence);
  if (ownEvidence && (!ownEvidence.success || ownEvidence.data.gtin !== input.gtin || evidenceStatus(ownEvidence.data) === "conflict")) return null;
  const observations = ownEvidence?.success ? activeLogisticsObservations(ownEvidence.data) : [];
  if (observations.some(row => row.packagingLevel === "retail_unit" && row.units === 1 && !row.identityConflict && row.sidesMm && row.dimensionsBasis !== "unlabeled")) return null;
  const ownWeight = estimateWeightOnly(input);
  if (!ownWeight) return null;
  const operationalUpperSidesCm = scenario.hypothesizedRetailSidesCm.map(side => side + scenario.geometryMarginCm);
  if (operationalUpperSidesCm.some((side, axis) => side >= [24, 15, 10][axis])) return null;
  const ownSources = observations.filter(row => ownWeight.sourceObservationIds.includes(row.id));
  const { policyVersion, family, declaredContent, declaredUnit, densityHypothesisGramsPerMl, estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams } = ownWeight;
  const draft = shippingDraftSchema.safeParse({ ...ownWeight.draft, lengthCm: 24, widthCm: 15, heightCm: 10, approvedServiceIds: [] });
  if (!draft.success) return null;
  return {
    policyVersion: "owner-package-hypothesis-v1", basis: "OWNER_PACKAGE_HYPOTHESIS", scenarioId: scenario.id,
    draft: { ...draft.data, lengthCm: 24, widthCm: 15, heightCm: 10 },
    weightBasis: ownWeight.family === "EXACT_GROSS_REFERENCE" ? "EXACT_GTIN_GROSS" : "WEIGHT_POLICY",
    weightComputation: { policyVersion, family, declaredContent, declaredUnit, densityHypothesisGramsPerMl, estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams, roundingStepGrams: 10 },
    sourceGtins: ownSources.length ? [input.gtin] : [],
    sourceObservationIds: [...new Set(ownSources.map(row => `${input.gtin}:${row.id}`))].sort(), sourceSha256: [...new Set(ownSources.map(row => row.source.sha256))].sort(),
    geometrySource: "OWNER_AUTHORIZED_HYPOTHESIS", geometrySourceGtins: [], geometrySampleCount: 0,
    ownerExampleRetailBoxCm: [6, 4, 2], ownerExampleUnitCount: null, ownerExampleGtin: null,
    hypothesizedRetailSidesCm: [...scenario.hypothesizedRetailSidesCm], operationalUpperSidesCm, geometryMarginCm: scenario.geometryMarginCm,
    declaredContent: identity.declaredContent!, declaredUnit: identity.declaredUnit!,
    outerBoxSource: "OWNER_DECLARED", innerDimensions: null, tare: null, material: null, closure: null,
    packingFitConfirmed: false, protectionCalibrated: false,
    hypothesis: { assumedContainer: identity.family === "ORAL_SOLID" ? "CARTON" : identity.family === "ORAL_LIQUID" ? "BOTTLE" : "TUBE", packingHypothesis: scenario.packingHypothesis },
    externalPackagingReserveGrams: 100,
    explanation: `Cenário ${scenario.id} (${scenario.label}): ${scenario.rationale} Geometria hipotética autorizada pelo lojista, sem amostras físicas ou estatísticas. O exemplo de Losartana de 6 × 4 × 2 cm não tem contagem ou GTIN identificados e não é fonte observada. O envelope estipulado de ${scenario.hypothesizedRetailSidesCm.join(" × ")} cm recebe uma única folga total de ${scenario.geometryMarginCm} cm por eixo. O limite operacional fica estritamente abaixo da caixa externa de 24 × 15 × 10 cm declarada pelo lojista, sem comprovar encaixe, orientação ou medidas internas. Não há proporcionalidade geométrica por contagem, equivalência clínica ou coorte de embalagens. Hipótese de preparação: ${scenario.packingHypothesis} Peso individual: ${ownWeight.explanation} Material, fechamento, dimensões internas e tara permanecem desconhecidos; proteção não calibrada e encaixe não confirmado. Transporte e serviços permanecem desabilitados.`,
  };
}
