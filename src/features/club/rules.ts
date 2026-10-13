import { productCashbackCents } from "@/features/cashback/rules";

export const DEFAULT_WIMICOINS_RATE_BPS = 200;
export type WimicoinsProduct = { wimicoinsEnabled?: boolean; wimicoinsRateBps?: number; requiresPrescription?: boolean; isPopularPharmacy?: boolean };

export function productWimicoinsPoints(product: WimicoinsProduct, unitPaidCents: number, quantity = 1) {
  return productCashbackCents({ ...product, cashbackEnabled: product.wimicoinsEnabled, cashbackRateBps: product.wimicoinsRateBps ?? DEFAULT_WIMICOINS_RATE_BPS }, unitPaidCents, quantity);
}
