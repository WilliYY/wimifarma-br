import { allocateCashbackDiscount } from "@/features/cashback/review-rewards";

type DiscountItem = { totalCents: number; wimicoinsEligible: boolean };

export function allocateOrderBenefits(items: DiscountItem[], cashbackCents: number, wimicoinsPoints: number) {
  const cashback = allocateCashbackDiscount(items.map(item => item.totalCents), cashbackCents);
  const remaining = items.map((item, index) => item.wimicoinsEligible ? item.totalCents - cashback[index] : 0);
  const wimicoins = allocateCashbackDiscount(remaining, wimicoinsPoints);
  return items.map((item, index) => ({
    cashbackDiscountCents: cashback[index],
    wimicoinsDiscountPoints: wimicoins[index],
    paidCents: item.totalCents - cashback[index] - wimicoins[index],
  }));
}
