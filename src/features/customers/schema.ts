import { z } from "zod";

export const customerCreateSchema = z.object({
  address: z.string().max(240).optional(),
  city: z.string().max(80).default("Ivate"),
  email: z.string().email().optional(),
  name: z.string().min(2).max(160),
  neighborhood: z.string().max(120).optional(),
  notes: z.string().max(800).optional(),
  phone: z.string().min(10).max(20),
});
