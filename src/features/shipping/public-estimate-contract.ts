import { z } from "zod";
import { AUTOMATIC_QUOTE_MAX_UNITS, shippingOptionSchema } from "./schema";

export const publicShippingEstimateRequestSchema = z.object({
  productId: z.string().min(1).max(64),
  postalCode: z.string().regex(/^(?!0{8}$)\d{8}$/),
  quantity: z.number().int().min(1).max(AUTOMATIC_QUOTE_MAX_UNITS),
}).strict();

// Estimates never carry a checkout authorization or private packing/product data.
export const publicShippingEstimateSchema = z.object({
  mode: z.enum(["estimate", "available", "local"]),
  options: shippingOptionSchema.omit({ packaging: true }).strict().array(),
}).strict();
export type PublicShippingEstimateRequest = z.infer<typeof publicShippingEstimateRequestSchema>;
export type PublicShippingEstimate = z.infer<typeof publicShippingEstimateSchema>;
