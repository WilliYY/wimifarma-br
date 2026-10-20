import { allocateCashbackDiscount } from "@/features/cashback/review-rewards";

export const PIX_DISCOUNT_PERCENT = 3;

export function pixDiscountCents(productsAfterWalletCents: number): number {
  if (!Number.isSafeInteger(productsAfterWalletCents) || productsAfterWalletCents < 0) {
    throw new Error("Base inválida para desconto Pix.");
  }
  return Number((BigInt(productsAfterWalletCents) * BigInt(PIX_DISCOUNT_PERCENT) + BigInt(50)) / BigInt(100));
}

type OrderPixDiscountSnapshot = {
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  cashbackRedeemedCents?: number;
  wimicoinsRedeemedPoints?: number;
  storeCreditRedeemedCents?: number;
};

export function orderPixDiscountCents(order: OrderPixDiscountSnapshot): number {
  return Math.max(0, order.subtotalCents + order.deliveryFeeCents
    - (order.cashbackRedeemedCents ?? 0) - (order.wimicoinsRedeemedPoints ?? 0) - (order.storeCreditRedeemedCents ?? 0) - order.totalCents);
}

export function allocatePixDiscount(items: { productSlug: string; totalCents: number }[], discountCents: number): number[] {
  const ordered = items.map((item, index) => ({ ...item, index })).sort((a, b) =>
    a.productSlug < b.productSlug ? -1 : a.productSlug > b.productSlug ? 1 : 0);
  const discounts = allocateCashbackDiscount(ordered.map(item => item.totalCents), discountCents);
  const result = items.map(() => 0);
  for (const [index, item] of ordered.entries()) result[item.index] = discounts[index];
  return result;
}
