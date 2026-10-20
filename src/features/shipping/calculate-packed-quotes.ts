import { normalizeShippingPackaging, type PackingProduct, type PackingRequest } from "./packing";
import { normalizeQuotes } from "./rules";
import { ShippingError, type ShippingOption } from "./schema";

type Calculate = (products: PackingProduct[], serviceIds: number[]) => Promise<unknown>;

/** Retry only invalid provider packing, once, using a larger envelope for every unit. */
export async function calculatePackedQuotes(request: PackingRequest, serviceIds: number[], preparationDays: number, calculate: Calculate): Promise<ShippingOption[]> {
  const raw = await calculate(request.products, serviceIds);
  const retryIds = new Set<number>();
  for (const entry of Array.isArray(raw) ? raw : [raw]) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !serviceIds.includes(entry.id) || entry.error) continue;
    if (normalizeShippingPackaging(entry.packages, request)) continue;
    // Invalid price/service metadata is not a packing failure and must not be retried.
    try {
      if (normalizeQuotes(entry, serviceIds, preparationDays).length) retryIds.add(entry.id);
    } catch (error) {
      if (!(error instanceof ShippingError)) throw error;
    }
  }

  let first: ShippingOption[];
  let firstFailure: ShippingError | undefined;
  try {
    first = normalizeQuotes(raw, serviceIds, preparationDays, request);
  } catch (error) {
    if (!(error instanceof ShippingError) || !retryIds.size) throw error;
    first = [];
    firstFailure = error;
  }
  for (const option of first) retryIds.delete(option.serviceId);
  if (!retryIds.size) return first;

  const side = Math.max(...request.products.flatMap(product => [product.width, product.height, product.length]));
  const conservative: PackingRequest = {
    ...request, conservativeEnvelope: true,
    products: request.products.map(product => ({ ...product, width: side, height: side, length: side })),
  };
  try {
    const ids = [...retryIds];
    const retried = normalizeQuotes(await calculate(conservative.products, ids), ids, preparationDays, conservative);
    if (!first.length && !retried.length && firstFailure) throw firstFailure;
    return [...first, ...retried].sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays);
  } catch (error) {
    if (!(error instanceof ShippingError)) throw error;
    console.warn("[melhor-envio] packing-retry-failed", { serviceIds: [...retryIds], status: error.status });
    if (first.length) return first;
    throw error;
  }
}
