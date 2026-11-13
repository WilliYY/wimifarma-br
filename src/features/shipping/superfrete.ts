import { z } from "zod";
import { hasPerfumeShippingCargo, requiresPharmacyShippingSupport } from "./eligibility";
import type { PackingRequest } from "./packing";
import { resolvePostingLocation } from "./posting";
import type { ShippingProduct } from "./rules";
import { shippingOptionSchema, shippingProfileSchema, ShippingError, type ShippingOption, type ShippingSettings } from "./schema";

const endpoint = "https://api.superfrete.com/api/v0/calculator";
const origin = "87525000";
const serviceLimits = {
  1: { name: "PAC", minWidth: 8, minLength: 13, maxInsuranceCents: 418484 },
  2: { name: "SEDEX", minWidth: 6, minLength: 11, maxInsuranceCents: 3557117 },
} as const;
type ServiceId = keyof typeof serviceLimits;
const serviceIds = [1, 2] as const;
const number = z.union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number)]).pipe(z.number().finite());
const parcelSchema = z.object({
  dimensions: z.object({ width: number, height: number, length: number }),
  weight: number,
  insurance_value: number,
});
const rateSchema = z.object({
  id: z.number(),
  has_error: z.literal(false),
  price: number,
  currency: z.literal("R$"),
  delivery_time: z.number().int().nonnegative(),
  delivery_range: z.object({ max: z.number().int().nonnegative() }).optional(),
  company: z.object({ id: z.literal(1) }),
  packages: z.tuple([parcelSchema]),
});

export function getSuperFreteConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const token = env.SUPERFRETE_API_TOKEN?.trim();
  return env.SUPERFRETE_ENABLED === "true" && token && /^[!-~]{1,8192}$/.test(token) ? { token } : null;
}

const normalized = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
type Product = Pick<ShippingProduct, "name" | "category" | "requiresPrescription" | "isPopularPharmacy" | "prescriptionType" | "catalogClassification" | "shippingProfile">;

export function superFreteServices(settings: ShippingSettings, allowed: readonly number[], products: Product[]): ServiceId[] {
  if (settings.originPostalCode !== origin || normalized(settings.originCity) !== "ivate" || settings.originState !== "PR") return [];
  if (!products.length || !products.every(product => {
    const profile = shippingProfileSchema.safeParse(product.shippingProfile);
    const classification = product.catalogClassification;
    return profile.success && profile.data.enabled && profile.data.cargoKinds?.length
      && profile.data.cargoKinds.every(cargo => cargo === "general" || cargo === "industrialized_food")
      && !product.requiresPrescription && !requiresPharmacyShippingSupport(product)
      && !(classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE")
      && !/medicament|farmaci/.test(normalized(product.category))
      && !hasPerfumeShippingCargo(product.name)
      && !/\b(aerossol|aerosol|pressurizad\w*|inflamav\w*|pilhas?|baterias?)\b/.test(normalized(product.name));
  })) return [];
  return serviceIds.filter(id => allowed.includes(id) && !resolvePostingLocation(settings, id)?.requiresTravel);
}

export function superFretePostingLocation() {
  return { city: "Ivaté", state: "PR" as const, pointName: "AC Ivaté", requiresTravel: false };
}

export function superFreteBenefit(priceCents: number) {
  return { status: "regular" as const, customerPriceCents: priceCents, subsidyCents: 0, minimumOrderCents: null, remainingCents: null };
}

/** Preserve valid quotes if one provider has a known service failure. */
export async function compareSuperFrete(primary: Promise<ShippingOption[]>, secondary: Promise<ShippingOption[]>) {
  const [melhor, superfrete] = await Promise.allSettled([primary, secondary]);
  if (superfrete.status === "rejected" && !(superfrete.reason instanceof ShippingError)) throw superfrete.reason;
  if (melhor.status === "rejected" && (!(melhor.reason instanceof ShippingError) || superfrete.status !== "fulfilled" || !superfrete.value.length)) {
    throw melhor.reason;
  }
  const melhorOptions = melhor.status === "fulfilled" ? melhor.value : [];
  const superFreteOptions = superfrete.status === "fulfilled" ? superfrete.value : [];
  if (!melhorOptions.length && superfrete.status === "rejected") throw superfrete.reason;
  return { melhorOptions, superFreteOptions };
}

export async function quoteSuperFrete(config: NonNullable<ReturnType<typeof getSuperFreteConfig>>, settings: ShippingSettings,
  destinationPostalCode: string, packing: PackingRequest, allowed: ServiceId[], preparationDays: number, request = fetch): Promise<ShippingOption[]> {
  if (!allowed.length) return [];
  // A single stack of the existing protected envelopes avoids speculative consolidation.
  const parcel = {
    weight: packing.products.reduce((sum, product) => sum + Math.round(product.weight * 1000) * product.quantity, 0) / 1000,
    width: Math.max(...allowed.map(id => serviceLimits[id].minWidth), ...packing.products.map(product => Math.ceil(product.width))),
    height: Math.max(1, Math.ceil(packing.products.reduce((sum, product) => sum + product.height * product.quantity, 0))),
    length: Math.max(...allowed.map(id => serviceLimits[id].minLength), ...packing.products.map(product => Math.ceil(product.length))),
  };
  if (parcel.weight <= 0 || parcel.weight > 30 || Math.max(parcel.width, parcel.height, parcel.length) > 100
    || parcel.width + parcel.height + parcel.length > 200) return [];
  const declaredCents = packing.products.reduce((sum, product) => sum + Math.round(product.insurance_value * 100) * product.quantity, 0);
  const insuranceCents = declaredCents >= 2563 ? declaredCents : 0;
  const services = allowed.filter(id => insuranceCents <= serviceLimits[id].maxInsuranceCents);
  if (!services.length) return [];
  let raw: unknown;
  try {
    const response = await request(endpoint, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json", "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`, "User-Agent": `Wimifarma/1.0 (${settings.contactEmail})` },
      body: JSON.stringify({ from: { postal_code: settings.originPostalCode }, to: { postal_code: destinationPostalCode },
        services: services.join(","), options: { own_hand: false, receipt: false, insurance_value: insuranceCents / 100,
          use_insurance_value: insuranceCents > 0 }, package: parcel }),
    });
    if (!response.ok) {
      console.warn("[superfrete] quote-failed", { status: response.status });
      throw new ShippingError("A cotação da SuperFrete está indisponível.", 503);
    }
    raw = await response.json();
  } catch (error) {
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("A cotação da SuperFrete está indisponível.", 503);
  }
  if (!Array.isArray(raw) || raw.length > 50) throw new ShippingError("A SuperFrete retornou uma cotação inválida.", 502);
  const quotes = new Map<number, ShippingOption>();
  let invalid = false;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || !services.includes(entry.id) || entry.has_error === true) continue;
    const rate = rateSchema.safeParse(entry);
    if (!rate.success) { invalid = true; continue; }
    const { id, price, delivery_time, delivery_range, packages: [quotedParcel] } = rate.data;
    if (Math.round(quotedParcel.weight * 1000) !== Math.round(parcel.weight * 1000)
      || quotedParcel.dimensions.width !== parcel.width || quotedParcel.dimensions.height !== parcel.height
      || quotedParcel.dimensions.length !== parcel.length || Math.round(quotedParcel.insurance_value * 100) !== insuranceCents) {
      invalid = true;
      continue;
    }
    const option = shippingOptionSchema.safeParse({
      provider: "superfrete", serviceId: id, carrier: "Correios", service: serviceLimits[id as ServiceId].name,
      priceCents: Math.round(price * 100), deliveryDays: Math.max(delivery_time, delivery_range?.max ?? 0) + preparationDays,
      packaging: { version: 1, inputMeasurementBasis: packing.inputMeasurementBasis, packages: [{
        widthCm: parcel.width, heightCm: parcel.height, lengthCm: parcel.length, weightGrams: Math.round(parcel.weight * 1000),
        insuranceValueCents: insuranceCents, items: packing.products.map(({ id: productId, quantity }) => ({ productId, quantity })),
      }] },
    });
    if (option.success) quotes.set(id, option.data);
    else invalid = true;
  }
  if (!quotes.size && invalid) throw new ShippingError("A SuperFrete retornou uma cotação inválida.", 502);
  return [...quotes.values()];
}
