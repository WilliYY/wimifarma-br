import { prepareCheckoutOrder } from "@/features/orders/checkout";
import { toSaleProduct } from "@/features/supplier-catalog/commerce";
import { cartShippingBenefit } from "./benefit-service";
import type { ShippingBenefit } from "./benefit-policy";
import { calculatePackedQuotes } from "./calculate-packed-quotes";
import { permittedShippingServices } from "./eligibility";
import type { PackingProduct } from "./packing";
import { validateShippingProduct } from "./rules";
import { ShippingError, type ShippingOption, type ShippingSettings } from "./schema";

type Goal = Pick<ShippingBenefit, "minimumOrderCents" | "remainingCents">;
type Product = Parameters<typeof toSaleProduct>[0] & Parameters<typeof validateShippingProduct>[0]
  & Parameters<typeof cartShippingBenefit>[0]["products"][number]
  & { slug: string; imageUrl: string | null; status: "DRAFT" | "ACTIVE" | "ARCHIVED" };
type Item = Parameters<typeof cartShippingBenefit>[0]["items"][number];
type Option = ShippingOption & { benefit: ShippingBenefit };

/** Informational goals only. The actual quote, price and benefit never change here. */
export async function resolveAttainableShippingGoals(input: {
  products: Product[]; items: Item[]; subtotalCents: number; discountCents: number;
  options: Option[]; settings: ShippingSettings; now?: number;
  quoteTarget: (products: PackingProduct[], serviceIds: number[], timeoutMs: number) => Promise<unknown>;
}): Promise<Map<number, Goal>> {
  const goals = new Map(input.options.map(option => [option.serviceId, { minimumOrderCents: null, remainingCents: null } as Goal]));
  const deadline = Date.now() + 1500;
  const now = input.now ?? Date.now();
  let requests = 0, technicalFailure = false;
  let options = input.options;
  let quantities = input.items.map(item => item.quantity);
  if (!input.subtotalCents || input.items.reduce((sum, item) => sum + item.quantity, 0) >= 20) return goals;
  try {
    const serviceIds = permittedShippingServices(input.settings.serviceIds, input.products);
    const profiles = new Map(input.products.map(product => [product.id, validateShippingProduct(product)]));
    const saleProducts = input.products.map(product => toSaleProduct(product, now));
    // At most two candidates; a packing fallback consumes the same request budget.
    for (let attempt = 0; attempt < 2 && requests < 2 && Date.now() < deadline && !technicalFailure; attempt++) {
      const unresolved = options.filter(option => input.options.some(original => original.serviceId === option.serviceId && original.benefit.status !== "free")
        && goals.get(option.serviceId)?.minimumOrderCents === null);
      if (!unresolved.length) break;
      const economicPriceCents = Math.min(...options.map(option => option.priceCents));
      let candidate: { prepared: Extract<ReturnType<typeof prepareCheckoutOrder>, { ok: true }>; discountCents: number } | undefined;
      // Enumerate ceil-proportional breakpoints locally. Rounded legacy thresholds
      // are not seeds: they can skip purchasable units or eligible quantity costs.
      while (Date.now() < deadline) {
        const scale = Math.min(...quantities.map((quantity, index) => quantity / input.items[index].quantity));
        quantities = input.items.map(item => Math.floor(item.quantity * scale + 1e-9) + 1);
        if (quantities.reduce((sum, quantity) => sum + quantity, 0) > 20) break;
        const prepared = prepareCheckoutOrder(saleProducts, input.items.map((item, index) => ({ productId: item.productId,
          quantity: quantities[index], expectedUnitPriceCents: item.unitPriceCents })));
        if (!prepared.ok) break;
        // Reserve the current discount share without granting a future discount.
        // All goal amounts remain gross product subtotals, before this reserve.
        const discountCents = Math.ceil(input.discountCents * prepared.subtotalCents / input.subtotalCents);
        if (discountCents > prepared.subtotalCents) break;
        const plausible = unresolved.some(quote => cartShippingBenefit({ settings: input.settings, products: input.products,
          items: prepared.items, subtotalCents: prepared.subtotalCents, discountCents, quote, economicPriceCents, now }).status === "free");
        if (plausible) { candidate = { prepared, discountCents }; break; }
      }
      if (!candidate) break;
      const { prepared, discountCents } = candidate;
      const benefitInput = { settings: input.settings, products: input.products, items: prepared.items,
        subtotalCents: prepared.subtotalCents, discountCents, now };
      const packingProducts = prepared.items.map(item => {
        const profile = profiles.get(item.productId)!;
        return { id: item.productId, quantity: item.quantity, insurance_value: item.unitPriceCents / 100,
          width: profile.widthCm, height: profile.heightCm, length: profile.lengthCm, weight: profile.weightGrams / 1000 };
      });
      const targetOptions = await calculatePackedQuotes({ products: packingProducts,
        inputMeasurementBasis: [...profiles.values()].some(profile => profile.measurementBasis === "estimated") ? "estimated" : "measured" }, serviceIds, input.settings.preparationDays,
      async (products, ids) => {
        const timeoutMs = deadline - Date.now();
        if (requests >= 2 || timeoutMs <= 0 || technicalFailure) throw new ShippingError("Meta de frete não verificada.", 503);
        requests++;
        try { return await input.quoteTarget(products, ids, timeoutMs); }
        catch (error) { technicalFailure = true; throw error; }
      });
      if (technicalFailure || Date.now() >= deadline || !targetOptions.length) break;
      const targetEconomicPriceCents = Math.min(...targetOptions.map(option => option.priceCents));
      options = targetOptions.map(option => ({ ...option, benefit: cartShippingBenefit({ ...benefitInput, quote: option, economicPriceCents: targetEconomicPriceCents }) }));
      for (const option of options) {
        const original = input.options.find(original => original.serviceId === option.serviceId);
        if (original && original.benefit.status !== "free" && option.benefit.status === "free") {
          goals.set(option.serviceId, { minimumOrderCents: prepared.subtotalCents, remainingCents: prepared.subtotalCents - input.subtotalCents });
        }
      }
    }
  } catch {
    // Future carts are advisory. Fail closed without invalidating the real quote.
  }
  return goals;
}
