import { getPrisma } from "@/lib/prisma";
import { toSaleProduct } from "@/features/supplier-catalog/commerce";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
import { requiresPrescriptionReview } from "@/features/products/purchase-policy";
import { isNotifyOnlyPendingLogistics } from "@/features/products/notify-only";
import { readShippingIntegration, shippingAccessToken } from "./integration";
import { melhorEnvioRequest } from "./provider";
import { shippingProductSelect } from "./service";
import { shippingProfileSchema, ShippingError } from "./schema";
import { shippingAdminProfileSchema } from "./product-draft";
import { hasPerfumeShippingCargo, permittedShippingServices, requiresPharmacyShippingSupport } from "./eligibility";
import { assessCarrierCargo, isKnownShippingService, type ShippingCargo } from "./cargo-policy";
import { calculatePackedQuotes } from "./calculate-packed-quotes";
import { cartShippingBenefit } from "./benefit-service";
import { resolveAttainableShippingGoals } from "./attainable-goal";
import { localDeliveryCity } from "./delivery-policy";
import { publicShippingEstimateRequestSchema, publicShippingEstimateSchema, type PublicShippingEstimateRequest } from "./public-estimate-contract";

const physicalProfileSchema = shippingProfileSchema.pick({ weightGrams: true, widthCm: true, heightCm: true, lengthCm: true });
const normalized = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** A price simulation is never proof of carrier acceptance or checkout eligibility. */
export async function estimateProductShipping(input: PublicShippingEstimateRequest) {
  const request = publicShippingEstimateRequestSchema.parse(input);
  const product = await getPrisma().product.findUnique({ where: { id: request.productId, status: "ACTIVE", deletedAt: null }, select: { ...shippingProductSelect, deletedAt: true } });
  if (!product || product.status !== "ACTIVE" || product.deletedAt) throw new ShippingError("Produto indisponível para consulta de frete.", 404);
  const sale = toSaleProduct(product);
  if (!sale.availableForPurchase || sale.stock < request.quantity) throw new ShippingError("Produto indisponível no momento. Avise-me quando chegar.", 409);
  if (requiresPharmacyShippingSupport(product)) throw new ShippingError("O envio deste produto precisa de atendimento da farmácia.");
  if (localDeliveryCity(request.postalCode)) return publicShippingEstimateSchema.parse({ mode: "local", options: [] });
  const { settings } = await readShippingIntegration();
  if (!settings.enabled || settings.environment !== "production" || !settings.serviceIds.length) throw new ShippingError("O envio para outras cidades ainda está em preparação. Consulte a farmácia ou escolha retirada.", 503);
  const parsed = shippingAdminProfileSchema.safeParse(product.shippingProfile);
  const physical = physicalProfileSchema.safeParse(product.shippingProfile);
  if (!parsed.success || !physical.success) throw new ShippingError("Peso ou medidas pendentes. Consulte a farmácia para preparar o envio.");
  const profile = parsed.data;
  const cargos: ShippingCargo[] = [...(profile.cargoKinds?.length ? profile.cargoKinds : ["unspecified" as const])];
  const classification = product.catalogClassification;
  if ((classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE") || requiresPrescriptionReview(product) || /medicament|farmaci/.test(normalized(product.category))) cargos.push("medication");
  if (hasPerfumeShippingCargo(product.name)) cargos.push("perfume");
  if (/\b(aerossol|aerosol)\b/.test(normalized(product.name))) cargos.push("aerosol");
  const serviceIds = settings.serviceIds.filter(service => isKnownShippingService(service)
    && (!cargos.includes("medication") || service === 1 || service === 2)
    && (profile.approvedServiceIds === undefined || (!profile.transportReviewed && profile.approvedServiceIds.length === 0) || profile.approvedServiceIds.includes(service))
    && assessCarrierCargo(service, cargos).status !== "blocked");
  if (!serviceIds.length) throw new ShippingError("Este produto precisa de atendimento da farmácia para consultar o transporte.");
  const unitPriceCents = Math.round(Number(sale.promotionalPrice ?? sale.price) * 100);
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0 || unitPriceCents > 1_000_000) throw new ShippingError("Preço indisponível para consulta de frete.");
  const checkoutServices = permittedShippingServices(settings.serviceIds, [product]);
  const available = profile.enabled && profile.transportReviewed && !isNotifyOnlyPendingLogistics(product.shippingProfile)
    && sale.stock >= request.quantity && cargos.every(cargo => cargo !== "unspecified")
    && serviceIds.every(service => checkoutServices.includes(service));
  const preparationDays = product.inventorySource === "DISTRIBUTOR" ? Math.max(settings.preparationDays, getSupplierPreparationEstimate(new Date()).preparationDays) : settings.preparationDays;
  const token = await shippingAccessToken();
  const { weightGrams, widthCm, heightCm, lengthCm } = physical.data;
  const options = await calculatePackedQuotes({ inputMeasurementBasis: profile.measurementBasis === "measured" ? "measured" : "estimated", products: [{ id: product.id, quantity: request.quantity, insurance_value: unitPriceCents / 100, width: widthCm, height: heightCm, length: lengthCm, weight: weightGrams / 1000 }] }, serviceIds, preparationDays, (products, ids) => melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", token, {
    from: { postal_code: settings.originPostalCode }, to: { postal_code: request.postalCode }, products, services: ids.join(","), options: { receipt: false, own_hand: false },
  }));
  const economicPriceCents = Math.min(...options.map(option => option.priceCents));
  const items = [{ productId: product.id, quantity: request.quantity, unitPriceCents }];
  const benefitedOptions = available ? options.map(option => ({ ...option,
    benefit: cartShippingBenefit({ settings, products: [product], items, subtotalCents: unitPriceCents * request.quantity, discountCents: 0, quote: option, economicPriceCents }) })) : [];
  const goals = available ? await resolveAttainableShippingGoals({ settings, products: [product], items, subtotalCents: unitPriceCents * request.quantity, discountCents: 0, options: benefitedOptions,
    quoteTarget: (products, ids, timeoutMs) => melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", token, {
      from: { postal_code: settings.originPostalCode }, to: { postal_code: request.postalCode }, products,
      services: ids.join(","), options: { receipt: false, own_hand: false },
    }, { timeoutMs }),
  }) : undefined;
  return publicShippingEstimateSchema.parse({ mode: available ? "available" : "estimate", options: options.map((option, index) => ({
    provider: option.provider, serviceId: option.serviceId, carrier: option.carrier, service: option.service, priceCents: option.priceCents, deliveryDays: option.deliveryDays,
    ...(available ? { benefit: { ...benefitedOptions[index].benefit, ...goals?.get(option.serviceId) } } : {}),
  })) });
}
