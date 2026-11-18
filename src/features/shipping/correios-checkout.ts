import { CorreiosError, getCorreiosConfig, quoteCorreios } from "./correios";
import { hasPerfumeShippingCargo, requiresPharmacyShippingSupport } from "./eligibility";
import type { PackingRequest } from "./packing";
import type { ShippingProduct } from "./rules";
import { ShippingError, shippingOptionSchema, shippingProfileSchema, type ShippingOption, type ShippingSettings } from "./schema";

type Product = Pick<ShippingProduct, "name" | "category" | "requiresPrescription" | "prescriptionType" | "isPopularPharmacy" | "catalogClassification" | "shippingProfile">;
const normalized = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function getCorreiosCheckoutConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.CORREIOS_CHECKOUT_ENABLED === "true" ? getCorreiosConfig(env) : null;
}

export function correiosCheckoutOriginEligible(settings: ShippingSettings) {
  return settings.enabled && settings.environment === "production" && settings.originPostalCode === "87525000"
    && normalized(settings.originCity) === "ivate" && settings.originState === "PR";
}

export function correiosCheckoutServiceCodes(settings: ShippingSettings, products: Product[]) {
  return (["03298", "03220"] as const).filter(code => correiosCheckoutEligible(settings, products, code));
}

export function correiosCheckoutEligible(settings: ShippingSettings, products: Product[], serviceCode?: "03298" | "03220"): boolean {
  if (!serviceCode) return correiosCheckoutServiceCodes(settings, products).length > 0;
  return correiosCheckoutOriginEligible(settings) && products.length > 0
    && products.every(product => {
      const profile = shippingProfileSchema.safeParse(product.shippingProfile);
      const classification = product.catalogClassification;
      const name = normalized(product.name);
      if (profile.success && profile.data.approvedCorreiosServiceCodes !== undefined) {
        const nonAlcoholicName = name.replace(/\b(?:sem|zero|0%?)\s+(?:alcool\w*|etanol)\b/g, "");
        return profile.data.enabled && profile.data.approvedCorreiosServiceCodes.includes(serviceCode)
          && !!profile.data.cargoKinds?.length
          && profile.data.cargoKinds.every(cargo => ["general", "industrialized_food", "medication", "liquid", "perfume"].includes(cargo))
          && !requiresPharmacyShippingSupport(product)
          && !/\b(aerossol\w*|aerosol\w*|pressurizad\w*|inflamav\w*|alcool\w*|etanol|acetona|eter|formol|formaldeido|solvent\w*|removedor\w*|pilhas?|baterias?|eletric\w*|elec?tronic\w*|recarreg\w*|refriger\w*|pereciv\w*|congelad\w*|insulina\w*)\b/.test(nonAlcoholicName);
      }
      return profile.success && profile.data.enabled && !!profile.data.cargoKinds?.length
        && (profile.data.approvedServiceIds === undefined || profile.data.approvedServiceIds.length > 0)
        && profile.data.cargoKinds.every(cargo => cargo === "general" || cargo === "industrialized_food")
        && !product.requiresPrescription && !product.isPopularPharmacy && !requiresPharmacyShippingSupport(product)
        && (!product.prescriptionType || product.prescriptionType === "UNREVIEWED")
        && !(classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE")
        && !/medicament|farmaci/.test(normalized(product.category)) && !hasPerfumeShippingCargo(product.name)
        && !/\b(medicament\w*|comprimid\w*|capsul\w*|xarope\w*|ampola\w*|injetav\w*|insulina\w*|aerossol|aerosol|pressurizad\w*|inflamav\w*|pilhas?|baterias?|refriger\w*|pereciv\w*|congelad\w*|liquid\w*|spray\w*|solucao|locao|colonia|alcool\w*|etanol|acetona|solvent\w*|oleos?|fluido\w*|essencia\w*|cremes?|gel)\b|\b\d+(?:[.,]\d+)?\s*(?:ml|l)\b/.test(name);
    });
}

export function correiosPostingLocation() {
  return { city: "Ivaté", state: "PR" as const, pointName: "AC Ivaté", requiresTravel: false };
}

export function correiosBenefit(priceCents: number) {
  return { status: "regular" as const, customerPriceCents: priceCents, subsidyCents: 0, minimumOrderCents: null, remainingCents: null };
}

/** Each provider fails independently; programmer errors remain visible. */
export async function compareCorreios(primary: Promise<ShippingOption[]>, direct: Promise<ShippingOption[]>) {
  const [first, second] = await Promise.allSettled([primary, direct]);
  for (const result of [first, second]) if (result.status === "rejected" && !(result.reason instanceof ShippingError)) throw result.reason;
  const primaryOptions = first.status === "fulfilled" ? first.value : [];
  const correiosOptions = second.status === "fulfilled" ? second.value : [];
  if (!primaryOptions.length && !correiosOptions.length) {
    if (first.status === "rejected") throw first.reason;
    if (second.status === "rejected") throw second.reason;
  }
  return { primaryOptions, correiosOptions };
}

export async function quoteCorreiosCheckout(config: NonNullable<ReturnType<typeof getCorreiosCheckoutConfig>>, postalCode: string,
  packing: PackingRequest, preparationDays: number, request = fetch, serviceCodes?: ("03298" | "03220")[]): Promise<ShippingOption[]> {
  if (serviceCodes?.length === 0) return [];
  const parcel = {
    weightGrams: packing.products.reduce((sum, item) => sum + Math.ceil(item.weight * 1000) * item.quantity, 0),
    widthCm: Math.max(8, ...packing.products.map(item => Math.ceil(item.width))),
    lengthCm: Math.max(13, ...packing.products.map(item => Math.ceil(item.length))),
    heightCm: Math.max(1, Math.ceil(packing.products.reduce((sum, item) => sum + item.height * item.quantity, 0))),
  };
  const insuranceValueCents = packing.products.reduce((sum, item) => sum + Math.round(item.insurance_value * 100) * item.quantity, 0);
  if (parcel.weightGrams <= 0 || parcel.weightGrams > 30000 || Math.max(parcel.widthCm, parcel.heightCm, parcel.lengthCm) > 100
    || parcel.widthCm + parcel.heightCm + parcel.lengthCm > 200 || !Number.isSafeInteger(insuranceValueCents) || insuranceValueCents <= 0) return [];
  try {
    const { quotes } = await quoteCorreios(config, { originPostalCode: "87525000", destinationPostalCode: postalCode, ...parcel, insuranceValueCents, serviceCodes }, request);
    return quotes.map(quote => shippingOptionSchema.parse({ provider: "correios", serviceId: Number(quote.code), serviceCode: quote.code,
      carrier: "Correios", service: quote.name, priceCents: quote.priceCents, deliveryDays: quote.deliveryDays + preparationDays,
      packaging: { version: 1, calculationMethod: "provider-conservative-envelope", inputMeasurementBasis: packing.inputMeasurementBasis,
        packages: [{ ...parcel, insuranceValueCents, items: packing.products.map(item => ({ productId: item.id, quantity: item.quantity })) }] } }));
  } catch (error) {
    if (error instanceof CorreiosError) throw new ShippingError(error.message, error.status);
    throw error;
  }
}
