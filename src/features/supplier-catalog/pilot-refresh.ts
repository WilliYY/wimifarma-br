import { resolveSupplierOffer, type SupplierCommerceOffer } from "./commerce";
import type { SupplierCatalogOfferInput } from "./schema";

type PreviousOffer = SupplierCommerceOffer & { externalCode: string };

/** Routine price checks preserve allocation and every pending/consumed unit. */
export function planPilotRefresh(eanNormalized: string, incoming: SupplierCatalogOfferInput[], previous: PreviousOffer[], now = Date.now()) {
  const updates = incoming.map(offer => {
    if (offer.replenishAllocation) throw new Error("Routine imports cannot replenish allocation.");
    if (Date.parse(offer.observedAt) > now || Date.parse(offer.validUntil) <= now) throw new Error("Every imported observation must be current and already performed.");
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
  return { updates, best: resolveSupplierOffer({ eanNormalized, requiresPrescription: true, supplierOffers: offers }, 1, now) };
}
