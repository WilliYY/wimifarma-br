import { shippingCustomerPrice } from "@/features/shipping/benefit-policy";
import type { ShippingOption } from "@/features/shipping/schema";

const integratorLabels = {
  "melhor-envio": "Melhor Envio",
  superfrete: "SuperFrete",
  frenet: "Frenet",
} satisfies Record<ShippingOption["provider"], string>;

export function shippingOptionsForDisplay<T extends ShippingOption>(options: readonly T[]) {
  return options.map(option => ({
    option,
    fee: shippingCustomerPrice(option),
    key: `${option.provider}:${option.serviceId}`,
    integrator: option.provider === "frenet" || options.some(other => other.provider !== option.provider && other.carrier === option.carrier && other.service === option.service)
      ? integratorLabels[option.provider]
      : undefined,
  })).sort((a, b) => a.fee - b.fee || a.option.deliveryDays - b.option.deliveryDays || a.option.serviceId - b.option.serviceId || a.key.localeCompare(b.key));
}
