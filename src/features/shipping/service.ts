import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { prepareCheckoutOrder, type CheckoutRequest } from "@/features/orders/checkout";
import { readShippingIntegration, shippingAccessToken, SHIPPING_INTEGRATION_ID } from "./integration";
import { melhorEnvioRequest } from "./provider";
import { shippingFingerprint, signShippingQuote, validateShippingProduct, verifyShippingQuote } from "./rules";
import { calculatePackedQuotes } from "./calculate-packed-quotes";
import { ShippingError, shippingSettingsSchema, type ShippingSelection } from "./schema";
import { permittedShippingServices } from "./eligibility";
import { resolvePostingLocation } from "./posting";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
import { cartShippingBenefit } from "./benefit-service";

export const shippingProductSelect = { ...supplierOfferInclude, ean: true, inventorySource: true, id: true, name: true, slug: true, imageUrl: true, category: true, catalogClassification: true, price: true, promotionalPrice: true, status: true, stock: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, shippingProfile: true, updatedAt: true, cashbackEnabled: true, cashbackRateBps: true, wimicoinsEnabled: true, wimicoinsRateBps: true } satisfies Prisma.ProductSelect;
function signingKey() { const key = process.env.AUTH_SECRET; if (!key) throw new ShippingError("O frete está temporariamente indisponível.", 503); return key; }

export async function quoteCart(postalCode: string, items: CheckoutRequest["items"], discountCents = 0): Promise<ShippingSelection[]> {
  const integration = await readShippingIntegration();
  const { settings } = integration;
  if (!settings.enabled || settings.environment !== "production" || !settings.serviceIds.length) throw new ShippingError("O envio para outras cidades ainda está em preparação. Consulte a farmácia ou escolha retirada.", 503);
  const products = await getPrisma().product.findMany({ where: { id: { in: items.map((i) => i.productId) } }, select: shippingProductSelect });
  const prepared = prepareCheckoutOrder(products.map(p => toSaleProduct(p)), items);
  if (!prepared.ok) throw new ShippingError(prepared.message, 409);
  if (!Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > prepared.subtotalCents) throw new ShippingError("Confira os descontos antes de consultar o frete.");
  // A pending profile is not a failure of destination coverage or carrier acceptance.
  const profiles = new Map(products.map(product => [product.id, validateShippingProduct(product)]));
  const serviceIds = permittedShippingServices(settings.serviceIds, products);
  if (!serviceIds.length) throw new ShippingError("Este carrinho precisa de um serviço de transporte autorizado para todos os produtos. Consulte a farmácia.", 422);
  // Bound provider packing work, without allocating or pricing one parcel per unit.
  if (items.reduce((sum, item) => sum + item.quantity, 0) > 20) throw new ShippingError("Este pedido precisa de uma embalagem consolidada. Consulte a farmácia para calcular o frete.");
  let estimated = false;
  const packingProducts = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const profile = profiles.get(product.id)!;
    estimated ||= profile.measurementBasis === "estimated";
    // Existing profiles include protection/box. Do not subtract tare or shrink them to retail dimensions.
    return { id: product.id, width: profile.widthCm, height: profile.heightCm, length: profile.lengthCm, weight: profile.weightGrams / 1000, insurance_value: item.expectedUnitPriceCents / 100, quantity: item.quantity };
  });
  const accessToken = await shippingAccessToken();
  const fingerprint = shippingFingerprint(items, products);
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const preparationDays = products.some(p => p.inventorySource === "DISTRIBUTOR") ? Math.max(settings.preparationDays, getSupplierPreparationEstimate(new Date()).preparationDays) : settings.preparationDays;
  const options = await calculatePackedQuotes({ products: packingProducts, inputMeasurementBasis: estimated ? "estimated" : "measured" }, serviceIds, preparationDays, (products, ids) => melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", accessToken, {
    from: { postal_code: settings.originPostalCode }, to: { postal_code: postalCode }, products,
    services: ids.join(","), options: { receipt: false, own_hand: false },
  }));
  const economicPriceCents = Math.min(...options.map(option => option.priceCents));
  return options.map((option) => {
    const benefit = cartShippingBenefit({ settings, products, items: prepared.items, subtotalCents: prepared.subtotalCents, discountCents, quote: option, economicPriceCents });
    const result = { ...option, benefit };
    return { ...result, token: signShippingQuote({ ...result, economicPriceCents, discountCents, preparationDays, postalCode, fingerprint, expiresAt, revision: integration.revision }, signingKey()) };
  });
}

export async function validateOrderShipping(tx: Prisma.TransactionClient, input: CheckoutRequest) {
  if (!input.shippingToken) return null;
  if (input.fulfillmentMethod !== "DELIVERY" || !input.address || !["PIX", "ONLINE"].includes(input.paymentMethod)) throw new ShippingError("Envio por transportadora requer endereço e pagamento por Pix ou pelo Mercado Pago.");
  const payload = verifyShippingQuote(input.shippingToken, signingKey());
  const integration = await tx.shippingIntegration.findUnique({ where: { id: SHIPPING_INTEGRATION_ID } });
  const settings = integration ? shippingSettingsSchema.parse(integration.settings) : null;
  if (!settings?.enabled || settings.environment !== "production" || integration?.revision !== payload.revision || !settings.serviceIds.includes(payload.serviceId)) throw new ShippingError("As opções de entrega mudaram. Calcule o frete novamente.", 409);
  const products = await tx.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } }, select: shippingProductSelect });
  products.forEach(validateShippingProduct);
  if (!permittedShippingServices(settings.serviceIds, products).includes(payload.serviceId)) throw new ShippingError("O serviço de transporte não aceita os itens deste carrinho. Calcule o frete novamente.", 409);
  if (payload.postalCode !== input.address.postalCode || payload.fingerprint !== shippingFingerprint(input.items, products)) throw new ShippingError("O carrinho ou o CEP mudou. Calcule o frete novamente.", 409);
  const discountCents = input.cashbackRedeemCents + (input.wimicoinsRedeemPoints ?? 0) + (input.storeCreditRedeemCents ?? 0);
  if (!payload.benefit || !payload.economicPriceCents || payload.discountCents !== discountCents) throw new ShippingError("Os descontos ou as condições do frete mudaram. Calcule o frete novamente.", 409);
  const prepared = prepareCheckoutOrder(products.map(product => toSaleProduct(product)), input.items);
  if (!prepared.ok || discountCents > prepared.subtotalCents) throw new ShippingError("O carrinho mudou. Calcule o frete novamente.", 409);
  const benefit = cartShippingBenefit({ settings, products, items: prepared.items, subtotalCents: prepared.subtotalCents, discountCents, quote: payload, economicPriceCents: payload.economicPriceCents });
  if (benefit.customerPriceCents !== payload.benefit.customerPriceCents) throw new ShippingError("As condições do frete mudaram. Calcule novamente para confirmar o valor.", 409);
  const preparationDays = products.some(p => p.inventorySource === "DISTRIBUTOR") ? Math.max(settings.preparationDays, getSupplierPreparationEstimate(new Date()).preparationDays) : settings.preparationDays;
  if ((payload.preparationDays ?? (products.some(p => p.inventorySource === "DISTRIBUTOR") ? -1 : settings.preparationDays)) < preparationDays) throw new ShippingError("O prazo de preparação mudou. Calcule o frete novamente.", 409);
  // Resolve at checkout from server settings; never accept a client-supplied posting plan.
  // Keep it in the order snapshot so future routing edits cannot rewrite old orders.
  const quote = { ...payload, benefit };
  delete quote.postingLocation;
  const postingLocation = resolvePostingLocation(settings, payload.serviceId);
  if (postingLocation) quote.postingLocation = postingLocation;
  return quote;
}
