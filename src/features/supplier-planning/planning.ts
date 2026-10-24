import { calculateCashbackCents } from "@/features/cashback/rules";
import { productWimicoinsPoints } from "@/features/club/rules";
import { OrderSimulationInputSchema, SupplierComparisonInputSchema, type OrderSimulationInput, type SupplierComparisonInput } from "./schema";
import { hasRequiredSupplierTax } from "./tax-eligibility";

function safeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("O cálculo excede o limite de centavos seguros.");
  }
  return Number(value);
}

function ceilRate(value: bigint, rate: number): bigint {
  return (value * BigInt(rate) + BigInt(9999)) / BigInt(10000);
}

export function compareSupplierOffers(input: SupplierComparisonInput, now: number) {
  const parsed = SupplierComparisonInputSchema.parse(input);
  if (!Number.isSafeInteger(now)) throw new Error("Data de comparação inválida.");
  const options = parsed.offers.map(offer => {
    const reasons: string[] = [];
    if (!hasRequiredSupplierTax(offer, parsed.isMedicine)) reasons.push("Sem cálculo de ST.");
    if (offer.ean !== parsed.ean) reasons.push("EAN divergente.");
    if (offer.availability === "UNKNOWN") reasons.push("Disponibilidade desconhecida.");
    if (offer.availability === "UNAVAILABLE") reasons.push("Produto indisponível.");
    if (offer.stockQuantity === null) reasons.push("Saldo desconhecido.");
    else if (offer.stockQuantity < parsed.quantity) reasons.push("Saldo insuficiente.");
    if (Date.parse(offer.checkedAt) > now) reasons.push("Conferência no futuro.");
    if (Date.parse(offer.validUntil) <= now) reasons.push("Oferta expirada.");
    const totalCostCents = safeNumber((BigInt(offer.unitCostCents) + BigInt(offer.inboundUnitCostCents)) * BigInt(parsed.quantity));
    return { offer, totalCostCents, reasons };
  }).sort((first, second) => first.totalCostCents - second.totalCostCents);
  return { best: options.find(option => option.reasons.length === 0)?.offer ?? null, options };
}

export function priceWithMarkup(costCents: number, markupBps: number): number {
  if (!Number.isSafeInteger(costCents) || costCents < 1 || costCents > 100_000_000 ||
      !Number.isSafeInteger(markupBps) || markupBps < 0 || markupBps > 10_000) {
    throw new Error("Custo ou acréscimo inválido.");
  }
  return safeNumber((BigInt(costCents) * (BigInt(10000) + BigInt(markupBps)) + BigInt(5000)) / BigInt(10000));
}

export function simulateOrder(input: OrderSimulationInput) {
  const value = OrderSimulationInputSchema.parse(input);
  const gross = BigInt(value.unitSaleCents) * BigInt(value.quantity);
  const afterWallet = gross - BigInt(value.walletDiscountCents);
  const pix = (afterWallet * BigInt(value.pixDiscountBps) + BigInt(5000)) / BigInt(10000);
  const net = afterWallet - pix;
  const acquisition = BigInt(value.unitCostCents) * BigInt(value.quantity);
  const missing: string[] = [];
  for (const field of ["packagingCents", "carrierFreightCents", "taxBps", "paymentFeeBps", "paymentFixedCents", "otherVariableCents"] as const) {
    if (value[field] === null) missing.push(field);
  }
  if (value.pmcRequired && value.pmcCeilingCents === null) missing.push("pmcCeilingCents");
  const warnings: string[] = [];
  const pmcExceeded = value.pmcCeilingCents !== null && value.unitSaleCents > value.pmcCeilingCents;
  if (pmcExceeded) warnings.push("Preço unitário acima do PMC informado; revise o preço e a apresentação.");
  const freeShipping = (value.freeShippingBeforePix ? afterWallet : net) >= BigInt(value.freeShippingThresholdCents);
  const customerFreightCents = freeShipping ? 0 : value.carrierFreightCents;
  const collected = customerFreightCents === null ? null : net + BigInt(customerFreightCents);
  const tax = value.taxBps === null ? null : ceilRate(net, value.taxBps);
  const paymentFee = collected === null || value.paymentFeeBps === null || value.paymentFixedCents === null
    ? null : ceilRate(collected, value.paymentFeeBps) + BigInt(value.paymentFixedCents);

  // Match checkout's exact allocation: each unit receives the base or one extra cent.
  const unitBase = safeNumber(net / BigInt(value.quantity));
  const extraUnits = safeNumber(net % BigInt(value.quantity));
  const baseUnits = value.quantity - extraUnits;
  const product = { requiresPrescription: value.requiresPrescription, isPopularPharmacy: value.isPopularPharmacy,
    cashbackEnabled: value.cashbackBps > 0, cashbackRateBps: value.cashbackBps,
    wimicoinsEnabled: value.wimicoinsBps > 0, wimicoinsRateBps: value.wimicoinsBps };
  // A manually entered scenario must include its stated cashback cost, including
  // eligible Rx cases. This calculator never changes product eligibility.
  const cashbackCents = value.cashbackBps > 0 && !value.isPopularPharmacy
    ? calculateCashbackCents(unitBase, value.cashbackBps, baseUnits)
      + (extraUnits > 0 ? calculateCashbackCents(unitBase + 1, value.cashbackBps, extraUnits) : 0)
    : 0;
  const wimicoinsCents = productWimicoinsPoints(product, unitBase, baseUnits)
    + (extraUnits > 0 ? productWimicoinsPoints(product, unitBase + 1, extraUnits) : 0);
  const contribution = missing.length > 0 || collected === null || tax === null || paymentFee === null ? null
    : collected - acquisition - BigInt(value.inboundFreightCents) - BigInt(value.packagingCents!)
      - BigInt(value.carrierFreightCents!) - tax - paymentFee - BigInt(cashbackCents)
      - BigInt(wimicoinsCents) - BigInt(value.otherVariableCents!);
  return {
    grossProductsCents: safeNumber(gross),
    pixDiscountCents: safeNumber(pix),
    netProductsCents: safeNumber(net),
    customerFreightCents,
    collectedCents: collected === null ? null : safeNumber(collected),
    acquisitionCents: safeNumber(acquisition),
    inboundFreightCents: value.inboundFreightCents,
    packagingCents: value.packagingCents,
    carrierFreightCents: value.carrierFreightCents,
    taxCents: tax === null ? null : safeNumber(tax),
    paymentFeeCents: paymentFee === null ? null : safeNumber(paymentFee),
    cashbackCents,
    wimicoinsCents,
    otherVariableCents: value.otherVariableCents,
    contributionCents: contribution === null ? null : safeNumber(contribution),
    contributionBps: contribution === null || collected === null ? null : safeNumber(contribution * BigInt(10000) / collected),
    missing,
    warnings,
    pmcExceeded,
  };
}
