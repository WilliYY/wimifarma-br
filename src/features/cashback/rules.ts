import { z } from "zod";
import { readClassification } from "@/features/products/catalog-operations";

export const DEFAULT_CASHBACK_RATE_BPS = 200;
export const GENERIC_SIMILAR_CASHBACK_RATE_BPS = 100;
export const cashbackRateSchema = z.number().int().min(1).max(10_000);
export const cashbackProductUpdateSchema = z.object({
  cashbackEnabled: z.boolean(),
  cashbackRateBps: cashbackRateSchema,
  expectedUpdatedAt: z.iso.datetime(),
});

export type CashbackProduct = {
  cashbackEnabled?: boolean;
  cashbackRateBps?: number;
  requiresPrescription?: boolean;
  isPopularPharmacy?: boolean;
  prescriptionType?: string;
  catalogClassification?: unknown;
};

export function cashbackProductIsEligible(product: CashbackProduct) {
  if (product.isPopularPharmacy || product.prescriptionType === "CONTROLLED") return false;
  const classifiedPrescription = product.prescriptionType === "ORDINARY" || product.prescriptionType === "ANTIMICROBIAL";
  if (!product.requiresPrescription && !classifiedPrescription) return true;
  const classification = readClassification(product.catalogClassification);
  return classifiedPrescription && classification.kind === "MEDICINE" &&
    (classification.medicineClass === "GENERIC" || classification.medicineClass === "SIMILAR");
}

export function medicineCashbackDefaults(product: CashbackProduct) {
  const classification = readClassification(product.catalogClassification);
  return cashbackProductIsEligible(product) && classification.kind === "MEDICINE" &&
    (classification.medicineClass === "GENERIC" || classification.medicineClass === "SIMILAR")
    ? { cashbackEnabled: true, cashbackRateBps: GENERIC_SIMILAR_CASHBACK_RATE_BPS } : {};
}

export type CashbackState = "NONE" | "PENDING" | "CREDITED" | "VOIDED" | "REVERSED";

export function calculateCashbackCents(unitPriceCents: number, rateBps: number, quantity = 1) {
  cashbackRateSchema.parse(rateBps);
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("Valor ou quantidade invalida para cashback.");
  }
  const numerator = unitPriceCents * rateBps;
  if (!Number.isSafeInteger(numerator)) throw new Error("Cashback excede o limite.");
  // Arredondamento por unidade: a vitrine e o pedido usam o mesmo valor.
  const result = Math.floor((numerator + 5000) / 10_000) * quantity;
  if (!Number.isSafeInteger(result)) throw new Error("Cashback excede o limite.");
  return result;
}

export function productCashbackCents(product: CashbackProduct, unitPriceCents: number, quantity = 1) {
  if (!product.cashbackEnabled || !cashbackProductIsEligible(product)) return 0;
  return calculateCashbackCents(unitPriceCents, product.cashbackRateBps ?? DEFAULT_CASHBACK_RATE_BPS, quantity);
}

export function nextCashbackState(current: CashbackState, status: string, paymentStatus: string): CashbackState {
  const canceled = status === "CANCELED" || paymentStatus === "CANCELED" || paymentStatus === "REFUNDED";
  if (current === "CREDITED" && canceled) return "REVERSED";
  if (current !== "PENDING") return current;
  if (canceled) return "VOIDED";
  return status === "COMPLETED" && paymentStatus === "PAID" ? "CREDITED" : "PENDING";
}
