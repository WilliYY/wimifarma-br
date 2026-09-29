import { z } from "zod";

export const shippingSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  environment: z.enum(["production", "sandbox"]).default("production"),
  originPostalCode: z.string().regex(/^\d{8}$/),
  preparationDays: z.number().int().min(0).max(15),
  serviceIds: z.array(z.number().int().positive()).max(50),
  contactEmail: z.string().email().max(160),
});
export const defaultShippingSettings = {
  enabled: false, environment: "production" as const, originPostalCode: "87525000",
  preparationDays: 1, serviceIds: [], contactEmail: "",
};
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export const shippingProfileSchema = z.object({
  enabled: z.boolean(),
  weightGrams: z.number().int().min(1).max(30000),
  widthCm: z.number().positive().max(200),
  heightCm: z.number().positive().max(200),
  lengthCm: z.number().positive().max(200),
  // An explicit review is required: dimensions alone do not prove carrier acceptance.
  transportReviewed: z.literal(true),
});
export const shippingItemsSchema = z.array(z.object({
  productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20),
  expectedUnitPriceCents: z.number().int().positive().max(1_000_000),
})).min(1).max(30).refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Produto repetido.");
export const quoteRequestSchema = z.object({ postalCode: z.string().regex(/^\d{8}$/), items: shippingItemsSchema });
export const shippingOptionSchema = z.object({
  provider: z.literal("melhor-envio"), serviceId: z.number().int().positive(),
  carrier: z.string().min(1).max(100), service: z.string().min(1).max(100),
  priceCents: z.number().int().positive().max(10_000_000),
  deliveryDays: z.number().int().min(0).max(365),
});
export const shippingSelectionSchema = shippingOptionSchema.extend({ token: z.string().min(1).max(8000) });
export type ShippingOption = z.infer<typeof shippingOptionSchema>;
export type ShippingSelection = z.infer<typeof shippingSelectionSchema>;
export const shippingQuotePayloadSchema = shippingOptionSchema.extend({
  postalCode: z.string().regex(/^\d{8}$/), fingerprint: z.string().length(64),
  revision: z.number().int(), expiresAt: z.number().int(),
});
export type ShippingQuotePayload = z.infer<typeof shippingQuotePayloadSchema>;

export class ShippingError extends Error {
  constructor(message: string, public status = 422) { super(message); this.name = "ShippingError"; }
}
