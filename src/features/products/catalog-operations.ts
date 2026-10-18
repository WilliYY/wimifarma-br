import { z } from "zod";

export const catalogKindLabels = { UNCLASSIFIED: "A classificar", MEDICINE: "Medicamento", PERFUMERY: "Perfumaria", HYGIENE: "Higiene", SUPPLEMENT: "Suplemento", FOOD: "Alimento", OTHER: "Outros" } as const;
export const medicineClassLabels = { UNCLASSIFIED: "A conferir", GENERIC: "Genérico", SIMILAR: "Similar", REFERENCE: "Referência", OTHER: "Outro medicamento" } as const;
export const catalogClassificationSchema = z.object({
  kind: z.enum(["UNCLASSIFIED", "MEDICINE", "PERFUMERY", "HYGIENE", "SUPPLEMENT", "FOOD", "OTHER"]),
  medicineClass: z.enum(["UNCLASSIFIED", "GENERIC", "SIMILAR", "REFERENCE", "OTHER"]),
  ethical: z.boolean(),
  otc: z.boolean(),
}).strict();
export type CatalogClassification = z.infer<typeof catalogClassificationSchema>;
export const emptyClassification: CatalogClassification = { kind: "UNCLASSIFIED", medicineClass: "UNCLASSIFIED", ethical: false, otc: false };

export function readClassification(value: unknown): CatalogClassification {
  const parsed = catalogClassificationSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...emptyClassification };
}

export function classificationIsConsistent(classification: CatalogClassification, product: { requiresPrescription: boolean; prescriptionType?: string; isPopularPharmacy?: boolean }) {
  if (classification.kind !== "MEDICINE") {
    return classification.medicineClass === "UNCLASSIFIED" && !classification.ethical && !classification.otc &&
      (classification.kind === "UNCLASSIFIED" || (!product.requiresPrescription && !product.isPopularPharmacy && (!product.prescriptionType || product.prescriptionType === "UNREVIEWED")));
  }
  return !classification.otc || (!product.requiresPrescription && !product.isPopularPharmacy && (!product.prescriptionType || product.prescriptionType === "UNREVIEWED"));
}

export function classificationLabels(value: unknown) {
  const item = readClassification(value);
  return [catalogKindLabels[item.kind], ...(item.kind === "MEDICINE" ? [medicineClassLabels[item.medicineClass], ...(item.ethical ? ["Ético"] : []), ...(item.otc ? ["MIP / OTC"] : [])] : [])];
}

export const supplierMarkupSchema = z.number().int().min(0).max(10000);
const money = z.number().positive().max(99999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use até duas casas decimais.");
export const quickProductUpdateSchema = z.object({
  expectedUpdatedAt: z.iso.datetime(),
  catalogClassification: catalogClassificationSchema.optional(),
  supplierMarkupBps: supplierMarkupSchema.optional(),
  price: money.optional(),
  promotionalPrice: money.nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 1, "Informe uma alteração.");
export type QuickProductUpdate = z.infer<typeof quickProductUpdateSchema>;
