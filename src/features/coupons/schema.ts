import { z } from "zod";

export const couponCreateSchema = z.object({
  code: z.string().min(3).max(40).toUpperCase(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  maxUses: z.coerce.number().int().positive().optional(),
  minOrderValue: z.coerce.number().positive().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_DELIVERY"]),
  value: z.coerce.number().min(0),
});
