import { requiresPharmacyShippingSupport } from "./eligibility";
import { shippingProfileSchema } from "./schema";

type ReadinessProduct = Parameters<typeof requiresPharmacyShippingSupport>[0] & { shippingProfile: unknown };
export type ShippingReadiness = "missing" | "review" | "disabled" | "configured" | "assisted";
export function shippingReadiness(product: ReadinessProduct): ShippingReadiness {
  if (requiresPharmacyShippingSupport(product)) return "assisted";
  if (product.shippingProfile == null) return "missing";
  const raw = product.shippingProfile as Record<string, unknown>;
  if (raw.enabled === false) return "disabled";
  const parsed = shippingProfileSchema.safeParse(raw);
  return parsed.success && parsed.data.enabled ? "configured" : "review";
}
export function summarizeShippingReadiness(products: ReadinessProduct[]) {
  const summary = { total: products.length, missing: 0, review: 0, disabled: 0, configured: 0, assisted: 0 };
  for (const product of products) summary[shippingReadiness(product)]++;
  return summary;
}
