import type { ShippingSettings } from "./schema";
import { resolvePostingLocation } from "./posting";
import { shippingOperationalCostSchema } from "./operational-cost-schema";

const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
export function shippingOperationalRouteKey(settings: ShippingSettings, serviceId: number): string {
  const route = resolvePostingLocation(settings, serviceId);
  if (!route || route.city.trim().length < 2 || !/^[A-Z]{2}$/.test(route.state)) return "";
  return [settings.originPostalCode, normalized(settings.originCity), settings.originState, normalized(route.city), route.state, normalized(route.pointName ?? "")].join("|");
}

/** Internal expense estimate; the carrier label stays intact. Confirmed totals can fund the benefit policy. */
export function estimateShippingOperationalCost(quote: { serviceId: number; priceCents: number }, settings: ShippingSettings) {
  const routeKey = shippingOperationalRouteKey(settings, quote.serviceId);
  const route = routeKey ? resolvePostingLocation(settings, quote.serviceId)! : null;
  const raw = settings.operationalCosts?.find(entry => entry.serviceId === quote.serviceId);
  const parsed = shippingOperationalCostSchema.safeParse(raw);
  const current = parsed.success && routeKey && parsed.data.routeKey === routeKey ? parsed.data : null;
  const missing: string[] = [];
  if (!route) missing.push("Local de postagem ou coleta");
  if (!current) missing.push(raw ? "Revisão dos custos desta rota" : "Custos desta rota");
  const components = {
    travelAllocatedCents: current?.tripCostCents == null ? null : Math.ceil(current.tripCostCents / current.parcelsPerTrip),
    collectionFeeCents: current?.collectionFeeCents ?? null,
    extraInsuranceCents: current?.extraInsuranceCents ?? null,
    returnReserveCents: current?.returnReserveCents ?? null,
    otherFeesCents: current?.otherFeesCents ?? null,
  };
  const labels = { travelAllocatedCents: "Deslocamento rateado", collectionFeeCents: "Coleta adicional", extraInsuranceCents: "Seguro externo adicional", returnReserveCents: "Provisão interna de retorno", otherFeesCents: "Outros adicionais" };
  for (const key of Object.keys(components) as (keyof typeof components)[]) if (components[key] === null) missing.push(labels[key]);
  const knownSubtotalCents = quote.priceCents + Object.values(components).reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const complete = missing.length === 0;
  return { serviceId: quote.serviceId, labelPriceCents: quote.priceCents, ...components, knownSubtotalCents, totalCostCents: complete ? knownSubtotalCents : null, complete, missing, route };
}
export type ShippingOperationalEstimate = ReturnType<typeof estimateShippingOperationalCost>;
