import { z } from "zod";

const citedFact = {
  sourceIndex: z.number().int().min(0).max(7),
  evidence: z.string().trim().min(8).max(400),
};
const positive = z.number().finite().positive();
export const rawShippingReferenceSchema = z.object({
  identityMatch: z.enum(["exact", "uncertain", "conflict"]),
  packageLevel: z.enum(["retail_unit", "retail_kit", "shipping_package", "case", "unknown"]),
  weight: z.object({ ...citedFact, value: positive, unit: z.enum(["g", "kg"]), kind: z.enum(["gross", "net", "unknown"]) }).nullable(),
  dimensions: z.object({ ...citedFact, width: positive, height: positive, length: positive, unit: z.enum(["mm", "cm", "m"]) }).nullable(),
  warnings: z.array(z.string().trim().min(2).max(220)).max(5),
});

const sourceSchema = z.object({
  title: z.string().max(120),
  url: z.string().url().max(2000).refine(value => new URL(value).protocol === "https:"),
  evidence: z.string().min(8).max(400),
});
export const shippingReferenceSchema = z.object({
  productName: z.string().max(160),
  packageLevel: z.enum(["retail_unit", "retail_kit", "shipping_package", "unknown"]),
  weightGrams: z.number().int().min(1).max(30000).nullable(),
  widthCm: positive.max(200).nullable(), heightCm: positive.max(200).nullable(), lengthCm: positive.max(200).nullable(),
  weightSource: sourceSchema.nullable(), dimensionsSource: sourceSchema.nullable(),
  warnings: z.array(z.string().max(220)).max(8),
  researchedAt: z.iso.datetime(),
});
export type ShippingReference = z.infer<typeof shippingReferenceSchema>;

const textKey = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
function citesNumbers(evidence: string, values: number[], unit: string) {
  const numbers = (evidence.match(/\d+(?:[.,]\d+)*/g) ?? []).map(value => Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value));
  const units: Record<string, string> = { g: "g|gramas?", kg: "kg|quilogramas?", mm: "mm|mil[ií]metros?", cm: "cm|cent[ií]metros?", m: "m|metros?" };
  return new RegExp(`(?<![a-z])(?:${units[unit] ?? unit})\\b`, "i").test(evidence) && values.every(value => numbers.includes(value));
}
export function sameShippingVariant(requested: string, found: string) {
  if (!/fralda/i.test(requested)) return true;
  const sizes: string[] = requested.toUpperCase().match(/\b(?:RN|XXG|XG|GG|G|M|P)\b/g) ?? [];
  const foundSizes: string[] = found.toUpperCase().match(/\b(?:RN|XXG|XG|GG|G|M|P)\b/g) ?? [];
  return sizes.every(size => foundSizes.includes(size));
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
  if (!context.exactIdentity || data.identityMatch !== "exact" || ["case", "unknown"].includes(data.packageLevel)) {
    warnings.unshift("Apresentação ou nível de embalagem não confirmado. Meça e pese a unidade que será vendida.");
    return result;
  }
  result.packageLevel = data.packageLevel as ShippingReference["packageLevel"];
  function sourceFor(fact: z.infer<typeof rawShippingReferenceSchema>["weight"] | z.infer<typeof rawShippingReferenceSchema>["dimensions"]) {
    if (!fact || !textKey(context.research).includes(textKey(fact.evidence))) return null;
    const source = context.sources[fact.sourceIndex];
    const candidate = sourceSchema.safeParse(source && { ...source, evidence: fact.evidence });
    return candidate.success ? candidate.data : null;
  }
  const weightSource = sourceFor(data.weight);
  if (data.weight?.kind === "gross" && weightSource && citesNumbers(data.weight.evidence, [data.weight.value], data.weight.unit)
    && /bruto|gross|peso.{0,12}com.{0,12}embalagem/i.test(data.weight.evidence)) {
    const grams = Math.ceil(data.weight.value * (data.weight.unit === "kg" ? 1000 : 1));
    if (grams >= 1 && grams <= 30000) { result.weightGrams = grams; result.weightSource = weightSource; }
  }
  if (data.weight && data.weight.kind !== "gross") warnings.push("Peso líquido/conteúdo não é peso para frete. Pese o produto com a embalagem.");
  const dimensionsSource = sourceFor(data.dimensions);
  if (data.dimensions && dimensionsSource && citesNumbers(data.dimensions.evidence, [data.dimensions.width, data.dimensions.height, data.dimensions.length], data.dimensions.unit)) {
    const factor = { mm: 0.1, cm: 1, m: 100 }[data.dimensions.unit];
    const [width, height, length] = [data.dimensions.width, data.dimensions.height, data.dimensions.length].map(value => Math.ceil(value * factor * 100) / 100);
    if ([width, height, length].every(value => value > 0 && value <= 200)) {
      Object.assign(result, { widthCm: width, heightCm: height, lengthCm: length, dimensionsSource });
    }
  }
  if (!result.weightSource) warnings.push("Peso bruto não encontrado com fonte utilizável; confira na balança.");
  if (!result.dimensionsSource) warnings.push("Dimensões completas não encontradas com fonte utilizável; confira com régua ou fita.");
  if (data.packageLevel !== "shipping_package") warnings.push("Referência da embalagem comercial. Acrescente a proteção e a caixa usadas pela farmácia e confira o volume final.");
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
    warnings: { type: "array", items: { type: "string" } },
  }, required: ["identityMatch", "packageLevel", "weight", "dimensions", "warnings"],
} as const;

export const shippingResearchInstructions = [
  "Pesquise tambem LOGISTICA da apresentacao exata: EAN, marca, modelo/versao, concentracao, quantidade e tamanho. Procure ficha tecnica do fabricante, catalogo logistico/distribuidor e lojas com especificacoes identificadas. Registre fonte e trecho factual de cada peso ou dimensao; ausencia significa nao encontrado, nunca estimativa.",
  "Distinga peso liquido/conteudo de peso bruto com embalagem comercial e de peso do volume pronto para envio. Nao converter ml/L em gramas/kg; nao usar mg por comprimido como peso da caixa. Nao estimar peso/dimensoes por foto, proporcao visual, produto semelhante ou conhecimento geral.",
  "Medicamento: caixa ou frasco da concentracao/quantidade exatas; perfumaria: frasco cheio com tampa/caixa, volume nao e massa; fralda: pacote fechado da marca/linha, tamanho RN/P/M/G/GG/XXG e quantidade exatos, nunca dimensao da fralda aberta, tamanho do bebe ou faixa de peso corporal; alimentos: unidade/kit exatos, peso liquido separado do bruto. Nunca dividir caixa master para inferir uma unidade, nem multiplicar dimensoes por quantidade.",
  "Identifique o nivel de embalagem: unidade comercial, kit vendido inteiro, volume pronto para transporte ou caixa master. Rotule largura, altura e comprimento; se a ordem das dimensoes nao estiver identificada, nao adivinhe os eixos. Preserve unidades originais. Fontes divergentes para a mesma apresentacao exigem campos incertos vazios e aviso, nao uma media.",
  "Nas notas de LOGISTICA inclua os valores, unidades, nivel da embalagem e a fonte que os sustenta. Sem dado bruto explicito ou fonte especifica, deixe ausente. Nao conclua aceitação de transporte, conservacao, receita ou liberacao de frete: isso depende de revisao humana.",
].join("\n");
