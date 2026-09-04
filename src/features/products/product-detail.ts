import { z } from "zod";

const IVATE_POSTAL_CODE_START = 87_525_000;
const IVATE_POSTAL_CODE_END = 87_527_999;

export const productReviewInputSchema = z.object({
  comment: z.string().trim().min(10).max(600),
  rating: z.coerce.number().int().min(1).max(5),
});

export type DeliveryAvailability = {
  available: boolean;
  normalizedPostalCode: string;
  title: string;
};

export function normalizePostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatPostalCode(value: string) {
  const normalized = normalizePostalCode(value);
  if (normalized.length <= 5) return normalized;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function getDeliveryAvailability(value: string): DeliveryAvailability {
  const normalizedPostalCode = normalizePostalCode(value);

  if (normalizedPostalCode.length !== 8) {
    return {
      available: false,
      normalizedPostalCode,
      title: "Digite um CEP com 8 numeros",
    };
  }

  const postalCode = Number(normalizedPostalCode);
  const available = postalCode >= IVATE_POSTAL_CODE_START && postalCode <= IVATE_POSTAL_CODE_END;

  return {
    available,
    normalizedPostalCode,
    title: available
      ? "Entrega gratis em Ivate"
      : "Entrega pelo site ainda nao disponivel para este CEP",
  };
}

export function publicReviewerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente Wimifarma";
  if (parts.length === 1) return parts[0].slice(0, 40);
  return `${parts[0].slice(0, 30)} ${parts.at(-1)?.charAt(0).toUpperCase()}.`;
}

export function summarizeProductReviews(ratings: number[]) {
  const distribution = [0, 0, 0, 0, 0];
  let sum = 0;

  for (const rating of ratings) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    distribution[rating - 1] += 1;
    sum += rating;
  }

  const count = distribution.reduce((total, current) => total + current, 0);
  return {
    average: count === 0 ? null : Math.round((sum / count) * 10) / 10,
    count,
    distribution,
  };
}
