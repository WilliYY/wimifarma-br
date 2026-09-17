import { calculateCashbackCents } from "./rules";

export const REVIEW_REWARD_RATE_BPS = 100;

export function reviewRewardCents(unitPriceCents: number, quantity: number, discountCents: number): number {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0 ||
      !Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > unitPriceCents * quantity) {
    throw new Error("Base invalida para bonus de avaliacao.");
  }
  const paidUnitCents = Math.floor((unitPriceCents * quantity - discountCents) / quantity);
  return calculateCashbackCents(paidUnitCents, REVIEW_REWARD_RATE_BPS);
}

export function allocateCashbackDiscount(totals: number[], discountCents: number): number[] {
  const total = totals.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total) || totals.some((n) => !Number.isSafeInteger(n) || n < 0) ||
      !Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > total) {
    throw new Error("Desconto de cashback invalido.");
  }
  if (!total) return totals.map(() => 0);
  // Maiores restos distribui centavos sem criar desconto ou alterar o total.
  const denominator = BigInt(total);
  const shares = totals.map((value, index) => {
    const numerator = BigInt(value) * BigInt(discountCents);
    return { index, amount: Number(numerator / denominator), remainder: numerator % denominator };
  });
  let remaining = discountCents - shares.reduce((sum, item) => sum + item.amount, 0);
  const priority = [...shares].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (const item of priority) {
    if (remaining-- <= 0) break;
    item.amount += 1;
  }
  return shares.map((item) => item.amount);
}
