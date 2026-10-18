import { z } from "zod";
import { normalizeGtin } from "./commerce";

export const SupplierCatalogOfferSchema = z.object({
  supplier: z.enum(["ANB", "PROFARMA"]),
  productId: z.string().trim().min(1).max(100),
  externalCode: z.string().trim().min(1).max(150),
  eanNormalized: z.string().transform(value => normalizeGtin(value)).refine(value => value !== null, "EAN inválido."),
  unitCostCents: z.number().int().min(1).max(100_000_000),
  retailCeilingCents: z.number().int().min(1).max(100_000_000).nullable().default(null),
  available: z.boolean(),
  stockQuantity: z.number().int().min(0).max(1_000_000).nullable().default(null),
  allocationQuantity: z.number().int().min(0).max(5).default(5),
  replenishAllocation: z.boolean().default(false),
  observedAt: z.iso.datetime({ offset: true }),
  validUntil: z.iso.datetime({ offset: true }),
  commercialCondition: z.string().trim().max(1000).nullable().optional(),
  sourceUrl: z.url().max(2000).refine(value => value.startsWith("https://"), "Use uma fonte HTTPS.").nullable().optional(),
}).refine(value => {
  const duration = Date.parse(value.validUntil) - Date.parse(value.observedAt);
  return duration > 0 && duration <= 86_400_000;
}, { message: "A validade deve ser positiva e de até 24 horas.", path: ["validUntil"] });

export type SupplierCatalogOfferInput = z.infer<typeof SupplierCatalogOfferSchema>;
