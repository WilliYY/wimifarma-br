import { MAX_ORDER_ITEM_QUANTITY } from "@/features/products/quantity";
import { z } from "zod";
import { shippingReferenceSchema } from "./product-reference";
import { shippingCargoKindsSchema } from "./cargo-policy";
import { shippingOperationalCostSchema } from "./operational-cost-schema";
import { shippingBenefitPolicySchema, shippingBenefitSchema } from "./benefit-policy";

export const shippingServiceIdsSchema = z.array(z.number().int().positive()).max(50);
const citySchema = z.string().trim().min(2).max(100);
const stateSchema = z.enum(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);
export const postingLocationSchema = z.object({
  city: citySchema, state: stateSchema, pointName: z.string().trim().max(160).optional(),
});
export const postingPlanSchema = postingLocationSchema.extend({ requiresTravel: z.boolean() });
export const shippingSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  environment: z.enum(["production", "sandbox"]).default("production"),
  originPostalCode: z.string().regex(/^\d{8}$/),
  originCity: citySchema.default("Ivaté"),
  originState: stateSchema.default("PR"),
  postingLocations: z.array(postingLocationSchema.extend({ serviceId: z.number().int().positive() })).max(50).default([])
    .refine(locations => new Set(locations.map(location => location.serviceId)).size === locations.length, "Selecione um local por serviço."),
  preparationDays: z.number().int().min(0).max(15),
  serviceIds: shippingServiceIdsSchema,
  operationalCosts: z.array(shippingOperationalCostSchema).max(50).optional()
    .refine(entries => !entries || new Set(entries.map(entry => entry.serviceId)).size === entries.length, "Informe um custo por serviço."),
  contactEmail: z.string().email().max(160),
  freeShippingPolicy: shippingBenefitPolicySchema.optional(),
});
export const defaultShippingSettings = {
  enabled: false, environment: "production" as const, originPostalCode: "87525000",
  originCity: "Ivaté", originState: "PR" as const, postingLocations: [],
  preparationDays: 1, serviceIds: [], contactEmail: "",
};
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export const shippingProfileSchema = z.object({
  cargoKinds: shippingCargoKindsSchema.optional(),
  approvedServiceIds: shippingServiceIdsSchema.optional(),
  reference: shippingReferenceSchema.nullable().optional(),
  measurementBasis: z.enum(["measured", "estimated"]).default("measured"),
  enabled: z.boolean(),
  weightGrams: z.number().int().min(1).max(30000),
  widthCm: z.number().positive().max(200),
  heightCm: z.number().positive().max(200),
  lengthCm: z.number().positive().max(200),
  // An explicit review is required: dimensions alone do not prove carrier acceptance.
  transportReviewed: z.literal(true),
});
export const shippingItemsSchema = z.array(z.object({
  productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(MAX_ORDER_ITEM_QUANTITY),
  expectedUnitPriceCents: z.number().int().positive().max(1_000_000),
})).min(1).max(30).refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Produto repetido.");
export const quoteRequestSchema = z.object({ postalCode: z.string().regex(/^(?!0{8}$)\d{8}$/), items: shippingItemsSchema,
  discountCents: z.number().int().min(0).max(100_000_000).optional(),
});
export const shippingPackagingSchema = z.object({
  version: z.literal(1),
  calculationMethod: z.enum(["provider", "provider-conservative-envelope"]).default("provider"),
  inputMeasurementBasis: z.enum(["measured", "estimated"]),
  packages: z.array(z.object({
    weightGrams: z.number().int().positive().max(600000),
    widthCm: z.number().positive().max(1000), heightCm: z.number().positive().max(1000), lengthCm: z.number().positive().max(1000),
    insuranceValueCents: z.number().int().positive().max(20_000_000),
    items: z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
  })).min(1).max(20),
});
export type ShippingPackaging = z.infer<typeof shippingPackagingSchema>;
export const shippingOptionSchema = z.object({
  provider: z.literal("melhor-envio"), serviceId: z.number().int().positive(),
  carrier: z.string().min(1).max(100), service: z.string().min(1).max(100),
  priceCents: z.number().int().positive().max(10_000_000),
  deliveryDays: z.number().int().min(0).max(365),
  packaging: shippingPackagingSchema.optional(),
  benefit: shippingBenefitSchema.optional(),
});
export const shippingSelectionSchema = shippingOptionSchema.extend({ token: z.string().min(1).max(8000) });
export type ShippingOption = z.infer<typeof shippingOptionSchema>;
export type ShippingSelection = z.infer<typeof shippingSelectionSchema>;
export const shippingQuotePayloadSchema = shippingOptionSchema.extend({
  preparationDays: z.number().int().min(0).max(15).optional(),
  postalCode: z.string().regex(/^\d{8}$/), fingerprint: z.string().length(64),
  revision: z.number().int(), expiresAt: z.number().int(),
  postingLocation: postingPlanSchema.optional(),
  economicPriceCents: z.number().int().positive().max(10_000_000).optional(),
  discountCents: z.number().int().min(0).max(100_000_000).optional(),
});
export type ShippingQuotePayload = z.infer<typeof shippingQuotePayloadSchema>;

export class ShippingError extends Error {
  constructor(message: string, public status = 422) { super(message); this.name = "ShippingError"; }
}
