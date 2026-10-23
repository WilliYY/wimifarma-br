import { z } from "zod";

export type PublicPaymentBrand = { id: string; name: string; image: string | null };

/** The footer lists brands; credit/debit method IDs remain distinct in the gateway catalogue. */
export function uniquePaymentBrandDisplay(brands: PublicPaymentBrand[]): PublicPaymentBrand[] {
  const seen = new Set<string>();
  return brands.filter(brand => {
    const name = brand.name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
    // Mercado Pago names Elo card types separately; the footer displays their shared brand.
    const identity = ["elo", "elo débito", "elo debito", "elo crédito", "elo credito", "elo prepaid", "elo pré-pago", "elo pre-pago"].includes(name) ? "elo" : name;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
type PaymentBrandsConnection = { accountId: string; revision: number; environment: string };
const paymentMethodsSchema = z.array(z.object({
  id: z.string().trim().min(1).max(60), name: z.string().trim().min(1).max(80),
  status: z.string(), payment_type_id: z.string(), secure_thumbnail: z.string().nullable().optional(),
}));

export function parsePaymentBrands(value: unknown): PublicPaymentBrand[] {
  const methods = paymentMethodsSchema.parse(value);
  const seen = new Set<string>();
  return methods.flatMap(method => {
    if (method.status !== "active" || !["credit_card", "debit_card", "prepaid_card"].includes(method.payment_type_id) || seen.has(method.id)) return [];
    seen.add(method.id);
    let image: string | null = null;
    try {
      const url = new URL(method.secure_thumbnail ?? "");
      if (["https://http2.mlstatic.com", "https://www.mercadopago.com"].includes(url.origin) && !url.username && !url.password) image = url.toString();
    } catch { /* Brand name remains usable without an image. */ }
    return [{ id: method.id, name: method.name, image }];
  });
}

export function createPaymentBrandsCache(now: () => number = Date.now) {
  type Entry = { brands: PublicPaymentBrand[]; expiresAt: number; retryAt: number; pending: Promise<PublicPaymentBrand[]> | null };
  const entries = new Map<string, Entry>();
  return (connection: PaymentBrandsConnection, fetchMethods: () => Promise<unknown>): Promise<PublicPaymentBrand[]> => {
    const timestamp = now();
    for (const [cachedKey, cached] of entries) {
      if (!cached.pending && cached.expiresAt <= timestamp && cached.retryAt <= timestamp) entries.delete(cachedKey);
    }
    const key = JSON.stringify([connection.accountId, connection.revision, connection.environment]);
    const entry: Entry = entries.get(key) ?? { brands: [], expiresAt: 0, retryAt: 0, pending: null };
    entries.set(key, entry);
    if (entry.pending) return entry.pending;
    if (entry.expiresAt > timestamp) return Promise.resolve(entry.brands);
    if (entry.retryAt > timestamp) return Promise.resolve([]);
    entry.pending = (async () => {
      try {
        const brands = parsePaymentBrands(await Promise.resolve().then(fetchMethods));
        // Each key keeps its entry while pending, including when another connection is read.
        entry.brands = brands;
        entry.expiresAt = now() + 30 * 60_000;
        entry.retryAt = 0;
        return brands;
      } catch (error) {
        entry.brands = [];
        entry.expiresAt = 0;
        entry.retryAt = now() + 60_000;
        throw error;
      } finally { entry.pending = null; }
    })();
    return entry.pending;
  };
}
