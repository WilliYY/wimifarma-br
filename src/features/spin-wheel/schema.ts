import { z } from "zod";

export const spinWheelCampaignCreateSchema = z.object({
  dailyLimitPerPhone: z.coerce.number().int().positive().default(1),
  description: z.string().max(600).optional(),
  isActive: z.boolean().default(false),
  maxAttemptsPerCustomer: z.coerce.number().int().positive().default(1),
  name: z.string().min(3).max(160),
  slug: z.string().min(3).max(120),
});
