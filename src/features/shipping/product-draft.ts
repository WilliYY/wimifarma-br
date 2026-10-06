import { z } from "zod";
import { shippingReferenceSchema } from "./product-reference";
import { shippingProfileSchema } from "./schema";

// Catalog saves only an unapproved draft. Only the existing freight workflow may approve it.
export const shippingDraftSchema = z.object({
  enabled: z.literal(false), transportReviewed: z.literal(false),
  measurementBasis: z.enum(["measured", "estimated"]).default("measured"),
  weightGrams: z.number().int().min(1).max(30000).nullable(),
  widthCm: z.number().positive().max(200).nullable(),
  heightCm: z.number().positive().max(200).nullable(),
  lengthCm: z.number().positive().max(200).nullable(),
  reference: shippingReferenceSchema.nullable().default(null),
});
export type ShippingDraft = z.infer<typeof shippingDraftSchema>;

// Freight admin may keep partial drafts or explicitly approve a complete profile.
export const shippingAdminProfileSchema = shippingProfileSchema.or(shippingDraftSchema);

export function invalidateShippingProfile(value: unknown): ShippingDraft | undefined {
  const parsed = shippingAdminProfileSchema.safeParse(value);
  if (!parsed.success) return undefined;
  return { ...parsed.data, enabled: false, transportReviewed: false, reference: null };
}
