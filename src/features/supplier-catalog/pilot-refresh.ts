import { resolveSupplierOffer, type SupplierCommerceOffer } from "./commerce";
import type { SupplierCatalogOfferInput } from "./schema";

type PreviousOffer = SupplierCommerceOffer & { externalCode: string };

/** Routine price checks preserve allocation and every pending/consumed unit. */
export function planPilotRefresh(eanNormalized: string, incoming: SupplierCatalogOfferInput[], previous: PreviousOffer[], now = Date.now(), supplierMarkupBps = 6000, requiresPrescription = true) {
  if (new Set(incoming.map(offer => offer.supplier)).size !== incoming.length) throw new Error("Duplicate supplier offer.");
  const updates = incoming.map(offer => {
    if (offer.replenishAllocation) throw new Error("Routine imports cannot replenish allocation.");
    const observed = Date.parse(offer.observedAt), expires = Date.parse(offer.validUntil);
    if (!Number.isFinite(observed) || !Number.isFinite(expires) || observed > now || now - observed > 86_400_000 || expires <= now || expires <= observed || expires - observed > 86_400_000) throw new Error("Every imported observation must be current and already performed, with validity up to 24 hours.");
    if (offer.eanNormalized !== eanNormalized) throw new Error("Supplier identity changed; review manually.");
    if (requiresPrescription && offer.retailCeilingCents === null) throw new Error("Verified retail ceiling required for prescription offers.");
    const stored = previous.find(row => row.supplier === offer.supplier);
    if (stored && new Date(stored.observedAt).getTime() > Date.parse(offer.observedAt)) throw new Error("A newer offer is already stored; refusing stale import.");
    if (stored && (stored.externalCode !== offer.externalCode || stored.eanNormalized !== eanNormalized)) throw new Error("Supplier identity changed; review manually.");
    return { ...offer, allocationQuantity: stored?.allocationQuantity ?? offer.allocationQuantity };
  });
  const offers: SupplierCommerceOffer[] = [...previous];
  for (const offer of updates) {
    const index = offers.findIndex(row => row.supplier === offer.supplier);
    const stored = index < 0 ? undefined : offers[index];
    const refreshed = { ...offer, id: stored?.id ?? offer.supplier, eanNormalized,
      reservedQuantity: stored?.reservedQuantity ?? 0, committedQuantity: stored?.committedQuantity ?? 0 };
    if (index < 0) offers.push(refreshed); else offers[index] = refreshed;
  }
  return { updates, best: resolveSupplierOffer({ eanNormalized, requiresPrescription, supplierMarkupBps, supplierOffers: offers }, 1, now) };
}
