import { z } from "zod";
import { cashbackRateSchema } from "./rules";
import { BULK_PRODUCT_LIMIT, bulkProductUpdateSchema, type BulkProductUpdate } from "@/features/products/catalog-bulk";

export const CASHBACK_PAGE_SIZE = 100;

const savedProductSchema = z.object({
  id: z.string(), cashbackEnabled: z.boolean(), cashbackRateBps: cashbackRateSchema, updatedAt: z.iso.datetime(),
});
export const cashbackSavedSchema = z.object({ data: savedProductSchema });
export const cashbackListingSchema = z.object({
  data: z.array(savedProductSchema.extend({
    name: z.string(), brand: z.string().nullable(), imageUrl: z.string().nullable(), status: z.string(),
    price: z.string().nullable(), promotionalPrice: z.string().nullable(), priceAvailable: z.boolean().optional(),
    isPopularPharmacy: z.boolean(), requiresPrescription: z.boolean(),
  })),
  total: z.number().int().nonnegative(), pages: z.number().int().positive(),
  active: z.number().int().nonnegative(), pendingCents: z.number().int().nonnegative(),
});
export type CashbackListing = z.infer<typeof cashbackListingSchema>;
export type CashbackListProduct = CashbackListing["data"][number];

export function cashbackProductEligible(product: Pick<CashbackListProduct, "requiresPrescription" | "isPopularPharmacy">) {
  return !product.requiresPrescription && !product.isPopularPharmacy;
}

export function selectCashbackProducts(selected: readonly string[], visible: readonly CashbackListProduct[]) {
  const eligible = new Set(visible.filter(cashbackProductEligible).map(product => product.id));
  return [...new Set(selected)].filter(id => eligible.has(id)).slice(0, BULK_PRODUCT_LIMIT);
}

export function createCashbackBulkUpdate(products: readonly CashbackListProduct[], enabled: boolean, rateBps?: number): BulkProductUpdate {
  if (products.some(product => !cashbackProductEligible(product))) throw new Error("Selecione somente produtos elegiveis ao cashback.");
  return bulkProductUpdateSchema.parse({
    items: products.map(product => ({ id: product.id, expectedUpdatedAt: product.updatedAt })),
    changes: enabled ? { cashbackEnabled: true, cashbackRateBps: cashbackRateSchema.parse(rateBps) } : { cashbackEnabled: false },
  });
}

export async function confirmCashbackBulkResponse(response: Response, body: BulkProductUpdate) {
  const payload = await readCashbackResponse(response, z.object({
    data: z.array(z.object({ id: z.string(), updatedAt: z.iso.datetime() })), count: z.number().int(),
  }));
  const ids = new Set(payload.data.map(product => product.id));
  if (payload.count !== body.items.length || payload.data.length !== body.items.length || ids.size !== body.items.length || body.items.some(item => !ids.has(item.id))) {
    throw new Error("Nao foi possivel confirmar o lote. Atualize a lista antes de tentar novamente.");
  }
}

export class CashbackSessionError extends Error {
  constructor() {
    super("Sua sessao expirou ou nao possui mais acesso. Entre novamente para continuar.");
    this.name = "CashbackSessionError";
  }
}

export async function readCashbackResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (response.redirected || response.status === 401) throw new CashbackSessionError();
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
