import { z } from "zod";

const confirmedCents = z.number().int().min(0).max(10_000_000).nullable().default(null);
const confirmedBps = z.number().int().min(0).max(9000).nullable().default(null);
export const shippingBenefitPolicySchema = z.object({
  enabled: z.boolean().default(false),
  maximumSubsidyCents: confirmedCents,
  minimumContributionBps: confirmedBps,
  variableCostReserveBps: confirmedBps,
  packagingCostCents: confirmedCents,
  costMaxAgeHours: z.number().int().min(1).max(168).default(24),
}).superRefine((value, context) => {
  if (!value.enabled) return;
  for (const field of ["maximumSubsidyCents", "minimumContributionBps", "variableCostReserveBps", "packagingCostCents"] as const) {
    if (value[field] === null) context.addIssue({ code: "custom", path: [field], message: "Informe um valor confirmado antes de ativar o benefício." });
  }
  if ((value.minimumContributionBps ?? 0) + (value.variableCostReserveBps ?? 0) >= 10_000) context.addIssue({ code: "custom", path: ["minimumContributionBps"], message: "A contribuição e a reserva somadas devem ficar abaixo de 100%." });
});
export type ShippingBenefitPolicy = z.infer<typeof shippingBenefitPolicySchema>;
export const defaultShippingBenefitPolicy = shippingBenefitPolicySchema.parse({});

export const shippingBenefitSchema = z.object({
  status: z.enum(["regular", "discounted", "free"]),
  customerPriceCents: z.number().int().min(0).max(10_000_000),
  subsidyCents: z.number().int().min(0).max(10_000_000),
  minimumOrderCents: z.number().int().positive().max(100_000_000).nullable(),
  remainingCents: z.number().int().positive().max(100_000_000).nullable(),
});
export type ShippingBenefit = z.infer<typeof shippingBenefitSchema>;
type BenefitInput = {
  policy: unknown;
  carrierPriceCents: number;
  economicPriceCents: number;
  netProductsCents: number;
  /** Upper bound before Pix, for conservative percentage reserves and contribution. */
  percentageBaseCents?: number;
  acquisitionCostCents: number | null;
  rewardsReserveCents: number;
  operationalExtraCents: number | null;
};
const money = (value: number | null | undefined): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000;
const zero = BigInt(0), one = BigInt(1), thousand = BigInt(1000);
const ceilDivide = (value: bigint, divisor: bigint) => (value + divisor - one) / divisor;

/** All cost inputs stay server-side. Only the commercial benefit is public/signed. */
export function calculateShippingBenefit(input: BenefitInput): ShippingBenefit {
  const normal: ShippingBenefit = { status: "regular", customerPriceCents: input.carrierPriceCents, subsidyCents: 0, minimumOrderCents: null, remainingCents: null };
  const parsed = shippingBenefitPolicySchema.safeParse(input.policy);
  const base = input.percentageBaseCents ?? input.netProductsCents;
  if (!parsed.success || !parsed.data.enabled || !money(input.carrierPriceCents) || !money(input.economicPriceCents)
    || !money(input.netProductsCents) || !money(base) || base < input.netProductsCents || base === 0
    || !money(input.acquisitionCostCents) || !money(input.operationalExtraCents) || !money(input.rewardsReserveCents)) return normal;
  const policy = parsed.data;
  if (policy.maximumSubsidyCents === null || policy.minimumContributionBps === null || policy.variableCostReserveBps === null || policy.packagingCostCents === null) return normal;
  const d = BigInt(10_000), p = BigInt(base), n = BigInt(input.netProductsCents), q = BigInt(input.carrierPriceCents);
  const cost = BigInt(input.acquisitionCostCents), rewards = BigInt(input.rewardsReserveCents);
  const extra = BigInt(input.operationalExtraCents + policy.packagingCostCents);
  const minimum = BigInt(policy.minimumContributionBps), reserve = BigInt(policy.variableCostReserveBps);
  const available = n - cost - rewards - extra - ceilDivide(p * minimum, d);
  const numerator = d * available - reserve * (p + q);
  const budget = numerator > zero ? numerator / (d - reserve) : zero;
  const subsidy = [q, BigInt(input.economicPriceCents), BigInt(policy.maximumSubsidyCents), budget].reduce((a, b) => a < b ? a : b);
  const customer = q - subsidy;
  let minimumOrderCents: number | null = null;
  let remainingCents: number | null = null;
  // Estimate only for the current economic parcel/mix. New goods/weight require a new quote.
  const slope = d * (n - cost - rewards) - (minimum + reserve) * p;
  if (customer > zero && q <= BigInt(input.economicPriceCents) && q <= BigInt(policy.maximumSubsidyCents) && slope > zero) {
    const projected = ceilDivide((q + extra) * d * p, slope);
    const rounded = ceilDivide(projected, thousand) * thousand;
    const next = ceilDivide(p + one, thousand) * thousand;
    const threshold = rounded > next ? rounded : next;
    if (threshold <= BigInt(100_000_000)) { minimumOrderCents = Number(threshold); remainingCents = Number(threshold - p); }
  }
  return { status: customer === zero ? "free" : subsidy > zero ? "discounted" : "regular", customerPriceCents: Number(customer), subsidyCents: Number(subsidy), minimumOrderCents, remainingCents };
}

export function shippingCustomerPrice(option?: { priceCents: number; benefit?: ShippingBenefit } | null) {
  return option?.benefit?.customerPriceCents ?? option?.priceCents ?? 0;
}
