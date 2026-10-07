import { z } from "zod";

const citedFact = {
  sourceIndex: z.number().int().min(0).max(7),
  evidence: z.string().trim().min(8).max(400),
};
const positive = z.number().finite().positive();
const rawEstimateSchema = z.object({
  ...citedFact,
  comparableName: z.string().trim().min(3).max(160),
  packageDescription: z.string().trim().min(8).max(220),
  productFamily: z.string().trim().min(3).max(80),
  packageMaterial: z.string().trim().min(3).max(80),
  targetSourceIndex: citedFact.sourceIndex,
  targetEvidence: citedFact.evidence,
  packageLevel: z.enum(["retail_unit", "retail_kit"]),
  assumptions: z.array(z.string().trim().min(8).max(220)).min(1).max(5),
  weight: z.object({ value: positive, unit: z.enum(["g", "kg"]), kind: z.enum(["gross", "net", "unknown"]) }).nullable().catch(null).default(null),
  dimensions: z.object({ width: positive, height: positive, length: positive, unit: z.enum(["mm", "cm", "m"]) }).nullable().catch(null).default(null),
});
export const rawShippingReferenceSchema = z.object({
  identityMatch: z.enum(["exact", "uncertain", "conflict"]),
  packageLevel: z.enum(["retail_unit", "retail_kit", "shipping_package", "case", "unknown"]),
  weight: z.object({ ...citedFact, value: positive, unit: z.enum(["g", "kg"]), kind: z.enum(["gross", "net", "unknown"]) }).nullable().catch(null).default(null),
  dimensions: z.object({ ...citedFact, width: positive, height: positive, length: positive, unit: z.enum(["mm", "cm", "m"]) }).nullable().catch(null).default(null),
  warnings: z.array(z.string().trim().min(2).max(220).catch("")).catch([]).transform(values => values.filter(Boolean).slice(0, 5)).default([]),
  estimate: rawEstimateSchema.nullable().catch(null).default(null),
});

const sourceSchema = z.object({
  title: z.string().max(120),
  url: z.string().url().max(2000).refine(value => new URL(value).protocol === "https:"),
  evidence: z.string().min(8).max(400),
});
const rangeSchema = (limit: number) => z.object({ min: positive, max: positive.max(limit) })
  .refine(range => range.min < range.max && range.max + Number.EPSILON * range.max >= range.min * 1.5, "Intervalo conservador inválido.");
export const shippingEstimateSchema = z.object({
  comparableName: z.string().min(3).max(160), packageDescription: z.string().min(8).max(220),
  source: sourceSchema, confidence: z.literal("low"),
  targetSource: sourceSchema.optional(), productFamily: z.string().min(3).max(80).optional(), packageMaterial: z.string().min(3).max(80).optional(),
  assumptions: z.array(z.string().min(8).max(220)).min(1).max(6),
  weightGrams: rangeSchema(30000).nullable(),
  lengthCm: rangeSchema(200).nullable(), widthCm: rangeSchema(200).nullable(), heightCm: rangeSchema(200).nullable(),
});
export const shippingReferenceSchema = z.object({
  productName: z.string().max(160),
  packageLevel: z.enum(["retail_unit", "retail_kit", "shipping_package", "unknown"]),
  weightGrams: z.number().int().min(1).max(30000).nullable(),
  widthCm: positive.max(200).nullable(), heightCm: positive.max(200).nullable(), lengthCm: positive.max(200).nullable(),
  weightSource: sourceSchema.nullable(), dimensionsSource: sourceSchema.nullable(),
  warnings: z.array(z.string().max(220)).max(8),
  researchedAt: z.iso.datetime(),
  estimate: shippingEstimateSchema.nullable().optional(),
});
export type ShippingReference = z.infer<typeof shippingReferenceSchema>;

const textKey = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const numberPattern = "\\d+(?:[.,]\\d+)*";
const unitPatterns: Record<string, string> = { g: "g|gramas?", kg: "kg|quilogramas?", mm: "mm|mil[ií]metros?", cm: "cm|cent[ií]metros?", m: "m|metros?" };
function measurementNumber(value: string, evidence: string) {
  if (value.includes(",")) return Number(value.replace(/\./g, "").replace(",", "."));
  if (/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(value)) {
    // Brazilian grouping needs Portuguese measurement context; otherwise the dot is ambiguous.
    return /\b(?:peso|largura|altura|comprimento)\b/i.test(evidence) ? Number(value.replace(/\./g, "")) : NaN;
  }
  return Number(value);
}
function citesNumbers(evidence: string, values: number[], unit: string) {
  const matches = evidence.matchAll(new RegExp(`(?<![\\d.,])(${numberPattern})\\s*(?:${unitPatterns[unit]})\\b`, "gi"));
  const numbers = [...matches].map(match => measurementNumber(match[1], evidence));
  return values.every(value => numbers.includes(value));
}
function citesDimensions(fact: NonNullable<z.infer<typeof rawShippingReferenceSchema>["dimensions"]>) {
  const axes = { width: "largura|width", height: "altura|height", length: "comprimento|profundidade|length|depth" };
  const namedAxes = (Object.keys(axes) as (keyof typeof axes)[]).every(axis => {
    const matches = fact.evidence.matchAll(new RegExp(`\\b(?:${axes[axis]})\\s*[:=]?\\s*(${numberPattern})\\s*(?:${unitPatterns[fact.unit]})\\b`, "gi"));
    const values = [...matches].map(match => measurementNumber(match[1], fact.evidence));
    return values.length > 0 && values.every(value => value === fact[axis]);
  });
  if (namedAxes) return true;
  if (/\b(?:largura|width|altura|height|comprimento|profundidade|length|depth)\b/i.test(fact.evidence)) return false;
  // A common unit is usable only when the source itself explicitly defines the axis order.
  const compact = [...fact.evidence.matchAll(new RegExp(`\\b([CLA])\\s*[x×]\\s*([CLA])\\s*[x×]\\s*([CLA])\\s*\\)?\\s*[:=]\\s*(${numberPattern})\\s*[x×]\\s*(${numberPattern})\\s*[x×]\\s*(${numberPattern})\\s*(?:${unitPatterns[fact.unit]})\\b`, "gi"))];
  const axisKey = { c: "length", l: "width", a: "height" } as const;
  return compact.length > 0 && compact.every(match => {
    const labels = match.slice(1, 4).map(label => label.toLowerCase() as keyof typeof axisKey);
    return new Set(labels).size === 3 && labels.every((label, index) => measurementNumber(match[index + 4], fact.evidence) === fact[axisKey[label]]);
  });
}
const isKit = (name: string) => /\b(?:kit|combo|multipack|multi-pack)\b/i.test(name);
const unusablePackaging = /caixa\s+master|master\s+(?:case|carton)|fralda\s+aberta|(?:sem|fora\s+da)\s+(?:a\s+)?embalagem|embalagem\s+vazia/i;
export function sameShippingVariant(requested: string, found: string) {
  if (isKit(requested) !== isKit(found)) return false;
  if (!/fralda/i.test(requested)) return true;
  const sizes: string[] = requested.toUpperCase().match(/\b(?:RN|XXG|XG|GG|G|M|P)\b/g) ?? [];
  const foundSizes: string[] = found.toUpperCase().match(/\b(?:RN|XXG|XG|GG|G|M|P)\b/g) ?? [];
  return sizes.every(size => foundSizes.includes(size));
}

function comparablePresentation(name: string) {
  const amounts: string[] = [];
  const rest = textKey(name).replace(/\b(\d+(?:[.,]\d+)?)\s*(mcg|mg|kg|ml|g|l)\b/g, (_match, value: string, unit: string) => {
    const factors: Record<string, number> = { mcg: 0.001, mg: 1, g: 1000, kg: 1000000, ml: 1, l: 1000 };
    amounts.push(`${["ml", "l"].includes(unit) ? "volume" : "mass"}:${Number(value.replace(",", ".")) * factors[unit]}`);
    return " ";
  });
  amounts.push(...(rest.match(/\b\d+\b/g) ?? []).map(value => `count:${Number(value)}`));
  if (!amounts.length && /\b(?:unidade|unit)\b/i.test(name)) amounts.push("count:1");
  return amounts.sort().join("|");
}

function estimateRange(value: number | null, limit: number, dimension = false) {
  if (value === null) return null;
  // Keep whole-unit rounding unless a small dimension would lose its positive lower bound.
  // These are conservative estimated bounds, never additional measurement precision.
  const scale = dimension && value * 0.8 < 1 ? 10 ** -Math.floor(Math.log10(value * 0.8)) : 1;
  const min = Math.floor(value * 0.8 * scale) / scale;
  const max = Math.ceil(value * 1.2 * scale) / scale;
  return min > 0 && max <= limit ? { min, max } : null;
}

const normalizedWords = (value: string) => textKey(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function specificProductFamily(name: string) {
  // Specific physical product families, never brands or broad catalog categories. Unknown families fail closed.
  const families: [string, RegExp][] = [
    ["fralda", /\bfraldas?\b/], ["lenço umedecido", /\blencos?\s+umedecidos?\b/],
    ["óleo de banho", /\boleo\s+de\s+banho\b/], ["protetor solar", /\bprotetor(?:es)?\s+solar(?:es)?\b/],
    ["perfume", /\bperfumes?\b/], ["sabonete", /\bsabonetes?\b/], ["shampoo", /\b(?:shampoos?|xampus?)\b/],
    ["condicionador", /\bcondicionador(?:es)?\b/], ["desodorante", /\bdesodorantes?\b/],
    ["hidratante", /\b(?:hidratantes?|locoes?|locao)\b/], ["creme", /\bcremes?\b(?!\s+dental\b)/], ["gel", /\b(?:gel|geis)\b/],
    ["comprimido", /\bcomprimidos?\b/], ["cápsula", /\bcapsulas?\b/], ["xarope", /\bxaropes?\b/],
    ["solução oral", /\bsolucao\s+oral\b/], ["suplemento em pó", /\b(?:whey|suplemento\s+em\s+po)\b/],
    ["chocolate", /\bchocolates?\b/], ["biscoito", /\bbiscoitos?\b/], ["bala", /\bbalas?\b/],
    ["café", /\bcafes?\b/], ["fórmula infantil", /\bformula\s+infantil\b/],
    ["termômetro", /\btermometros?\b/], ["medidor de pressão", /\b(?:medidor(?:es)?\s+de\s+pressao|esfigmomanometros?)\b/],
    ["curativo", /\bcurativos?\b/], ["pasta dental", /\b(?:pasta|creme)\s+dental\b/], ["escova dental", /\bescova\s+dental\b/],
  ];
  const matches = families.filter(([, pattern]) => pattern.test(normalizedWords(name)));
  // Ambiguous multi-family names require physical review rather than selecting a convenient family.
  return matches.length === 1 ? matches[0][0] : null;
}

function packageMaterials(evidence: string) {
  return [...new Set(normalizedWords(evidence).match(/\b(?:vidro|plastico|papelao|papel|metal|aluminio|aco|laminado)\b/g) ?? [])].sort().join("|");
}

function diaperAudience(name: string) {
  const words = normalizedWords(name);
  const adult = /\b(?:adult[oa]s?|geriatric[oa]s?)\b/.test(words);
  const infant = /\b(?:infantil|infantis|bebes?|criancas?|recem[- ]nascid[oa]s?)\b/.test(words);
  return adult && infant ? "conflict" : adult ? "adult" : infant ? "infant" : "unknown";
}

function qualifyEstimate(data: z.infer<typeof rawShippingReferenceSchema>, context: Parameters<typeof qualifyShippingReference>[1], exact: ShippingReference) {
  const estimate = data.estimate;
  if (!estimate || data.packageLevel !== estimate.packageLevel || isKit(context.name) !== isKit(estimate.comparableName)
    || !sameShippingVariant(context.name, estimate.comparableName) || !sameShippingVariant(estimate.comparableName, context.name)
    || !comparablePresentation(context.name) || comparablePresentation(context.name) !== comparablePresentation(estimate.comparableName)
    || !textKey(estimate.evidence).includes(textKey(estimate.comparableName))
    || !textKey(estimate.evidence).includes(textKey(estimate.packageDescription))) return null;
  const family = specificProductFamily(context.name);
  if (!family || family !== specificProductFamily(estimate.comparableName)
    || normalizedWords(estimate.productFamily) !== normalizedWords(family)) return null;
  if (family === "fralda" && (["conflict", "unknown"].includes(diaperAudience(context.name))
    || diaperAudience(context.name) !== diaperAudience(estimate.comparableName))) return null;
  const targetSource = sourceSchema.safeParse(context.sources[estimate.targetSourceIndex]
    && { ...context.sources[estimate.targetSourceIndex], evidence: estimate.targetEvidence });
  if (!targetSource.success || unusablePackaging.test(estimate.targetEvidence)
    || !textKey(context.research).includes(textKey(estimate.targetEvidence))
    || !textKey(estimate.targetEvidence).includes(textKey(context.name))) return null;
  const material = packageMaterials(estimate.packageMaterial);
  if (!material || material !== packageMaterials(estimate.targetEvidence)
    || material !== packageMaterials(estimate.evidence) || material !== packageMaterials(estimate.packageDescription)) return null;
  const formats = /\b(?:frasco|garrafa|bisnaga|tubo|aerossol|spray|barra|pacote|caixa|blister|sache|sachê|pote|kit|combo|multipack|cartela|estojo|lata|saco|envelope)\b/gi;
  const targetFormats = [...new Set(estimate.targetEvidence.match(formats)?.map(normalizedWords) ?? [])].sort().join("|");
  const comparableFormats = [...new Set(estimate.evidence.match(formats)?.map(normalizedWords) ?? [])].sort().join("|");
  const descriptionFormats = [...new Set(estimate.packageDescription.match(formats)?.map(normalizedWords) ?? [])].sort().join("|");
  if (!targetFormats || targetFormats !== comparableFormats || targetFormats !== descriptionFormats) return null;
  // Reuse all exact gross-weight, units, axes, packaging and grounding guards on the comparable itself.
  const comparable = qualifyShippingReference({
    identityMatch: "exact", packageLevel: estimate.packageLevel, warnings: [],
    weight: estimate.weight && { ...estimate.weight, sourceIndex: estimate.sourceIndex, evidence: estimate.evidence },
    dimensions: estimate.dimensions && { ...estimate.dimensions, sourceIndex: estimate.sourceIndex, evidence: estimate.evidence },
  }, { ...context, name: estimate.comparableName, exactIdentity: true });
  const source = comparable?.weightSource ?? comparable?.dimensionsSource;
  if (!comparable || !source) return null;
  const candidate = {
    comparableName: estimate.comparableName, packageDescription: estimate.packageDescription, source, targetSource: targetSource.data,
    productFamily: family, packageMaterial: estimate.packageMaterial, confidence: "low",
    assumptions: [...estimate.assumptions, "Intervalos de ±20% sobre o comparável, arredondados para fora. Confira peso, proteção e caixa reais antes de aprovar."],
    weightGrams: exact.weightGrams === null ? estimateRange(comparable.weightGrams, 30000) : null,
    lengthCm: exact.lengthCm === null ? estimateRange(comparable.lengthCm, 200, true) : null,
    widthCm: exact.widthCm === null ? estimateRange(comparable.widthCm, 200, true) : null,
    heightCm: exact.heightCm === null ? estimateRange(comparable.heightCm, 200, true) : null,
  };
  if (![candidate.weightGrams, candidate.lengthCm, candidate.widthCm, candidate.heightCm].some(Boolean)) return null;
  const parsed = shippingEstimateSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** Research is a reference, never a measured/approved shipping profile. */
export function qualifyShippingReference(raw: unknown, context: {
  name: string; exactIdentity: boolean; research: string; sources: { title: string; url: string }[];
}): ShippingReference | null {
  const parsed = rawShippingReferenceSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  const warnings = [...data.warnings];
  const result: ShippingReference = {
    productName: context.name.slice(0, 160), packageLevel: "unknown", weightGrams: null,
    widthCm: null, heightCm: null, lengthCm: null, weightSource: null, dimensionsSource: null,
    warnings, researchedAt: new Date().toISOString(),
  };
  if (!context.exactIdentity || data.identityMatch !== "exact" || ["case", "unknown"].includes(data.packageLevel)
    || (isKit(context.name) && data.packageLevel === "retail_unit")) {
    warnings.unshift("Apresentação ou nível de embalagem não confirmado. Meça e pese a unidade que será vendida.");
    return result;
  }
  result.packageLevel = data.packageLevel as ShippingReference["packageLevel"];
  function sourceFor(fact: z.infer<typeof rawShippingReferenceSchema>["weight"] | z.infer<typeof rawShippingReferenceSchema>["dimensions"]) {
    if (!fact || unusablePackaging.test(fact.evidence) || !textKey(context.research).includes(textKey(fact.evidence))) return null;
    const source = context.sources[fact.sourceIndex];
    const candidate = sourceSchema.safeParse(source && { ...source, evidence: fact.evidence });
    return candidate.success ? candidate.data : null;
  }
  const weightSource = sourceFor(data.weight);
  if (data.weight?.kind === "gross" && weightSource && citesNumbers(data.weight.evidence, [data.weight.value], data.weight.unit)
    && /bruto|gross|peso.{0,20}com.{0,20}embalagem|peso (?:do )?produto embalado|peso total (?:da unidade|do pacote fechado)/i.test(data.weight.evidence)
    && !/(?:peso|massa|conte[uú]do)\s+l[ií]quid[oa]|net\s*weight|sem\s+(?:a\s+)?embalagem|embalagem vazia|faixa de peso|peso do beb[eê]/i.test(data.weight.evidence)) {
    const grams = Math.ceil(data.weight.value * (data.weight.unit === "kg" ? 1000 : 1));
    if (grams >= 1 && grams <= 30000) { result.weightGrams = grams; result.weightSource = weightSource; }
  }
  if (data.weight && data.weight.kind !== "gross") warnings.push("Peso líquido/conteúdo não é peso para frete. Pese o produto com a embalagem.");
  const dimensionsSource = sourceFor(data.dimensions);
  if (data.dimensions && dimensionsSource && citesDimensions(data.dimensions)) {
    const factor = { mm: 0.1, cm: 1, m: 100 }[data.dimensions.unit];
    const [width, height, length] = [data.dimensions.width, data.dimensions.height, data.dimensions.length].map(value => Math.ceil(value * factor * 100) / 100);
    if ([width, height, length].every(value => value > 0 && value <= 200)) {
      Object.assign(result, { widthCm: width, heightCm: height, lengthCm: length, dimensionsSource });
    }
  }
  if (!result.weightSource) warnings.push("Peso bruto não encontrado com fonte utilizável; confira na balança.");
  if (!result.dimensionsSource) warnings.push("Dimensões completas não encontradas com fonte utilizável; confira com régua ou fita.");
  if (data.packageLevel !== "shipping_package") warnings.push("Referência da embalagem comercial. Acrescente a proteção e a caixa usadas pela farmácia e confira o volume final.");
  result.estimate = qualifyEstimate(data, context, result);
  if (result.estimate) warnings.unshift("Estimativa por produto comparável: baixa confiança. Use somente como rascunho e confira fisicamente antes de liberar frete.");
  result.warnings = [...new Set(warnings)].slice(0, 8);
  return result;
}

// Gemini structured output uses its own schema dialect. Keep units explicit, never inferred from a number.
const evidenceProperties = { sourceIndex: { type: "integer" }, evidence: { type: "string", description: "Trecho literal das NOTAS PESQUISADAS que informa estes valores, suas unidades e embalagem. Nunca inventar trecho." } };
export const shippingReferenceJsonSchema = {
  type: "object", nullable: true,
  properties: {
    identityMatch: { type: "string", enum: ["exact", "uncertain", "conflict"] },
    packageLevel: { type: "string", enum: ["retail_unit", "retail_kit", "shipping_package", "case", "unknown"], description: "Unidade comercial exata, kit vendido inteiro, volume pronto para transporte, caixa master de distribuição ou desconhecido." },
    weight: { type: "object", nullable: true, properties: { ...evidenceProperties, value: { type: "number" }, unit: { type: "string", enum: ["g", "kg"] }, kind: { type: "string", enum: ["gross", "net", "unknown"] } }, required: ["value", "unit", "kind", "sourceIndex", "evidence"] },
    dimensions: { type: "object", nullable: true, properties: { ...evidenceProperties, width: { type: "number" }, height: { type: "number" }, length: { type: "number" }, unit: { type: "string", enum: ["mm", "cm", "m"] } }, required: ["width", "height", "length", "unit", "sourceIndex", "evidence"] },
    estimate: {
      type: "object", nullable: true,
      description: "Fallback separado: fatos comprovados de um comparável com mesmo formato e apresentação. O servidor gera intervalos conservadores; nunca colocar estes valores nos campos exatos.",
      properties: {
        ...evidenceProperties,
        comparableName: { type: "string", description: "Nome e apresentação do comparável literalmente presentes no trecho." },
        packageDescription: { type: "string", description: "Formato e apresentação da embalagem fechada, literalmente presentes no mesmo trecho." },
        productFamily: { type: "string", description: "Família física específica comprovada nos dois nomes: fralda, lenço umedecido, perfume, sabonete, shampoo, comprimido, cápsula, chocolate, termômetro etc. Categoria higiene/infantil/other não comprova compatibilidade." },
        packageMaterial: { type: "string", description: "Material factual da embalagem nos dois trechos, como vidro, plástico, papelão ou materiais combinados. Nunca inferir por foto; material desconhecido bloqueia estimate." },
        targetSourceIndex: { type: "integer", description: "Índice da fonte que comprova formato e material da embalagem do ALVO." },
        targetEvidence: { type: "string", description: "Trecho literal das notas contendo nome completo do ALVO, formato e material da embalagem. Deve vir da fonte indicada." },
        packageLevel: { type: "string", enum: ["retail_unit", "retail_kit"] },
        assumptions: { type: "array", items: { type: "string" }, description: "Explique compatibilidade da embalagem, diferenças e necessidade de pesagem/conferência física; não invente fatos." },
        weight: { type: "object", nullable: true, properties: { value: { type: "number" }, unit: { type: "string", enum: ["g", "kg"] }, kind: { type: "string", enum: ["gross", "net", "unknown"] } }, required: ["value", "unit", "kind"] },
        dimensions: { type: "object", nullable: true, properties: { width: { type: "number" }, height: { type: "number" }, length: { type: "number" }, unit: { type: "string", enum: ["mm", "cm", "m"] } }, required: ["width", "height", "length", "unit"] },
      },
      required: ["sourceIndex", "evidence", "comparableName", "packageDescription", "productFamily", "packageMaterial", "targetSourceIndex", "targetEvidence", "packageLevel", "assumptions", "weight", "dimensions"],
    },
    warnings: { type: "array", items: { type: "string" } },
  }, required: ["identityMatch", "packageLevel", "weight", "dimensions", "warnings", "estimate"],
} as const;

export const shippingResearchInstructions = [
  "Pesquise tambem LOGISTICA da apresentacao exata: EAN, marca, modelo/versao, concentracao, quantidade e tamanho. Procure ficha tecnica do fabricante, catalogo logistico/distribuidor e lojas com especificacoes identificadas. Registre fonte e trecho factual de cada peso ou dimensao; ausencia significa nao encontrado nos campos exatos.",
  "Na mesma pesquisa, busque combinacoes do EAN exato ou nome/marca/apresentacao com peso bruto, peso com embalagem, largura, altura, comprimento e ficha tecnica. Nao pare no peso/volume do rotulo. Kit, combo e multipack exigem dados do conjunto vendido inteiro; pacote fechado de fraldas e unidade comercial, nao caixa master.",
  "Distinga peso liquido/conteudo de peso bruto com embalagem comercial e de peso do volume pronto para envio. Nao converter ml/L em gramas/kg; nao usar mg por comprimido como peso da caixa. Nao estimar por foto, proporcao visual ou conhecimento geral. Medidas de semelhantes nunca viram fatos exatos do alvo.",
  "Se faltarem fatos logisticos exatos, na MESMA pesquisa procure um produto comparavel com embalagem fechada de mesmo formato, quantidade, volume/dosagem e tamanho aplicaveis. Inclua medicamento, perfumaria, alimento, fralda, dispositivo e kit conforme embalagem, sem lista de marcas permitidas. Sem apresentacao do alvo conhecida ou com conflito de EAN/identidade, nao estime. Nao divida caixa master, nao converta volume/dose/faixa do bebe em massa e nao monte kit a partir de unidades individuais.",
  "Separe nas notas COMPARAVEL PARA ESTIMATIVA: nome/apresentacao, descricao curta da embalagem fechada, nivel retail_unit/retail_kit, URL e um trecho factual literal contendo esse nome, descricao, peso BRUTO explicito e/ou os tres eixos nomeados com unidades originais. Registre tambem uma linha separada com o nome completo do ALVO e o formato confirmado da embalagem (frasco, caixa, pacote, kit etc.); formato desconhecido bloqueia estimativa. Registre premissas de compatibilidade e diferencas. Sem fonte ou medidas comprovadas do comparavel, estimate null. O servidor gera intervalos conservadores de ±20%, nao pseudoprecisao; a caixa adicional da farmacia exige conferencia humana.",
  "Para o comparavel, comprove a MESMA familia fisica especifica nos nomes do alvo e do comparavel (fralda nao e lenco umedecido; higiene/infantil/other nao bastam). Fraldas exigem publico adulto/geriatrico ou infantil/bebe explicito e igual nos dois nomes; tamanho e quantidade iguais nao comprovam essa compatibilidade. Publico desconhecido ou ambiguo: estimate null. Creme dental e pasta dental pertencem a familia pasta dental, sem misturar creme corporal. Registre MATERIAL e formato factual da embalagem do alvo em targetEvidence com URL/fonte, e material/formato identicos no trecho do comparavel e packageDescription. Frasco de vidro nao e compativel com plastico. Material/familia desconhecidos ou divergentes: estimate null, preservando fatos exatos existentes.",
  "Medicamento: caixa ou frasco da concentracao/quantidade exatas; perfumaria: frasco cheio com tampa/caixa, volume nao e massa; fralda: pacote fechado da marca/linha, tamanho RN/P/M/G/GG/XXG e quantidade exatos, nunca dimensao da fralda aberta, tamanho do bebe ou faixa de peso corporal; alimentos: unidade/kit exatos, peso liquido separado do bruto. Nunca dividir caixa master para inferir uma unidade, nem multiplicar dimensoes por quantidade.",
  "Identifique o nivel de embalagem: unidade comercial, kit vendido inteiro, volume pronto para transporte ou caixa master. Cite largura, altura e comprimento com numero e unidade explicitos para cada eixo; se a ordem das dimensoes nao estiver identificada, nao adivinhe os eixos. Preserve unidades originais. Fontes divergentes para a mesma apresentacao exigem campos incertos vazios e aviso, nao uma media.",
  "Nas notas de LOGISTICA inclua uma linha curta por fato, com valores, unidades originais, nivel da embalagem e URL da fonte. Separe peso bruto e dimensoes: se encontrar apenas um, preserve esse dado e marque o outro como ausente. Inclua produtos embalados, dispositivos, suplementos, alimentos, higiene, perfumaria e kits, sem limitar por categoria. Sem dado bruto explicito ou fonte especifica, deixe ausente. Nao conclua aceitação de transporte, conservacao, receita ou liberacao de frete: isso depende de revisao humana.",
].join("\n");
