import { allocateCashbackDiscount } from "@/features/cashback/review-rewards";

type DiscountItem = { totalCents: number; wimicoinsEligible: boolean };

export function allocateOrderBenefits(items: DiscountItem[], cashbackCents: number, wimicoinsPoints: number, storeCreditCents = 0) {
  const cashback = allocateCashbackDiscount(items.map(item => item.totalCents), cashbackCents);
  const remaining = items.map((item, index) => item.wimicoinsEligible ? item.totalCents - cashback[index] : 0);
  const wimicoins = allocateCashbackDiscount(remaining, wimicoinsPoints);
  const storeCredit = allocateCashbackDiscount(items.map((item, index) => item.totalCents - cashback[index] - wimicoins[index]), storeCreditCents);
  return items.map((item, index) => ({
    cashbackDiscountCents: cashback[index],
    wimicoinsDiscountPoints: wimicoins[index],
    storeCreditDiscountCents: storeCredit[index],
    paidCents: item.totalCents - cashback[index] - wimicoins[index] - storeCredit[index],
  }));
}
