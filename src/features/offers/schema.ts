import { z } from "zod";

export const offerCreateSchema = z.object({
  description: z.string().max(500).optional(),
  highlight: z.boolean().default(false),
  offerPrice: z.coerce.number().positive(),
  originalPrice: z.coerce.number().positive().optional(),
  slug: z.string().min(3).max(120),
  status: z
    .enum(["DRAFT", "ACTIVE", "SCHEDULED", "EXPIRED", "ARCHIVED"])
    .default("DRAFT"),
  title: z.string().min(3).max(160),
  whatsappText: z.string().max(300).optional(),
});
