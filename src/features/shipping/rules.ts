import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { shippingOptionSchema, shippingProfileSchema, shippingQuotePayloadSchema, ShippingError, type ShippingOption, type ShippingQuotePayload } from "./schema";
import { requiresPharmacyShippingSupport } from "./eligibility";

export function normalizeQuotes(raw: unknown, allowed: number[], preparationDays: number): ShippingOption[] {
  if (!Array.isArray(raw)) throw new ShippingError("O Melhor Envio retornou uma resposta inválida. Tente novamente.", 502);
  const quotes = new Map<number, ShippingOption>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || entry.error) continue;
    const price = entry.custom_price ?? entry.price;
    const days = entry.custom_delivery_time ?? entry.delivery_time;
    if (typeof price !== "string" && typeof price !== "number") continue;
    if (typeof days !== "number" || !Number.isInteger(days) || days < 0) continue;
    const parsed = shippingOptionSchema.safeParse({
      provider: "melhor-envio", serviceId: entry.id, carrier: entry.company?.name,
      service: entry.name, priceCents: Math.round(Number(price) * 100), deliveryDays: days + preparationDays,
    });
    if (parsed.success && allowed.includes(parsed.data.serviceId)) quotes.set(parsed.data.serviceId, parsed.data);
  }
  return [...quotes.values()].sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays);
}

export type ShippingProduct = {
  id: string; name: string; category: string | null; requiresPrescription: boolean; isPopularPharmacy: boolean;
  shippingProfile: unknown; updatedAt: Date;
};
export function validateShippingProduct(product: ShippingProduct) {
  if (requiresPharmacyShippingSupport(product)) {
    throw new ShippingError(`${product.name}: o envio precisa de atendimento da farmácia.`);
  }
  const parsed = shippingProfileSchema.safeParse(product.shippingProfile);
  if (!parsed.success || !parsed.data.enabled) throw new ShippingError(`${product.name}: o envio por transportadora ainda não foi liberado. Consulte a equipe ou escolha retirada.`);
  return parsed.data;
}
export function shippingFingerprint(items: { productId: string; quantity: number; expectedUnitPriceCents: number }[], products: ShippingProduct[]) {
  const indexed = new Map(products.map((p) => [p.id, p]));
  return createHash("sha256").update(JSON.stringify([...items].sort((a, b) => a.productId.localeCompare(b.productId)).map((item) => ({
    ...item, updatedAt: indexed.get(item.productId)?.updatedAt.toISOString(), profile: indexed.get(item.productId)?.shippingProfile,
  })))).digest("hex");
}
export function signShippingQuote(payload: ShippingQuotePayload, key: string) {
  if (key.length < 16) throw new Error("Shipping signing key unavailable");
  const body = Buffer.from(JSON.stringify(shippingQuotePayloadSchema.parse(payload))).toString("base64url");
  return `${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
}
export function verifyShippingQuote(token: string, key: string, now = Date.now()) {
  try {
    if (token.length > 8000 || key.length < 16) throw new Error();
    const parts = token.split(".");
    if (parts.length !== 2) throw new Error();
    const signature = Buffer.from(parts[1], "base64url");
    const expected = createHmac("sha256", key).update(parts[0]).digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error();
    const parsed = shippingQuotePayloadSchema.parse(JSON.parse(Buffer.from(parts[0], "base64url").toString()));
    if (parsed.expiresAt <= now || parsed.expiresAt > now + 16 * 60 * 1000) throw new Error();
    return parsed;
  } catch { throw new ShippingError("A cotação expirou ou mudou. Calcule o frete novamente.", 409); }
}
