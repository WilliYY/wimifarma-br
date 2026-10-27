import { z } from "zod";
import { logisticsEvidenceSchema, evidenceStatus, logisticsGtinSchema, physicalSidesSchema, activeLogisticsObservations } from "./logistics-evidence";
import { shippingCargoKindsSchema } from "./cargo-policy";
import { shippingDraftSchema, type ShippingDraft } from "./product-draft";

export const packagingRecipeSchema = z.object({
  version: z.literal(1), name: z.string().trim().min(2).max(120),
  compatibleGtins: z.array(logisticsGtinSchema).max(500).refine(items => new Set(items).size === items.length, "GTIN repetido."),
  innerSidesMm: physicalSidesSchema.nullable(), outerSidesMm: physicalSidesSchema.nullable(),
  containerTareGrams: z.number().positive().max(30000).nullable(), protectionTareGrams: z.number().min(0).max(30000).nullable(),
  clearanceMm: z.tuple([z.number().min(0).max(500), z.number().min(0).max(500), z.number().min(0).max(500)]).nullable(),
  protectionDescription: z.string().trim().max(1000), calibrated: z.boolean(),
  calibratedAt: z.iso.datetime({ offset: true }).nullable(), calibrationNote: z.string().trim().max(1000),
  unitSideOrder: z.tuple([z.string().trim().min(1).max(40), z.string().trim().min(1).max(40), z.string().trim().min(1).max(40)]).nullable(),
  allowedOrientations: z.array(z.tuple([z.number().int().min(0).max(2), z.number().int().min(0).max(2), z.number().int().min(0).max(2)])
    .refine(axes => new Set(axes).size === 3, "Orientação deve usar cada eixo uma vez.")).max(6)
    .refine(items => new Set(items.map(axes => axes.join("/"))).size === items.length, "Orientação repetida."),
}).strict().superRefine((value, context) => {
  if (value.innerSidesMm && value.outerSidesMm && value.innerSidesMm.some((side, index) => side > value.outerSidesMm![index])) context.addIssue({ code: "custom", message: "Medidas internas excedem as externas." });
  if (value.calibrated && (!value.calibratedAt || !value.calibrationNote.trim() || !value.protectionDescription.trim())) context.addIssue({ code: "custom", message: "Documente a calibração e a proteção." });
  if (value.calibrated && value.allowedOrientations.length === 0) context.addIssue({ code: "custom", message: "Confirme as orientações permitidas na calibração." });
  if (value.calibrated && !value.unitSideOrder) context.addIssue({ code: "custom", message: "Confirme a ordem dos eixos da unidade na calibração." });
});
export type PackagingRecipe = z.infer<typeof packagingRecipeSchema>;

// Preview only: no enabled profile, service approval, database write or reuse of legacy protected-unit mass.
export function prepareProtectedDraft(input: { evidence: unknown; recipe: unknown; cargoKinds: unknown; freightEligible: boolean; existingProfile: unknown }): { blockers: string[]; draft: ShippingDraft | null } {
  const blockers: string[] = [];
  const evidence = logisticsEvidenceSchema.safeParse(input.evidence);
  const recipe = packagingRecipeSchema.safeParse(input.recipe);
  const cargo = shippingCargoKindsSchema.safeParse(input.cargoKinds);
  if (input.existingProfile !== null && input.existingProfile !== undefined) blockers.push("Perfil protegido existente preservado; não somar outra tara.");
  if (!input.freightEligible) blockers.push("Elegibilidade de transporte exige revisão separada.");
  if (!cargo.success || !cargo.data.length || cargo.data.includes("unspecified")) blockers.push("Classifique a carga separadamente.");
  if (!evidence.success || evidenceStatus(input.evidence) !== "complete_reference" || !evidence.data.review.confirmed) blockers.push("Confirme referência comercial completa, sem conflito, com peso bruto explícito.");
  if (evidence.success && activeLogisticsObservations(evidence.data).some(item => item.packagingLevel !== "retail_unit" || item.units !== 1 || item.weightBasis !== "gross_explicit")) blockers.push("Há fonte master, peso líquido/não definido ou unidade desconhecida; resolva a referência antes de preparar.");
  if (!recipe.success) blockers.push("Receita de embalagem inválida ou ausente.");
  if (!evidence.success || !recipe.success || !cargo.success) return { blockers, draft: null };
  const selected = recipe.data;
  if (!selected.compatibleGtins.includes(evidence.data.gtin)) blockers.push("Compatibilidade física deste GTIN ainda não confirmada.");
  if (!selected.unitSideOrder || activeLogisticsObservations(evidence.data).some(item => item.sidesMm && JSON.stringify(item.sideOrder) !== JSON.stringify(selected.unitSideOrder))) blockers.push("Ordem dos eixos da fonte difere da convenção calibrada; confira a orientação desta apresentação.");
  if (!selected.calibrated || !selected.calibratedAt || !selected.calibrationNote || !selected.protectionDescription || !selected.innerSidesMm || !selected.outerSidesMm || !selected.clearanceMm || !selected.allowedOrientations.length || selected.containerTareGrams === null || selected.protectionTareGrams === null) blockers.push("Confira calibração, recipiente externo, proteção, tara, folgas e orientações permitidas.");
  const unit = activeLogisticsObservations(evidence.data).find(item => item.packagingLevel === "retail_unit" && item.units === 1 && item.weightBasis === "gross_explicit" && item.weightGrams !== null && item.sidesMm !== null && item.dimensionsBasis !== "unlabeled");
  if (unit?.sidesMm && selected.innerSidesMm && selected.clearanceMm) {
    const orientations = selected.allowedOrientations.map(axes => axes.map(axis => unit.sidesMm![axis]));
    if (!orientations.some(sides => sides.every((side, index) => side + 2 * selected.clearanceMm![index] <= selected.innerSidesMm![index]))) blockers.push("Unidade com proteção/folgas não cabe nas medidas internas.");
  }
  if (blockers.length || !unit || unit.weightGrams === null || !selected.outerSidesMm) return { blockers, draft: null };
  const [widthCm, heightCm, lengthCm] = selected.outerSidesMm.map(side => side / 10);
  const draft = shippingDraftSchema.safeParse({ enabled: false, transportReviewed: false, measurementBasis: "estimated", reference: null,
    weightGrams: Math.ceil(unit.weightGrams + selected.containerTareGrams! + selected.protectionTareGrams!), widthCm, heightCm, lengthCm, cargoKinds: cargo.data });
  return draft.success ? { blockers: [], draft: draft.data } : { blockers: ["Volume protegido excede os limites do cadastro de frete."], draft: null };
}
