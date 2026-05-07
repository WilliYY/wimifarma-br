import { z } from "zod";

export const whatsappContactCreateSchema = z.object({
  message: z.string().max(800).optional(),
  name: z.string().max(160).optional(),
  phone: z.string().min(10).max(20),
  source: z.string().min(2).max(80).default("site"),
});
