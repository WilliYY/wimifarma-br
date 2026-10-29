import { z } from "zod";
import type { AverageEstimateIdentity } from "./average-estimate";
import { estimateWeightOnly } from "./base-estimate";
import type { WeightOnlyEstimate } from "./base-estimate";
import { shippingCargoKindsSchema } from "./cargo-policy";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema, logisticsGtinSchema } from "./logistics-evidence";
import { shippingDraftSchema } from "./product-draft";
import type { ShippingDraft } from "./product-draft";

const orderedSidesCmSchema = z.tuple([z.number().positive().max(200), z.number().positive().max(200), z.number().positive().max(200)])
  .refine(sides => sides[0] >= sides[1] && sides[1] >= sides[2], "Ordene os lados em ordem decrescente.");
const ownerPackagingHypothesisSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), label: z.string().trim().min(3).max(200),
  container: z.enum(["CARTON", "BOTTLE", "TUBE", "POUCH", "BLISTER", "AEROSOL", "DEVICE", "KIT"]),
  geometryMode: z.enum(["OWNER_HYPOTHESIS", "OWN_DOCUMENTARY_REFERENCE"]).default("OWNER_HYPOTHESIS"),
  geometryObservationId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  members: z.array(z.object({
    gtin: logisticsGtinSchema,
    // Preserve the exact catalog title: trimming would silently change the identity bound to the manifest.
    expectedName: z.string().min(1).max(500).refine(value => value.trim().length > 0, "Informe o nome esperado do produto."),
  }).strict()).min(1).max(500),
  hypothesizedRetailSidesCm: orderedSidesCmSchema, geometryMarginCm: z.number().int().min(1).max(3), outerBoxCm: orderedSidesCmSchema,
  grossPackageHypothesisGrams: z.number().int().min(1).max(25000), weightMarginPercent: z.number().int().min(10).max(30),
  cargoKinds: shippingCargoKindsSchema.refine(values => values.length > 0, "Informe ao menos um tipo de carga."),
  rationale: z.string().trim().min(3).max(2000), weightHypothesis: z.string().trim().min(3).max(2000), packingHypothesis: z.string().trim().min(3).max(2000),
}).strict().superRefine((value, context) => {
  if (value.geometryMode === "OWN_DOCUMENTARY_REFERENCE") {
    if (!value.geometryObservationId || value.members.length !== 1) context.addIssue({ code: "custom", message: "Geometria documental exige uma observação explícita e um único membro." });
  } else if (value.geometryObservationId !== undefined) context.addIssue({ code: "custom", message: "Hipótese geométrica não aceita identificador de observação." });
});

export const ownerPackagingHypothesesSchema = z.array(ownerPackagingHypothesisSchema).max(200).superRefine((hypotheses, context) => {
  const ids = new Set<string>(); const members = new Set<string>();
  for (const hypothesis of hypotheses) {
    if (ids.has(hypothesis.id)) context.addIssue({ code: "custom", message: "Identificador de hipótese repetido." });
    ids.add(hypothesis.id);
    for (const member of hypothesis.members) {
      if (members.has(member.gtin)) context.addIssue({ code: "custom", message: "GTIN membro repetido no manifesto." });
      members.add(member.gtin);
    }
  }
});
export type OwnerPackagingHypothesis = z.infer<typeof ownerPackagingHypothesisSchema>;
type IndividualWeightComputation = Pick<WeightOnlyEstimate, "policyVersion" | "family" | "declaredContent" | "declaredUnit" | "densityHypothesisGramsPerMl" | "estimatedRetailGrams" | "retailPackagingReserveGrams" | "externalPackagingReserveGrams"> & { roundingStepGrams: 10 };
export type OwnerPackagingHypothesisEstimate = {
  policyVersion: "owner-packaging-hypothesis-v1"; basis: "OWNER_PACKAGING_HYPOTHESIS"; hypothesisId: string;
  draft: ShippingDraft & { lengthCm: number; widthCm: number; heightCm: number };
  weightBasis: "EXACT_GTIN_GROSS" | "WEIGHT_POLICY" | "OWNER_PACKAGE_GROSS_HYPOTHESIS";
  weightComputation: IndividualWeightComputation | null;
  basePackageWeightGrams: number; weightMarginPercent: number; weightMarginGrams: number; weightRoundingStepGrams: 10;
  declaredContent: number | null; declaredUnit: "count" | "ml" | "g" | null;
  sourceGtins: string[]; sourceObservationIds: string[]; sourceSha256: string[];
  geometrySource: "OWNER_AUTHORIZED_HYPOTHESIS" | "OWN_DOCUMENTARY_REFERENCE"; geometrySourceGtins: []; geometrySampleCount: 0;
  geometryReference: { gtin: string; observationId: string; sourceSha256: string; dimensionsBasis: "labeled_axes" | "carton_die"; sourceSidesMm: [number, number, number]; orderedSidesCm: number[]; physicalMeasurementConfirmed: false } | null;
  hypothesizedRetailSidesCm: number[]; operationalUpperSidesCm: number[]; geometryMarginCm: number; outerBoxCm: number[];
  outerBoxSource: "OWNER_DECLARED" | "PLANNED_NOT_CONFIRMED"; largerBoxRequired: boolean;
  innerDimensions: null; tare: null; material: null; closure: null; packingFitConfirmed: false; protectionCalibrated: false;
  hypothesis: { assumedContainer: OwnerPackagingHypothesis["container"]; grossPackageHypothesisGrams: number; weightHypothesis: string; packingHypothesis: string };
  explanation: string;
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** An explicitly listed owner's planning hypothesis. It never creates physical evidence or transport approval. */
export function estimateOwnerPackagingHypothesis(input: AverageEstimateIdentity, manifests: unknown): OwnerPackagingHypothesisEstimate | null {
  const parsed = ownerPackagingHypothesesSchema.safeParse(manifests);
  if (!parsed.success || !logisticsGtinSchema.safeParse(input.gtin).success || !input.name?.trim() || input.name.length > 500 ||
    input.isPopularPharmacy || ["CONTROLLED", "ANTIMICROBIAL"].includes(input.prescriptionType ?? "") ||
    (input.requiresPrescription && input.prescriptionType !== "ORDINARY")) return null;
  const hypothesis = parsed.data.find(item => item.members.some(member => member.gtin === input.gtin && member.expectedName === input.name));
  if (!hypothesis) return null;
  const ownEvidence = input.logisticsEvidence == null ? null : logisticsEvidenceSchema.safeParse(input.logisticsEvidence);
  if (ownEvidence && (!ownEvidence.success || ownEvidence.data.gtin !== input.gtin || evidenceStatus(ownEvidence.data) === "conflict")) return null;
  const observations = ownEvidence?.success ? activeLogisticsObservations(ownEvidence.data) : [];
  let geometryReference: OwnerPackagingHypothesisEstimate["geometryReference"] = null;
  if (hypothesis.geometryMode === "OWN_DOCUMENTARY_REFERENCE") {
    const reference = observations.find(row => row.id === hypothesis.geometryObservationId);
    if (!reference || reference.packagingLevel !== "retail_unit" || reference.units !== 1 || reference.identityConflict ||
      !reference.sidesMm || reference.dimensionsBasis === "unlabeled") return null;
    const orderedSidesCm = [...reference.sidesMm].sort((a, b) => b - a).map(side => side / 10);
    if (orderedSidesCm.some((side, axis) => side !== hypothesis.hypothesizedRetailSidesCm[axis])) return null;
    geometryReference = { gtin: input.gtin, observationId: reference.id, sourceSha256: reference.source.sha256, dimensionsBasis: reference.dimensionsBasis,
      sourceSidesMm: [...reference.sidesMm], orderedSidesCm, physicalMeasurementConfirmed: false };
  } else if (observations.some(row => row.packagingLevel === "retail_unit" && row.units === 1 && !row.identityConflict && row.sidesMm && row.dimensionsBasis !== "unlabeled")) return null;

  const operationalUpperSidesCm = hypothesis.hypothesizedRetailSidesCm.map(side => side + hypothesis.geometryMarginCm);
  if (operationalUpperSidesCm.some((side, axis) => side >= hypothesis.outerBoxCm[axis])) return null;
  const individualWeight = estimateWeightOnly(input);
  const basePackageWeightGrams = individualWeight?.draft.weightGrams ?? hypothesis.grossPackageHypothesisGrams;
  // Both bases already include packaging. Apply only the authorized percentage and final 10 g rounding.
  const weightGrams = Math.ceil((basePackageWeightGrams * (100 + hypothesis.weightMarginPercent) / 100) / 10) * 10;
  const medicine = input.requiresPrescription || /\bmedicamentos?\b/.test(normalize(input.category ?? ""));
  const cargoKinds = [...hypothesis.cargoKinds];
  if (medicine && !cargoKinds.includes("medication")) cargoKinds.push("medication");
  const draft = shippingDraftSchema.safeParse({ enabled: false, transportReviewed: false, measurementBasis: "estimated", reference: null,
    approvedServiceIds: [], cargoKinds, weightGrams, lengthCm: hypothesis.outerBoxCm[0], widthCm: hypothesis.outerBoxCm[1], heightCm: hypothesis.outerBoxCm[2] });
  if (!draft.success) return null;
  let weightComputation: IndividualWeightComputation | null = null;
  if (individualWeight) {
    const { policyVersion, family, declaredContent, declaredUnit, densityHypothesisGramsPerMl, estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams } = individualWeight;
    weightComputation = { policyVersion, family, declaredContent, declaredUnit, densityHypothesisGramsPerMl, estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams, roundingStepGrams: 10 };
  }
  const sources = observations.filter(row => individualWeight?.sourceObservationIds.includes(row.id));
  const ownerDeclaredBox = hypothesis.outerBoxCm.every((side, axis) => side === [24, 15, 10][axis]);
  const geometryExplanation = geometryReference
    ? `Referência geométrica documental própria (${geometryReference.dimensionsBasis}), observação ${geometryReference.observationId}. Registro comercial ou histórico; carton_die descreve cartonagem documental e não comprova medição física atual. Eixos documentais em milímetros foram ordenados e convertidos exatamente para centímetros, com igualdade ao envelope explícito do manifesto. Não há amostragem física ou confirmação de medição atual.`
    : "Geometria estipulada pelo lojista, com zero amostras físicas; não é medição, média ou limite garantido.";
  return {
    policyVersion: "owner-packaging-hypothesis-v1", basis: "OWNER_PACKAGING_HYPOTHESIS", hypothesisId: hypothesis.id,
    draft: { ...draft.data, lengthCm: hypothesis.outerBoxCm[0], widthCm: hypothesis.outerBoxCm[1], heightCm: hypothesis.outerBoxCm[2] },
    weightBasis: individualWeight?.family === "EXACT_GROSS_REFERENCE" ? "EXACT_GTIN_GROSS" : individualWeight ? "WEIGHT_POLICY" : "OWNER_PACKAGE_GROSS_HYPOTHESIS",
    weightComputation, basePackageWeightGrams, weightMarginPercent: hypothesis.weightMarginPercent,
    weightMarginGrams: basePackageWeightGrams * hypothesis.weightMarginPercent / 100, weightRoundingStepGrams: 10,
    declaredContent: individualWeight?.declaredContent ?? null, declaredUnit: individualWeight?.declaredUnit ?? null,
    sourceGtins: sources.length ? [input.gtin] : [], sourceObservationIds: [...new Set(sources.map(row => `${input.gtin}:${row.id}`))].sort(),
    sourceSha256: [...new Set(sources.map(row => row.source.sha256))].sort(),
    geometrySource: geometryReference ? "OWN_DOCUMENTARY_REFERENCE" : "OWNER_AUTHORIZED_HYPOTHESIS", geometryReference, geometrySourceGtins: [], geometrySampleCount: 0,
    hypothesizedRetailSidesCm: [...hypothesis.hypothesizedRetailSidesCm], operationalUpperSidesCm, geometryMarginCm: hypothesis.geometryMarginCm, outerBoxCm: [...hypothesis.outerBoxCm],
    outerBoxSource: ownerDeclaredBox ? "OWNER_DECLARED" : "PLANNED_NOT_CONFIRMED", largerBoxRequired: !ownerDeclaredBox,
    innerDimensions: null, tare: null, material: null, closure: null, packingFitConfirmed: false, protectionCalibrated: false,
    hypothesis: { assumedContainer: hypothesis.container, grossPackageHypothesisGrams: hypothesis.grossPackageHypothesisGrams, weightHypothesis: hypothesis.weightHypothesis, packingHypothesis: hypothesis.packingHypothesis },
    explanation: `Hipótese ${hypothesis.id} (${hypothesis.label}): ${hypothesis.rationale} Recipiente presumido no manifesto, sem confirmação de material ou fechamento. ${geometryExplanation} Envelope de ${hypothesis.hypothesizedRetailSidesCm.join(" × ")} cm + ${hypothesis.geometryMarginCm} cm totais por eixo, uma única vez, fica estritamente abaixo da caixa de ${hypothesis.outerBoxCm.join(" × ")} cm. ${ownerDeclaredBox ? "Caixa externa nominal declarada pelo lojista." : "Caixa externa alternativa apenas planejada; disponibilidade e uso não confirmados."} Comparação numérica não comprova orientação, espaço interno ou encaixe. ${individualWeight ? `Base individual: ${individualWeight.explanation}` : `Base bruta do pacote estipulada: ${basePackageWeightGrams} g, já incluindo embalagem comercial e externa. ${hypothesis.weightHypothesis} Conteúdo e unidade não inferidos de dosagem, concentração ou nome.`} Sobre a base completa de ${basePackageWeightGrams} g incide uma única margem de ${hypothesis.weightMarginPercent}%, com arredondamento final para cima em 10 g: ${weightGrams} g. Não somar novamente reservas comerciais ou externas. Preparação hipotética: ${hypothesis.packingHypothesis} Dimensões internas, tara, material e fechamento permanecem desconhecidos, com proteção não calibrada e encaixe não confirmado. A hipótese não classifica clinicamente o produto nem comprova aceitação da carga; transporte, revisão e serviços permanecem desabilitados.`,
  };
}
