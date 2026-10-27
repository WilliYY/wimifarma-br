import { shippingDraftSchema, type ShippingDraft } from "./product-draft";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema } from "./logistics-evidence";

type BaseShippingIdentity = {
  name: string;
  category?: string | null;
  requiresPrescription: boolean;
  prescriptionType?: string | null;
  isPopularPharmacy: boolean;
};

type BaseShippingEstimate = {
  draft: ShippingDraft;
  family: "ORAL_SOLID" | "HYGIENE_VOLUME" | "HYGIENE_MASS";
  explanation: string;
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export const WEIGHT_ESTIMATE_POLICY = {
  version: "weight-only-v1",
  densityHypothesisGramsPerMl: 1.3,
  oralUnitHypothesisGrams: 1.5,
  retailPackagingReserveGrams: 30,
  externalPackagingReserveGrams: 100,
} as const;

type WeightOnlyIdentity = BaseShippingIdentity & { gtin?: string; logisticsEvidence?: unknown };
export type WeightOnlyEstimate = {
  policyVersion: typeof WEIGHT_ESTIMATE_POLICY.version;
  family: "EXACT_GROSS_REFERENCE" | "ORAL_SOLID" | "ORAL_LIQUID" | "HYGIENE_VOLUME" | "HYGIENE_MASS" | "TOPICAL_MASS";
  declaredContent: number | null;
  declaredUnit: "count" | "ml" | "g" | null;
  densityHypothesisGramsPerMl: number | null;
  estimatedRetailGrams: number;
  retailPackagingReserveGrams: number;
  externalPackagingReserveGrams: number;
  sourceObservationIds: string[];
  draft: ShippingDraft;
  explanation: string;
};

/** Planning scenarios, never measurements or carrier-ready profiles. Existing base estimates stay unchanged. */
export function estimateWeightOnly(input: WeightOnlyIdentity): WeightOnlyEstimate | null {
  if (!input.name?.trim() || input.name.length > 500 || input.isPopularPharmacy || input.prescriptionType === "CONTROLLED" ||
    (input.requiresPrescription && input.prescriptionType !== "ORDINARY")) return null;
  const name = normalized(input.name);
  const contentName = name.replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|g)\s*(?:\/|por|em)\s*(?:\d+(?:[.,]\d+)?\s*)?(?:ml|g|l)\b/g, " ");
  const presentationName = contentName.replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)(?:\s*\+\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)){1,6}\b/g, " ");
  if (unsafe.test(`${name} ${normalized(input.category ?? "")}`) || multipack.test(presentationName) || /\b(?:efervescent\w*|mastigav\w*)\b|(?:^|\s)-\s*\d/.test(name)) return null;
  const policy = WEIGHT_ESTIMATE_POLICY;
  let family: WeightOnlyEstimate["family"];
  let declaredContent: number | null = null;
  let declaredUnit: WeightOnlyEstimate["declaredUnit"] = null;
  let densityHypothesisGramsPerMl: number | null = null;
  let estimatedRetailGrams: number;
  let retailPackagingReserveGrams: number = policy.retailPackagingReserveGrams;
  let sourceObservationIds: string[] = [];
  let formula: string;
  const evidence = logisticsEvidenceSchema.safeParse(input.logisticsEvidence);
  if (input.logisticsEvidence != null && (!evidence.success || evidence.data.gtin !== input.gtin || evidenceStatus(evidence.data) === "conflict")) return null;
  const gross = evidence.success ? activeLogisticsObservations(evidence.data).filter(item => item.packagingLevel === "retail_unit" && item.units === 1 && !item.identityConflict && item.weightBasis === "gross_explicit" && item.weightGrams !== null) : [];
  if (gross.length) {
    family = "EXACT_GROSS_REFERENCE";
    estimatedRetailGrams = gross[0].weightGrams!;
    retailPackagingReserveGrams = 0;
    sourceObservationIds = gross.map(item => item.id);
    formula = `Referência bruta comercial declarada para o GTIN: ${estimatedRetailGrams} g; embalagem comercial já incluída.`;
  } else {
    const oral = [...name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:comprimidos?|capsulas?|drageas?|cp|cps|comp|caps)\b/g)];
    const amounts = [...contentName.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|gramas?|g|ml|litros?|l)\b/g)];
    if (oral.length === 1 && !amounts.length && (input.requiresPrescription || /\bmedicamentos?\b/.test(normalized(input.category ?? "")))) {
      const count = Number(oral[0][1]);
      const identity = name.replace(oral[0][0], "").replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)\b/g, "").trim();
      if (!/^\d+$/.test(oral[0][1]) || count < 1 || count > 120 || !/[a-z]{3}/.test(identity)) return null;
      family = "ORAL_SOLID"; declaredContent = count; declaredUnit = "count";
      estimatedRetailGrams = Math.ceil((count * policy.oralUnitHypothesisGrams + retailPackagingReserveGrams) / 10) * 10;
      formula = `Hipótese operacional: ${count} unidades inteiras × ${policy.oralUnitHypothesisGrams} g + ${retailPackagingReserveGrams} g de reserva comercial. Dosagem mg/mcg não é massa do comprimido.`;
    } else if (!oral.length && amounts.length === 1) {
      const amount = amounts[0];
      if (!/^\d+(?:[.,]\d{1,2})?$/.test(amount[1])) return null;
      const unit = amount[2];
      const volume = /^(?:ml|l|litros?)$/.test(unit);
      const size = Number(amount[1].replace(",", ".")) * (/^(?:kg|l|litros?)$/.test(unit) ? 1000 : 1);
      if (!Number.isFinite(size) || size <= 0 || size > 2000) return null;
      const hygiene = (hygieneFamily.test(name) || /\b(?:serum|hidratantes?|roll[ -]?on|esfoliantes?|demaquilantes?|agua micelar|protetor(?:es)? solar(?:es)?)\b/.test(name)) && !input.requiresPrescription && !/\bmedicamentos?\b/.test(normalized(input.category ?? ""));
      const oralLiquid = /\b(?:xarope|elixir|(?:suspensao|solucao)\s+oral)\b/.test(name) && !/\b(?:oftalm\w*|otolog\w*|nasal\w*)\b/.test(name);
      const topicalMass = !volume && /\b(?:pomada|creme|gel|pasta)\b/.test(name);
      if (!hygiene && !(volume && oralLiquid) && !topicalMass) return null;
      family = hygiene ? volume ? "HYGIENE_VOLUME" : "HYGIENE_MASS" : volume ? "ORAL_LIQUID" : "TOPICAL_MASS";
      declaredContent = size; declaredUnit = volume ? "ml" : "g";
      densityHypothesisGramsPerMl = volume ? policy.densityHypothesisGramsPerMl : null;
      estimatedRetailGrams = size * (densityHypothesisGramsPerMl ?? 1) + retailPackagingReserveGrams;
      formula = volume
        ? `Cenário: ${size} ml × densidade hipotética de ${densityHypothesisGramsPerMl} g/ml + ${retailPackagingReserveGrams} g de reserva comercial; densidade não medida.`
        : `Conteúdo declarado normalizado: ${size} g + ${retailPackagingReserveGrams} g de reserva comercial.`;
    } else return null;
  }
  const weightGrams = Math.ceil((estimatedRetailGrams + policy.externalPackagingReserveGrams) / 10) * 10;
  if (!Number.isFinite(weightGrams) || weightGrams < 1 || weightGrams > 30000) return null;
  return {
    policyVersion: policy.version, family, declaredContent, declaredUnit, densityHypothesisGramsPerMl,
    estimatedRetailGrams, retailPackagingReserveGrams, externalPackagingReserveGrams: policy.externalPackagingReserveGrams, sourceObservationIds,
    draft: shippingDraftSchema.parse({ enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams, lengthCm: null, widthCm: null, heightCm: null, reference: null }),
    explanation: `${formula} Hipótese adicional: ${policy.externalPackagingReserveGrams} g para caixa externa/proteção, não uma tara medida. Total arredondado para cima em 10 g: ${weightGrams} g. Não é limite físico garantido. Dimensões/encaixe e serviços permanecem pendentes; não somar esta reserva novamente.`,
  };
}

const unsafe = /\b(?:controlad\w*|farmacia popular|refriger\w*|congel\w*|geladeira|termolabil\w*|insulina\w*|vacina\w*|injet\w*|ampola\w*|seringa\w*|intraven\w*|intramuscular\w*|alcool\w*|etanol|perfumes?|aerosso\w*|aeroso\w*|sprays?|vidro\w*)\b/;
const multipack = /\b(?:kits?|combos?|multipack|packs?|duopack|tripack|leve\s+\d+|pague\s+\d+)\b|\d\s*[x×]\s*\d|\b\d+\s*(?:caixas?|frascos?|unidades?|un|packs?)\b|\bc\s*\/\s*\d+|\+/;
const hygieneFamily = /\b(?:shampoos?|condicionador(?:es)?|sabonetes?|cremes?|locoes|locao|geis|gel)\b/;

/** Operational estimates only. No carrier approval, measured weight or verified fit is inferred. */
export function estimateBaseShipping(input: BaseShippingIdentity, now?: Date | number): BaseShippingEstimate | null {
  if (now !== undefined && !Number.isFinite(now instanceof Date ? now.getTime() : now)) return null;
  if (!input.name?.trim() || input.name.length > 500 || input.isPopularPharmacy || input.prescriptionType === "CONTROLLED" ||
    (input.requiresPrescription && input.prescriptionType !== "ORDINARY")) return null;
  const name = normalized(input.name);
  const category = normalized(input.category ?? "");
  if (unsafe.test(`${name} ${category}`) || multipack.test(name)) return null;

  const oral = [...name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:comprimidos?|capsulas?|drageas?|cp|cps|comp|caps)\b/g)];
  const declaredSize = [...name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(ml|g|gramas?)\b/g)];
  let family: BaseShippingEstimate["family"];
  let weightGrams: number;
  let largeBox = false;
  let formula: string;

  if (oral.length === 1 && !declaredSize.length && !hygieneFamily.test(name) &&
    (input.requiresPrescription || /\bmedicamentos?\b/.test(category))) {
    const count = Number(oral[0][1].replace(",", "."));
    const identity = name.replace(oral[0][0], "").replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)\b/g, "").trim();
    if (!/^\d+$/.test(oral[0][1]) || !Number.isSafeInteger(count) || count < 1 || count > 120 || !/[a-z]{3}/.test(identity)) return null;
    family = "ORAL_SOLID";
    weightGrams = count <= 60 ? 500 : 750;
    formula = `Base conservadora para ${count} comprimidos/cápsulas/drágeas: ${weightGrams} g por unidade comercial pronta para envio. A dosagem em mg não foi convertida em peso.`;
  } else if (!oral.length && declaredSize.length === 1 && hygieneFamily.test(name) && !input.requiresPrescription && !/\bmedicamentos?\b/.test(category)) {
    const size = Number(declaredSize[0][1].replace(",", "."));
    if (!Number.isFinite(size) || size <= 0 || size > 500 || !/^\d+(?:[.,]\d{1,2})?$/.test(declaredSize[0][1]) || /\b\d+(?:[.,]\d+)?\s*(?:l|litros?|kg|quilogramas?)\b/.test(name)) return null;
    const volume = declaredSize[0][2] === "ml";
    family = volume ? "HYGIENE_VOLUME" : "HYGIENE_MASS";
    weightGrams = Math.max(500, Math.ceil((size * (volume ? 1.3 : 1.2) + (volume ? 500 : 400)) / 100) * 100);
    largeBox = size > 250;
    formula = volume
      ? `Referência operacional: ${size} ml × 1,3 g/ml + 500 g de embalagem e proteção, arredondada para cima em 100 g: ${weightGrams} g.`
      : `Referência operacional: ${size} g × 1,2 + 400 g de embalagem e proteção, arredondada para cima em 100 g, mínimo de 500 g: ${weightGrams} g.`;
  } else return null;

  const draft = shippingDraftSchema.parse({
    enabled: false,
    transportReviewed: false,
    measurementBasis: "estimated",
    weightGrams,
    lengthCm: largeBox ? 33 : 20.8,
    widthCm: largeBox ? 33 : 20.8,
    heightCm: largeBox ? 33 : 21.6,
    reference: null,
  });
  return {
    draft,
    family,
    explanation: `${formula} O total já inclui caixa e proteção; não some tara novamente. Caixa externa estimada de ${largeBox ? "33 × 33 × 33" : "20,8 × 20,8 × 21,6"} cm, com folga operacional. Esta base não comprova medição, densidade ou encaixe real. Confira peso, caixa, proteção e aceitação da carga antes da postagem. O transporte continua desabilitado e sem revisão.`,
  };
}
