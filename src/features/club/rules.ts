import { productCashbackCents } from "@/features/cashback/rules";

export const DEFAULT_WIMICOINS_RATE_BPS = 200;
export type WimicoinsProduct = { wimicoinsEnabled?: boolean; wimicoinsRateBps?: number; requiresPrescription?: boolean; prescriptionType?: string; isPopularPharmacy?: boolean };

export function productWimicoinsPoints(product: WimicoinsProduct, unitPaidCents: number, quantity = 1) {
  if (product.requiresPrescription || ["ORDINARY", "ANTIMICROBIAL", "CONTROLLED"].includes(product.prescriptionType ?? "")) return 0;
  return productCashbackCents({ ...product, cashbackEnabled: product.wimicoinsEnabled, cashbackRateBps: product.wimicoinsRateBps ?? DEFAULT_WIMICOINS_RATE_BPS }, unitPaidCents, quantity);
}
