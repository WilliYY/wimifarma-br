import { z } from "zod";

export const productCreateSchema = z.object({
  brand: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  description: z.string().max(800).optional(),
  isPopularPharmacy: z.boolean().default(false),
  name: z.string().min(3).max(160),
  price: z.coerce.number().positive(),
  promotionalPrice: z.coerce.number().positive().optional(),
  requiresPrescription: z.boolean().default(false),
  slug: z.string().min(3).max(120),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  stock: z.coerce.number().int().min(0).default(0),
});
