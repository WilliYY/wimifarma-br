import { isNotifyOnlyPendingLogistics } from "@/features/products/notify-only";
import { z } from "zod";
import { shippingReferenceSchema } from "./product-reference";
import { shippingCargoKindsSchema } from "./cargo-policy";
import { shippingProfileSchema, shippingServiceIdsSchema } from "./schema";

// Catalog saves only an unapproved draft. Only the existing freight workflow may approve it.
export const shippingDraftSchema = z.object({
  notifyOnlyPendingLogistics: z.literal(true).optional(),
  cargoKinds: shippingCargoKindsSchema.optional(),
  approvedServiceIds: shippingServiceIdsSchema.optional(),
  enabled: z.literal(false), transportReviewed: z.literal(false),
  measurementBasis: z.enum(["measured", "estimated", "unknown"]).default("measured"),
  weightGrams: z.number().int().min(1).max(30000).nullable(),
  widthCm: z.number().positive().max(200).nullable(),
  heightCm: z.number().positive().max(200).nullable(),
  lengthCm: z.number().positive().max(200).nullable(),
  reference: shippingReferenceSchema.nullable().default(null),
});
export type ShippingDraft = z.infer<typeof shippingDraftSchema>;

// Freight admin may keep partial drafts or explicitly approve a complete profile.
export const shippingAdminProfileSchema = shippingProfileSchema.extend({ notifyOnlyPendingLogistics: z.literal(true).optional() }).or(shippingDraftSchema);

export function invalidateShippingProfile(value: unknown): ShippingDraft | undefined {
  const parsed = shippingAdminProfileSchema.safeParse(value);
  if (!parsed.success) return isNotifyOnlyPendingLogistics(value) ? { notifyOnlyPendingLogistics: true, measurementBasis: "unknown", enabled: false, transportReviewed: false, weightGrams: null, widthCm: null, heightCm: null, lengthCm: null, reference: null } : undefined;
  return { ...parsed.data, enabled: false, transportReviewed: false, reference: null };
}
