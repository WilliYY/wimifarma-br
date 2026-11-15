import type { z } from "zod";
import { isNotifyOnlyPendingLogistics } from "@/features/products/notify-only";
import { requiresPrescriptionReview } from "@/features/products/purchase-policy";
import type { ShippingCargo } from "./cargo-policy";
import { hasPerfumeShippingCargo, requiresPharmacyShippingSupport } from "./eligibility";
import { quoteFrenetLabel } from "./frenet-label-quote";
import type { PackingRequest } from "./packing";
import type { ShippingProduct } from "./rules";
import {
  AUTOMATIC_QUOTE_MAX_UNITS, frenetAcceptanceSchema, frenetServiceCodeSchema, shippingOptionSchema,
  shippingPackagingSchema, shippingProfileSchema, type ShippingOption, type ShippingSettings,
} from "./schema";

export type FrenetServiceCode = z.infer<typeof frenetServiceCodeSchema>;
type FrenetCheckoutConfig = { token: string; partnerToken: string };
type FrenetCheckoutProduct = Pick<ShippingProduct, "name" | "category" | "requiresPrescription" |
  "prescriptionType" | "isPopularPharmacy" | "catalogClassification" | "shippingProfile">;

const credentialsPattern = /^[!-~]{1,1024}$/;
const supportedCargos: ReadonlySet<ShippingCargo> = new Set(["general", "industrialized_food", "liquid", "medication"]);
const reviewedProfileSchema = shippingProfileSchema.omit({ approvedServiceIds: true });
const normalize = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function getFrenetCheckoutConfig(env: Readonly<Record<string, string | undefined>> = process.env): FrenetCheckoutConfig | null {
  if (env.FRENET_CHECKOUT_ENABLED !== "true") return null;
  const token = env.FRENET_API_TOKEN?.trim();
  const partnerToken = env.FRENET_PARTNER_TOKEN?.trim();
  return token && partnerToken && credentialsPattern.test(token) && credentialsPattern.test(partnerToken)
    ? { token, partnerToken }
    : null;
}

export function frenetCheckoutOriginAllowed(settings: ShippingSettings) {
  return settings.enabled && settings.environment === "production" && settings.originPostalCode === "87525000"
    && normalize(settings.originCity) === "ivate" && settings.originState === "PR";
}

export function frenetCheckoutServices(settings: ShippingSettings, products: FrenetCheckoutProduct[]): FrenetServiceCode[] {
  if (!frenetCheckoutOriginAllowed(settings) || !products.length) return [];

  let services: FrenetServiceCode[] = ["03298", "03220"];
  for (const product of products) {
    const raw = product.shippingProfile;
    const profile = reviewedProfileSchema.safeParse(raw);
    const acceptance = frenetAcceptanceSchema.safeParse(raw && typeof raw === "object" && "frenetAcceptance" in raw
      ? raw.frenetAcceptance : undefined);
    const cargos = profile.success ? profile.data.cargoKinds : undefined;
    if (!profile.success || !profile.data.enabled || !acceptance.success || !cargos?.length
      || cargos.some(cargo => !supportedCargos.has(cargo)) || isNotifyOnlyPendingLogistics(raw)
      || requiresPharmacyShippingSupport(product) || requiresPrescriptionReview(product)) return [];

    const name = normalize(product.name);
    const hazardousName = name.replace(/\b(?:sem|zero)\s+alcool\b/g, "");
    if (hasPerfumeShippingCargo(name) || /\b(?:perfumes|aero(?:ss|s)ol\w*|pressuriz\w*|inflam\w*|pilhas?|baterias?|recarregave\w*|alcool|etanol|solvent\w*|acetona|refrigerad\w*|termolabe\w*|congelad\w*)\b/.test(hazardousName)) return [];
    const liquid = /\b\d+(?:[.,]\d+)?\s*(?:ml|l)\b/.test(name)
      || (/\b(?:liquid[oa]s?|shampoos?|xampus?|locao|solucao|suspensao|xaropes?|gotas|oleos?|fluidos?)\b/.test(name)
        && !/\b(?:em barra|solid[oa]|em po)\b/.test(name));
    if (liquid && !cargos.includes("liquid")) return [];
    const classification = product.catalogClassification;
    const medicine = classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE";
    if ((medicine || /medicament|farmaci/.test(normalize(product.category)) || /\b(?:medicamentos?|farmacos?)\b/.test(name))
      && !cargos.includes("medication")) return [];

    services = services.filter(code => acceptance.data.serviceCodes.includes(code));
    if (!services.length) return [];
  }
  return services;
}

export function frenetPostingLocation() {
  return { city: "Ivaté", state: "PR" as const, pointName: "AC Ivaté", requiresTravel: false };
}

export async function quoteFrenetCheckout(
  config: FrenetCheckoutConfig,
  postalCode: string,
  packing: PackingRequest,
  allowed: readonly FrenetServiceCode[],
  preparationDays: number,
  request = fetch,
): Promise<ShippingOption[]> {
  if (!allowed.length || !packing.products.length
    || packing.products.reduce((sum, product) => sum + product.quantity, 0) > AUTOMATIC_QUOTE_MAX_UNITS) return [];

  // Stack the already protected units in a single carton. Use the Frenet box minimums without reducing any unit.
  const parcel = {
    weightGrams: packing.products.reduce((sum, product) => sum + Math.round(product.weight * 1000) * product.quantity, 0),
    lengthCm: Math.max(16, ...packing.products.map(product => Math.ceil(product.length))),
    widthCm: Math.max(11, ...packing.products.map(product => Math.ceil(product.width))),
    heightCm: Math.max(2, Math.ceil(packing.products.reduce((sum, product) => sum + product.height * product.quantity, 0))),
  };
  const invoiceValueCents = packing.products.reduce((sum, product) => sum + Math.round(product.insurance_value * 100) * product.quantity, 0);
  if (parcel.weightGrams <= 0 || parcel.weightGrams > 30_000 || Math.max(parcel.widthCm, parcel.heightCm, parcel.lengthCm) > 100
    || parcel.widthCm + parcel.heightCm + parcel.lengthCm > 200
    || !Number.isSafeInteger(invoiceValueCents) || invoiceValueCents <= 0 || invoiceValueCents > 10_000_000) return [];

  const packaging = shippingPackagingSchema.safeParse({
    version: 1, calculationMethod: "provider-conservative-envelope", inputMeasurementBasis: packing.inputMeasurementBasis,
    packages: [{
      ...parcel, insuranceValueCents: 0,
      items: packing.products.map(product => ({ productId: product.id, quantity: product.quantity }))
        .sort((a, b) => a.productId.localeCompare(b.productId)),
    }],
  });
  if (!packaging.success) return [];

  const quotes = await quoteFrenetLabel({ ...config, destinationPostalCode: postalCode, invoiceValueCents, parcel }, { request, timeoutMs: 4000 });
  return quotes.flatMap(quote => {
    const code = frenetServiceCodeSchema.safeParse(quote.serviceId);
    if (!code.success || !allowed.includes(code.data)) return [];
    const option = shippingOptionSchema.safeParse({
      provider: "frenet", serviceId: Number(code.data), providerServiceCode: code.data,
      carrier: quote.carrier, service: quote.service, priceCents: quote.priceCents, deliveryDays: quote.deliveryDays + preparationDays,
      packaging: packaging.data,
    });
    return option.success ? [option.data] : [];
  });
}
