import { z } from "zod";
import { type AverageEstimateIdentity, type AverageShippingEstimate } from "./average-estimate";
import { estimateWeightOnly } from "./base-estimate";
import { activeLogisticsObservations, evidenceStatus, logisticsEvidenceSchema, logisticsGtinSchema } from "./logistics-evidence";
import { shippingDraftSchema } from "./product-draft";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const gtinsSchema = z.array(logisticsGtinSchema).min(1).max(500).refine(values => new Set(values).size === values.length, "GTIN repetido no grupo.");
export const familyGroupSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), label: z.string().trim().min(3).max(200),
  brands: z.array(z.string().trim().min(2).max(150)).min(1).max(100),
  kind: z.enum(["ORAL_TABLETS", "BODY_LOTION", "ROLL_ON", "WIPES"]), quantity: z.number().positive().max(2000),
  memberGtins: gtinsSchema, referenceGtins: gtinsSchema.refine(values => values.length >= 2, "São necessárias duas referências distintas."),
  rationale: z.string().trim().min(10).max(2000), packagingHypothesis: z.string().trim().min(10).max(2000),
}).strict().superRefine((group, context) => {
  if (group.referenceGtins.some(gtin => !group.memberGtins.includes(gtin))) context.addIssue({ code: "custom", message: "Referência deve pertencer à lista explícita de membros." });
  if (new Set(group.brands.map(normalize)).size !== group.brands.length) context.addIssue({ code: "custom", message: "Marca repetida." });
  if (group.kind === "ORAL_TABLETS" && (!Number.isInteger(group.quantity) || group.quantity > 120) || group.kind === "WIPES" && group.quantity !== 48) context.addIssue({ code: "custom", message: "Quantidade incompatível com a família revisada." });
});
export const familyGroupsSchema = z.array(familyGroupSchema).max(500).superRefine((groups, context) => {
  const ids = new Set<string>();
  const members = new Set<string>();
  for (const group of groups) {
    if (ids.has(group.id)) context.addIssue({ code: "custom", message: "Identificador de grupo repetido." });
    ids.add(group.id);
    for (const gtin of group.memberGtins) {
      if (members.has(gtin)) context.addIssue({ code: "custom", message: "GTIN membro de mais de um grupo." });
      members.add(gtin);
    }
  }
});
export type FamilyGroup = z.infer<typeof familyGroupSchema>;
export type FamilyShippingEstimate = Omit<AverageShippingEstimate, "basis" | "weightBasis"> & {
  policyVersion: "reviewed-family-v1"; basis: "REVIEWED_FAMILY"; familyGroupId: string;
  weightBasis: "EXACT_GTIN_GROSS" | "WEIGHT_POLICY" | "FAMILY_ENVELOPE";
  minimumRetailSidesCm: number[]; minimumRetailWeightGrams: number | null;
};

const hygieneCategories = new Set(["higiene", "higiene pessoal", "higiene infantil", "higiene e beleza", "higiene e cuidados do bebe", "higiene e cuidados pessoais", "cuidados pessoais", "lencos e toalhas umedecidas"]);
function eligible(input: AverageEstimateIdentity, group: FamilyGroup) {
  if (!logisticsGtinSchema.safeParse(input.gtin).success || !group.brands.map(normalize).includes(normalize(input.brand ?? ""))) return false;
  const name = normalize(input.name).replace(/([a-z])(?=\d)/g, "$1 ").replace(/(\d)(?=[a-z])/g, "$1 ");
  if (group.kind === "ORAL_TABLETS") {
    const base = estimateWeightOnly({ ...input, logisticsEvidence: null });
    return base?.family === "ORAL_SOLID" && base.declaredContent === group.quantity &&
      /\b(?:comprimidos?|comp|cp)\b/.test(name) &&
      !/\b(?:caps\w*|cps|drage\w*|frasco\w*|pote\w*|sache\w*|envelope\w*|subling\w*|liberacao|prolongad\w*|retard\w*|orodispers\w*|dispers\w*|gastror?resist\w*|enteric\w*|efervescent\w*|mastig\w*|xr|sr|cr|mr|dr|er|ec|lp|lc|odt)\b/.test(name);
  }
  if (group.kind === "BODY_LOTION") {
    const base = estimateWeightOnly({ ...input, logisticsEvidence: null });
    return base?.family === "HYGIENE_VOLUME" && base.declaredContent === group.quantity && base.declaredUnit === "ml" &&
      /\b(?:hidratante\w*|locao|locoes)\b/.test(name) &&
      !/\b(?:solar\w*|sun|fps|fac|facial\w*|rosto|lab|labia\w*|banho|shampoo\w*|tubo\w*|bisnaga\w*|refil\w*|pote\w*|kits?|combo\w*)\b/.test(name);
  }
  if (group.kind === "ROLL_ON") {
    const base = estimateWeightOnly({ ...input, logisticsEvidence: null });
    return base?.family === "HYGIENE_VOLUME" && base.declaredContent === group.quantity && base.declaredUnit === "ml" &&
      /\broll[ -]?on\b/.test(name) && !/\b(?:tubo\w*|bisnaga\w*|refil\w*|pote\w*|inflamav\w*|flammab\w*)\b/.test(name);
  }
  // Counted wet wipes do not fit the volume/mass policy. Keep this gate deliberately narrower.
  const counts = [...name.matchAll(/\b(\d+)\s*(?:unidades?|unid|und|un)\b/g)];
  return name.length <= 500 && !input.requiresPrescription && !input.isPopularPharmacy &&
    !["CONTROLLED", "ANTIMICROBIAL"].includes(input.prescriptionType ?? "") &&
    hygieneCategories.has(normalize(input.category ?? "")) && /\b(?:lencos?|toalhas?)\s+umedecid\w*\b/.test(name) &&
    counts.length === 1 && Number(counts[0][1]) === group.quantity && group.quantity === 48 &&
    !/\b(?:alcool\w*|etanol|perf\w*|aero\w*|spray\w*|alc|alco|edt|edp|colonia\w*|acetona\w*|esmalte\w*|inflamav\w*|flammab\w*|refriger\w*|congel\w*|geladeira|termolabil\w*|insulina\w*|vacina\w*|injet\w*|ampola\w*|seringa\w*|intraven\w*|intramuscular\w*|vidro\w*|controlad\w*|farmacia popular|kits?|combo\w*|multipack|packs?|duopack|tripack|leve|pague|brinde\w*)\b|\d\s*[x×]\s*\d|\+|\b\d+(?:[.,]\d+)?\s*(?:ml|mg|g|kg|l|litros?|gramas?|caixas?|pacotes?)\b|\bc\s*\//.test(name);
}

function currentEvidence(input: AverageEstimateIdentity) {
  const parsed = logisticsEvidenceSchema.safeParse(input.logisticsEvidence);
  return parsed.success && parsed.data.gtin === input.gtin && evidenceStatus(parsed.data) !== "conflict" ? parsed.data : null;
}
function reference(input: AverageEstimateIdentity) {
  const evidence = currentEvidence(input);
  if (!evidence) return null;
  const rows = activeLogisticsObservations(evidence).filter(row => row.packagingLevel === "retail_unit" && row.units === 1 && !row.identityConflict).sort((a, b) => a.id.localeCompare(b.id));
  const dimensions = rows.filter(row => row.sidesMm && row.dimensionsBasis !== "unlabeled");
  if (!dimensions.length) return null;
  const gross = rows.filter(row => row.weightBasis === "gross_explicit" && row.weightGrams !== null);
  const sources = [...new Map([...dimensions, ...gross].map(row => [row.id, row])).values()];
  return { gtin: input.gtin, sides: [...dimensions[0].sidesMm!].sort((a, b) => b - a).map(side => side / 10), weight: gross[0]?.weightGrams ?? null, sources };
}

/** Reviewed family membership provides an estimated scenario only; it never confirms physical compatibility. */
export function estimateFamilyShipping(input: AverageEstimateIdentity, catalog: AverageEstimateIdentity[], groups: unknown): FamilyShippingEstimate | null {
  const manifest = familyGroupsSchema.safeParse(groups);
  if (!manifest.success) return null;
  const group = manifest.data.find(group => group.memberGtins.includes(input.gtin));
  if (!group || !eligible(input, group)) return null;
  if (input.logisticsEvidence != null && !currentEvidence(input)) return null;
  if (reference(input)) return null; // The caller gives own labelled dimensions precedence.
  const counts = new Map<string, number>();
  for (const item of catalog) counts.set(item.gtin, (counts.get(item.gtin) ?? 0) + 1);
  if ((counts.get(input.gtin) ?? 0) > 1) return null;
  const samples = catalog.filter(item => item.gtin !== input.gtin && group.referenceGtins.includes(item.gtin) && counts.get(item.gtin) === 1 && eligible(item, group))
    .map(reference).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.gtin.localeCompare(b.gtin));
  if (samples.length < 2) return null;
  const axes = [0, 1, 2].map(axis => samples.map(sample => sample.sides[axis]));
  if (axes.some(values => Math.max(...values) / Math.min(...values) > 2)) return null;
  const weights = samples.flatMap(sample => sample.weight === null ? [] : [sample.weight]);
  const minimumRetailSidesCm = axes.map(values => Math.min(...values));
  const meanRetailSidesCm = axes.map(values => values.reduce((sum, value) => sum + value, 0) / values.length);
  const maximumRetailSidesCm = axes.map(values => Math.max(...values));
  const sides = maximumRetailSidesCm.map(side => Math.ceil((side + 2) * 2) / 2);
  const minimumRetailWeightGrams = weights.length ? Math.min(...weights) : null;
  const maximumRetailWeightGrams = weights.length ? Math.max(...weights) : null;
  const meanRetailWeightGrams = weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : null;
  const ownWeight = estimateWeightOnly(input);
  if (!ownWeight && (group.kind !== "WIPES" || weights.length < 2 || maximumRetailWeightGrams! / minimumRetailWeightGrams! > 2)) return null;
  const weightGrams = ownWeight?.draft.weightGrams ?? Math.ceil((maximumRetailWeightGrams! + 100) / 10) * 10;
  const draft = shippingDraftSchema.safeParse({ enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams, lengthCm: sides[0], widthCm: sides[1], heightCm: sides[2], reference: null });
  if (!draft.success) return null;
  const ownSources = ownWeight?.family === "EXACT_GROSS_REFERENCE" ? activeLogisticsObservations(currentEvidence(input)!).filter(row => ownWeight.sourceObservationIds.includes(row.id)) : [];
  const sourceObservationIds = [...samples.flatMap(sample => sample.sources.map(row => `${sample.gtin}:${row.id}`)), ...ownSources.map(row => `${input.gtin}:${row.id}`)];
  return {
    policyVersion: "reviewed-family-v1", basis: "REVIEWED_FAMILY", familyGroupId: group.id,
    weightBasis: ownWeight?.family === "EXACT_GROSS_REFERENCE" ? "EXACT_GTIN_GROSS" : ownWeight ? "WEIGHT_POLICY" : "FAMILY_ENVELOPE",
    draft: { ...draft.data, lengthCm: sides[0], widthCm: sides[1], heightCm: sides[2] },
    sourceGtins: [...new Set([...samples.map(sample => sample.gtin), ...ownSources.map(() => input.gtin)])].sort(),
    sourceObservationIds: [...new Set(sourceObservationIds)].sort(),
    sourceSha256: [...new Set([...samples.flatMap(sample => sample.sources.map(row => row.source.sha256)), ...ownSources.map(row => row.source.sha256)])].sort(),
    minimumRetailSidesCm, meanRetailSidesCm, maximumRetailSidesCm, minimumRetailWeightGrams, meanRetailWeightGrams, maximumRetailWeightGrams,
    protectionPerAxisCm: 2, externalPackagingReserveGrams: 100,
    explanation: `Grupo revisado ${group.id} (${group.label}): ${group.rationale} Hipótese de embalagem: ${group.packagingHypothesis} Estatísticas descritivas de ${samples.length} GTINs explicitamente listados, com eixos ordenados e dispersão dimensional máxima de 2 vezes. Cenário usa o máximo por eixo + 2 cm totais de proteção hipotética, arredondado para cima em 0,5 cm. ${ownWeight ? ownWeight.explanation : "Peso usa o maior bruto de pelo menos dois GTINs do grupo, com dispersão máxima de 2 vezes, mais 100 g hipotéticos de caixa/proteção, arredondado para cima em 10 g."} Compatibilidade física, recipiente, material, tara, lote e encaixe não confirmados; não é medida nem limite garantido. Não habilita transporte, revisão ou serviços.`,
  };
}
