import { assessCarrierCargo, type ShippingCargo } from "./cargo-policy";
import { estimateShippingOperationalCost } from "./operational-cost";
import type { ShippingOption, ShippingSettings } from "./schema";

/** Administrative comparison only; never changes the carrier price or checkout selection. */
export function buildShippingComparisons(quotes: ShippingOption[], settings: ShippingSettings, cargoKinds: ShippingCargo[], acceptanceConfirmed = false) {
  const entries = quotes.map(quote => {
    const cargo = assessCarrierCargo(quote.serviceId, cargoKinds, quote.carrier);
    const cost = estimateShippingOperationalCost(quote, settings);
    const canRecommend = cost.complete && (cargo.status === "allowed" || (cargo.status === "conditional" && acceptanceConfirmed));
    return { quote, cargo, cost, canRecommend, bestKnownCost: false };
  });
  const totals = entries.filter(entry => entry.canRecommend).map(entry => entry.cost.totalCostCents!);
  const minimum = totals.length ? Math.min(...totals) : null;
  return entries.map(entry => ({ ...entry, bestKnownCost: entry.canRecommend && entry.cost.totalCostCents === minimum }))
    .sort((a, b) => Number(b.canRecommend) - Number(a.canRecommend)
      || (a.canRecommend ? a.cost.totalCostCents! - b.cost.totalCostCents! : a.quote.priceCents - b.quote.priceCents));
}
