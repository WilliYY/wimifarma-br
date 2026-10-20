import { z } from "zod";

const money = z.number().int().min(0).max(100_000_000);
const positiveMoney = money.min(1);
const rate = z.number().int().min(0).max(10_000);
const quantity = z.number().int().min(1).max(10_000);
const ean = z.string().regex(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/).refine(value => {
  let sum = 0;
  for (let index = value.length - 2, weight = 3; index >= 0; index--, weight = 4 - weight) {
    sum += Number(value[index]) * weight;
  }
  return (10 - sum % 10) % 10 === Number(value.at(-1));
}, "EAN inválido.");

export const SupplierOfferSchema = z.object({
  supplier: z.enum(["ANB", "SANTA_CRUZ", "PROFARMA", "GAM", "DM"]),
  ean,
  unitCostCents: positiveMoney,
  substitutionTaxCents: money.nullable().default(null),
  inboundUnitCostCents: money.default(0),
  availability: z.enum(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]),
  stockQuantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
  checkedAt: z.iso.datetime({ offset: true }),
  validUntil: z.iso.datetime({ offset: true }),
}).refine(value => {
  const duration = Date.parse(value.validUntil) - Date.parse(value.checkedAt);
  return duration > 0 && duration <= 24 * 60 * 60 * 1000;
}, { message: "A validade deve ser positiva e de até 24 horas.", path: ["validUntil"] });

export const SupplierComparisonInputSchema = z.object({
  ean,
  quantity,
  isMedicine: z.boolean(),
  offers: z.array(SupplierOfferSchema).max(100),
});

export const OrderSimulationInputSchema = z.object({
  unitCostCents: positiveMoney,
  unitSaleCents: positiveMoney,
  quantity,
  inboundFreightCents: money.default(0),
  packagingCents: money.nullable(),
  carrierFreightCents: money.nullable(),
  taxBps: rate.nullable(),
  paymentFeeBps: rate.nullable(),
  paymentFixedCents: money.nullable(),
  otherVariableCents: money.nullable(),
  cashbackBps: rate,
  wimicoinsBps: rate,
  requiresPrescription: z.boolean(),
  isPopularPharmacy: z.boolean(),
  walletDiscountCents: money,
  pixDiscountBps: rate,
  freeShippingThresholdCents: positiveMoney,
  freeShippingBeforePix: z.boolean(),
  pmcRequired: z.boolean(),
  pmcCeilingCents: positiveMoney.nullable(),
}).refine(value => {
  const remaining = BigInt(value.unitSaleCents) * BigInt(value.quantity) - BigInt(value.walletDiscountCents);
  const pix = (remaining * BigInt(value.pixDiscountBps) + BigInt(5000)) / BigInt(10000);
  return remaining - pix >= BigInt(1);
}, { message: "Os descontos devem preservar pelo menos um centavo dos produtos.", path: ["walletDiscountCents"] });

export type SupplierOffer = z.infer<typeof SupplierOfferSchema>;
export type SupplierComparisonInput = z.input<typeof SupplierComparisonInputSchema>;
export type OrderSimulationInput = z.infer<typeof OrderSimulationInputSchema>;
