import { shippingDraftSchema, type ShippingDraft } from "./product-draft";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema } from "./logistics-evidence";

type BaseShippingIdentity = {
  name: string;
  category?: string | null;
  brand?: string | null;
  activeIngredients?: string[];
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
  version: "weight-only-v4",
  densityHypothesisGramsPerMl: 1.3,
  oralUnitHypothesisGrams: 1.5,
  retailPackagingReserveGrams: 30,
  externalPackagingReserveGrams: 100,
} as const;

type WeightOnlyIdentity = BaseShippingIdentity & { gtin?: string; logisticsEvidence?: unknown };
const contentHygieneCategories = new Set(["dermocosmeticos", "perfumaria", "higiene e beleza", "higiene", "higiene infantil", "cabelos", "higiene pessoal", "cuidados com a pele", "cuidados com os cabelos", "protecao solar", "cuidados pessoais", "higiene e cuidados do bebe", "higiene bucal", "higiene e cuidados pessoais"]);
const contentNutritionCategories = new Set(["suplementos", "vitaminas e suplementos", "nutricao"]);
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
  const category = normalized(input.category ?? "").trim();
  const brand = normalized(input.brand ?? "").trim();
  const identifiedBrand = brand.length >= 2 && /[a-z]/.test(brand) && !/^(?:nao informado|desconhecid[oa]|generico|sem marca|n\/?a|consulte os detalhes)$/.test(brand);
  const classifiedContent = identifiedBrand && !input.requiresPrescription && (contentHygieneCategories.has(category) || contentNutritionCategories.has(category));
  // Catalog abbreviations can join the product line and its declared content (e.g. INF200ML).
  // This boundary repair is limited to identified non-medicine categories, never a dose parser.
  const contentTitle = classifiedContent ? name.replace(/([a-z])(?=\d)/g, "$1 ").replace(/(\d)(?=[a-z])/g, "$1 ") : name;
  // Only explicit name negations may be ignored by cargo guards; keep other hazards and the category intact.
  const cargoTitle = classifiedContent ? contentTitle
    .replace(/\b(?:sem|zero)\s+alcool\b(?![^a-z0-9]*\d+(?:[.,]\d+)?\s*%)/g, " ")
    .replace(/\bsem\s+perfume\b/g, " ") : contentTitle;
  const contentName = contentTitle.replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|g)\s*(?:\/|por|em)\s*(?:\d+(?:[.,]\d+)?\s*)?(?:ml|g|l)\b/g, " ");
  const oral = [...contentName.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:comprimidos?|capsulas?|drageas?|cp|cps|comp|caps)\b/g)];
  const medicine = input.requiresPrescription || /\bmedicamentos?\b/.test(normalized(input.category ?? ""));
  let presentationName = contentName.replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)(?:\s*\+\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)){1,6}\b/g, " ");
  // Only a composition matching the registered ingredients may bypass the kit guard.
  if (medicine && oral.length === 1) {
    const doseStart = contentName.search(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|g)\b/);
    const prefix = contentName.slice(0, doseStart >= 0 ? doseStart : oral[0].index).trim();
    const parts = prefix.split("+").map(part => part.trim());
    const ingredients = (input.activeIngredients ?? []).flatMap(value => normalized(value).split("+").map(part => part.trim()));
    if (parts.length >= 2 && new Set(parts).size === parts.length && parts.every(part => part.length >= 3 && ingredients.includes(part))) {
      presentationName = presentationName.replace(prefix, prefix.replaceAll("+", " "));
    }
  }
  const abbreviatedCargo = classifiedContent && (/\b(?:aero\w*|spray\w*|perf\w*|edt|edp|colonia\w*|acetona\w*|esmalte\w*|alc|alco|gelalc)\b/.test(cargoTitle) ||
    /\b(?:desod\w*|deo\w*)\b/.test(cargoTitle) && !/\b(?:roll[ -]?on|stick|bastao|creme)\b/.test(cargoTitle));
  if (unsafe.test(`${cargoTitle} ${category}`) || abbreviatedCargo || /\b(?:efervescent\w*|mastigav\w*|brindes?)\b|(?:^|\s)-\s*\d/.test(name)) return null;
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
    if (multipack.test(presentationName)) return null;
    const amounts = [...contentName.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|gramas?|g|ml|litros?|l)\b/g)]
      .filter(match => !(medicine && oral.length === 1 && match[2] === "g" && /^\d+(?:[.,]\d{1,2})?$/.test(match[1]) &&
        Number(match[1].replace(",", ".")) > 0 && Number(match[1].replace(",", ".")) <= policy.oralUnitHypothesisGrams && match.index! < oral[0].index!));
    if (oral.length === 1 && !amounts.length && medicine) {
      const count = Number(oral[0][1]);
      const identity = name.replace(oral[0][0], "").replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug)\b/g, "").trim();
      if (!/^\d+$/.test(oral[0][1]) || count < 1 || count > 120 || !/[a-z]{3}/.test(identity)) return null;
      family = "ORAL_SOLID"; declaredContent = count; declaredUnit = "count";
      estimatedRetailGrams = Math.ceil((count * policy.oralUnitHypothesisGrams + retailPackagingReserveGrams) / 10) * 10;
      formula = `Hipótese operacional: ${count} unidades inteiras × ${policy.oralUnitHypothesisGrams} g + ${retailPackagingReserveGrams} g de reserva comercial. Dosagem mg/mcg/g não é massa do comprimido.`;
    } else if (!oral.length && amounts.length === 1) {
      const amount = amounts[0];
      if (!/^\d+(?:[.,]\d{1,2})?$/.test(amount[1])) return null;
      const unit = amount[2];
      const volume = /^(?:ml|l|litros?)$/.test(unit);
      const size = Number(amount[1].replace(",", ".")) * (/^(?:kg|l|litros?)$/.test(unit) ? 1000 : 1);
      if (!Number.isFinite(size) || size <= 0 || size > 2000) return null;
      const categoryContent = classifiedContent && (contentHygieneCategories.has(category) || !volume && contentNutritionCategories.has(category));
      if (categoryContent && /\b(?:doses?|porcao|porcoes|servings?|portions?|saches?|sachets?|envelopes?)\b/.test(contentTitle)) return null;
      if (categoryContent && contentNutritionCategories.has(category) && /\b(?:pastilhas?|tabletes?|gomas?|gomad\w*|gummy|gummies|balas?|barras?|barrinhas?|tablets?|chews?|lozenges?|sticks?|shots?|unid(?:ades?)?)\b/.test(contentTitle)) return null;
      const hygiene = (categoryContent || hygieneFamily.test(name) || /\b(?:serum|hidratantes?|roll[ -]?on|esfoliantes?|demaquilantes?|agua micelar|protetor(?:es)? solar(?:es)?)\b/.test(name)) && !input.requiresPrescription && !/\bmedicamentos?\b/.test(category);
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
      if (categoryContent) formula += " Categoria e marca identificadas no cadastro; conteúdo explícito em título abreviado, sem inferir recipiente ou dimensões.";
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
