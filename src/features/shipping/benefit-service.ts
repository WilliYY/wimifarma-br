import { productCashbackCents, type CashbackProduct } from "@/features/cashback/rules";
import { productWimicoinsPoints, type WimicoinsProduct } from "@/features/club/rules";
import { pixDiscountCents } from "@/features/payments/pix-discount";
import { resolveSupplierOffer } from "@/features/supplier-catalog/commerce";
import { calculateShippingBenefit, shippingBenefitPolicySchema } from "./benefit-policy";
import { estimateShippingOperationalCost } from "./operational-cost";
import type { ShippingSettings } from "./schema";

type MarginProduct = Parameters<typeof resolveSupplierOffer>[0] & CashbackProduct & WimicoinsProduct & {
  id: string; inventorySource?: "PHARMACY" | "DISTRIBUTOR";
};
type MarginItem = { productId: string; quantity: number; unitPriceCents: number };

export function cartShippingBenefit(input: {
  settings: ShippingSettings; products: MarginProduct[]; items: MarginItem[];
  subtotalCents: number; discountCents: number;
  quote: { serviceId: number; priceCents: number; packaging?: { packages: unknown[] } }; economicPriceCents: number; now?: number;
}) {
  const now = input.now ?? Date.now();
  const policy = shippingBenefitPolicySchema.safeParse(input.settings.freeShippingPolicy ?? {});
  const packageCount = input.quote.packaging?.packages.length;
  let acquisitionCostCents: number | null = policy.success && policy.data.enabled ? 0 : null;
  let rewardsReserveCents = 0;
  for (const item of input.items) {
    const product = input.products.find(row => row.id === item.productId);
    if (!product) { acquisitionCostCents = null; continue; }
    // Reserve all eligible earnings even before authentication/Club selection.
    rewardsReserveCents += productCashbackCents(product, item.unitPriceCents, item.quantity)
      + productWimicoinsPoints(product, item.unitPriceCents, item.quantity);
    if (acquisitionCostCents === null || !policy.success) continue;
    const offer = product.inventorySource === "DISTRIBUTOR" ? resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, item.quantity, now) : null;
    if (!offer || new Date(offer.validUntil).getTime() <= now || new Date(offer.observedAt).getTime() < now - policy.data.costMaxAgeHours * 3_600_000) {
      acquisitionCostCents = null;
      continue;
    }
    // The imported final cost already includes ST; do not add the component again.
    acquisitionCostCents += offer.unitCostCents * item.quantity;
  }
  const percentageBaseCents = Math.max(0, input.subtotalCents - input.discountCents);
  const operational = estimateShippingOperationalCost(input.quote, input.settings);
  return calculateShippingBenefit({
    policy: policy.success && packageCount && policy.data.packagingCostCents !== null
      ? { ...policy.data, packagingCostCents: policy.data.packagingCostCents * packageCount }
      : undefined,
    carrierPriceCents: input.quote.priceCents, economicPriceCents: input.economicPriceCents,
    percentageBaseCents, netProductsCents: percentageBaseCents - pixDiscountCents(percentageBaseCents),
    acquisitionCostCents, rewardsReserveCents,
    operationalExtraCents: operational.totalCostCents === null ? null : operational.totalCostCents - input.quote.priceCents,
  });
}
