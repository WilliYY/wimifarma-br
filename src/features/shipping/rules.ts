import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { shippingOptionSchema, shippingProfileSchema, shippingQuotePayloadSchema, ShippingError, type ShippingOption, type ShippingQuotePayload } from "./schema";
import { requiresPharmacyShippingSupport } from "./eligibility";
import type { PrescriptionType } from "@/features/products/purchase-policy";

export function normalizeQuotes(raw: unknown, allowed: number[], preparationDays: number): ShippingOption[] {
  const entries = Array.isArray(raw) ? raw : [raw];
  let technicalFailure = false;
  let temporaryFailure = false;
  const quotes = new Map<number, ShippingOption>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !Number.isSafeInteger(entry.id) || entry.id <= 0) {
      technicalFailure = true;
      console.warn("[melhor-envio] quote-service-failed", { reason: "invalid-response" });
      continue;
    }
    if (!allowed.includes(entry.id)) continue;
    if (entry.error) {
      const message = typeof entry.error === "string" ? entry.error.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
      const reason = /^(cep nao atendido|transportadora nao atende este trecho)[.!]?$/.test(message) ? "no-coverage"
        : /^servico indisponivel no momento[.!]?$/.test(message) ? "temporarily-unavailable" : "unknown-error";
      if (reason === "no-coverage") continue;
      temporaryFailure ||= reason === "temporarily-unavailable";
      technicalFailure ||= reason === "unknown-error";
      console.warn("[melhor-envio] quote-service-failed", { serviceId: entry.id, reason });
      continue;
    }
    const price = entry.custom_price ?? entry.price;
    const days = entry.custom_delivery_time ?? entry.delivery_time;
    const parsed = shippingOptionSchema.safeParse({
      provider: "melhor-envio", serviceId: entry.id, carrier: entry.company?.name,
      service: entry.name, priceCents: typeof price === "string" || typeof price === "number" ? Math.round(Number(price) * 100) : NaN,
      deliveryDays: typeof days === "number" && Number.isInteger(days) && days >= 0 ? days + preparationDays : NaN,
    });
    if (parsed.success) quotes.set(parsed.data.serviceId, parsed.data);
    else {
      technicalFailure = true;
      console.warn("[melhor-envio] quote-service-failed", { serviceId: entry.id, reason: "invalid-quote" });
    }
  }
  if (!quotes.size && technicalFailure) throw new ShippingError("O Melhor Envio retornou uma falha na consulta às transportadoras. Tente novamente em instantes.", 502);
  if (!quotes.size && temporaryFailure) throw new ShippingError("As transportadoras estão temporariamente indisponíveis. Aguarde um momento e consulte o frete novamente, ou escolha retirada.", 503);
  return [...quotes.values()].sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays);
}

export type ShippingProduct = {
  id: string; name: string; category: string | null; requiresPrescription: boolean; isPopularPharmacy: boolean;
  prescriptionType?: PrescriptionType;
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
