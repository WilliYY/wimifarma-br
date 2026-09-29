import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { prepareCheckoutOrder, type CheckoutRequest } from "@/features/orders/checkout";
import { readShippingIntegration, shippingAccessToken, SHIPPING_INTEGRATION_ID } from "./integration";
import { melhorEnvioRequest } from "./provider";
import { normalizeQuotes, shippingFingerprint, signShippingQuote, validateShippingProduct, verifyShippingQuote } from "./rules";
import { ShippingError, shippingSettingsSchema, type ShippingSelection } from "./schema";

export const shippingProductSelect = { id: true, name: true, slug: true, imageUrl: true, category: true, price: true, promotionalPrice: true, status: true, stock: true, requiresPrescription: true, isPopularPharmacy: true, shippingProfile: true, updatedAt: true } satisfies Prisma.ProductSelect;
function signingKey() { const key = process.env.AUTH_SECRET; if (!key) throw new ShippingError("O frete está temporariamente indisponível.", 503); return key; }

export async function quoteCart(postalCode: string, items: CheckoutRequest["items"]): Promise<ShippingSelection[]> {
  const integration = await readShippingIntegration();
  const { settings } = integration;
  if (!settings.enabled || settings.environment !== "production" || !settings.serviceIds.length) throw new ShippingError("O envio para outras cidades ainda está em preparação. Consulte a farmácia ou escolha retirada.", 503);
  const products = await getPrisma().product.findMany({ where: { id: { in: items.map((i) => i.productId) } }, select: shippingProductSelect });
  const prepared = prepareCheckoutOrder(products.map((p) => ({ ...p, price: p.price.toString(), promotionalPrice: p.promotionalPrice?.toString() ?? null })), items);
  if (!prepared.ok) throw new ShippingError(prepared.message, 409);
  const volumes = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const profile = validateShippingProduct(product);
    // Each unit is measured packed. This avoids inventing a carton packing algorithm.
    return Array.from({ length: item.quantity }, () => ({ width: profile.widthCm, height: profile.heightCm, length: profile.lengthCm, weight: profile.weightGrams / 1000, insurance: item.expectedUnitPriceCents / 100 }));
  }).flat();
  if (volumes.length > 20) throw new ShippingError("Para mais de 20 volumes, consulte a farmácia.");
  const raw = await melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", await shippingAccessToken(), {
    from: { postal_code: settings.originPostalCode }, to: { postal_code: postalCode }, volumes,
    services: settings.serviceIds.join(","), options: { receipt: false, own_hand: false },
  });
  const fingerprint = shippingFingerprint(items, products);
  const expiresAt = Date.now() + 15 * 60 * 1000;
  return normalizeQuotes(raw, settings.serviceIds, settings.preparationDays).map((option) => ({ ...option, token: signShippingQuote({ ...option, postalCode, fingerprint, expiresAt, revision: integration.revision }, signingKey()) }));
}

export async function validateOrderShipping(tx: Prisma.TransactionClient, input: CheckoutRequest) {
  if (!input.shippingToken) return null;
  if (input.fulfillmentMethod !== "DELIVERY" || !input.address || input.paymentMethod !== "PIX") throw new ShippingError("Envio por transportadora requer endereço e pagamento combinado por Pix.");
  const payload = verifyShippingQuote(input.shippingToken, signingKey());
  const integration = await tx.shippingIntegration.findUnique({ where: { id: SHIPPING_INTEGRATION_ID } });
  const settings = integration ? shippingSettingsSchema.parse(integration.settings) : null;
  if (!settings?.enabled || settings.environment !== "production" || integration?.revision !== payload.revision || !settings.serviceIds.includes(payload.serviceId)) throw new ShippingError("As opções de entrega mudaram. Calcule o frete novamente.", 409);
  const products = await tx.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } }, select: shippingProductSelect });
  products.forEach(validateShippingProduct);
  if (payload.postalCode !== input.address.postalCode || payload.fingerprint !== shippingFingerprint(input.items, products)) throw new ShippingError("O carrinho ou o CEP mudou. Calcule o frete novamente.", 409);
  return payload;
}
