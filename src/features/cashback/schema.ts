import { z } from "zod";

export const cashbackTransactionCreateSchema = z.object({
  amount: z.coerce.number().positive(),
  customerId: z.string().min(1),
  description: z.string().min(3).max(240),
  reference: z.string().max(120).optional(),
  type: z.enum(["CREDIT", "DEBIT", "EXPIRE", "ADJUSTMENT"]),
});
