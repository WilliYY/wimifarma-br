import { shippingQuotePayloadSchema, type ShippingSettings } from "./schema";

function normalizedCity(city: string) {
  return city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

export function resolvePostingLocation(settings: ShippingSettings, serviceId: number) {
  const location = settings.postingLocations.find(location => location.serviceId === serviceId);
  if (!location) return undefined;
  return {
    city: location.city, state: location.state,
    ...(location.pointName ? { pointName: location.pointName } : {}),
    requiresTravel: normalizedCity(location.city) !== normalizedCity(settings.originCity) || location.state !== settings.originState,
  };
}

export function orderPostingLocation(quote: unknown) {
  const parsed = shippingQuotePayloadSchema.safeParse(quote);
  return parsed.success ? parsed.data.postingLocation : undefined;
}
