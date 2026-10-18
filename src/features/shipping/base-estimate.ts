import { shippingDraftSchema, type ShippingDraft } from "./product-draft";

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
