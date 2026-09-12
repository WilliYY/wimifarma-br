import { z } from "zod";
import { cashbackRateSchema } from "./rules";

const savedProductSchema = z.object({
  id: z.string(), cashbackEnabled: z.boolean(), cashbackRateBps: cashbackRateSchema, updatedAt: z.iso.datetime(),
});
export const cashbackSavedSchema = z.object({ data: savedProductSchema });
export const cashbackListingSchema = z.object({
  data: z.array(savedProductSchema.extend({
    name: z.string(), brand: z.string().nullable(), imageUrl: z.string().nullable(), status: z.string(),
    price: z.string(), promotionalPrice: z.string().nullable(),
    isPopularPharmacy: z.boolean(), requiresPrescription: z.boolean(),
  })),
  total: z.number().int().nonnegative(), pages: z.number().int().positive(),
  active: z.number().int().nonnegative(), pendingCents: z.number().int().nonnegative(),
});
export type CashbackListing = z.infer<typeof cashbackListingSchema>;
export type CashbackListProduct = CashbackListing["data"][number];

export async function readCashbackResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (response.redirected || response.status === 401) throw new Error("Sua sessao expirou. Entre novamente para continuar.");
  if (response.status === 429) throw new Error("Muitas solicitacoes. Aguarde um pouco e tente novamente.");
  if (response.status >= 500) throw new Error("Cashback temporariamente indisponivel. Atualize a lista e tente novamente.");
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ error: z.string().max(300) }).safeParse(payload);
    throw new Error(error.success ? error.data.error : "Nao foi possivel salvar o cashback. Atualize a lista e tente novamente.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new Error("Nao foi possivel confirmar a resposta do servidor. Atualize a lista antes de tentar novamente.");
  return parsed.data;
}
