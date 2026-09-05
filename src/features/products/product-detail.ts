import { z } from "zod";

const IVATE_POSTAL_CODE_START = 87_525_000;
const IVATE_POSTAL_CODE_END = 87_527_999;
const SITE_URL = "https://wimifarma.com.br";
const META_DESCRIPTION_MAX_LENGTH = 160;

export const productReviewInputSchema = z.object({
  comment: z.string().trim().min(10).max(600),
  rating: z.coerce.number().int().min(1).max(5),
});

export type DeliveryAvailability = {
  available: boolean;
  normalizedPostalCode: string;
  title: string;
};

type ProductMetaDescriptionInput = {
  brand: string | null;
  description: string | null;
  name: string;
};

type ProductStructuredDataInput = ProductMetaDescriptionInput & {
  ean: string | null;
  imageUrl: string | null;
  price: number;
  rating: {
    average: number | null;
    count: number;
  };
  sku: string | null;
  slug: string;
  stock: number;
};

function normalizeInlineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function finishMetaDescription(value: string) {
  const normalized = normalizeInlineText(value);
  if (normalized.length <= META_DESCRIPTION_MAX_LENGTH) {
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  }

  const clipped = normalized.slice(0, META_DESCRIPTION_MAX_LENGTH - 1);
  const lastSentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  if (lastSentenceEnd >= 100) return clipped.slice(0, lastSentenceEnd + 1);

  const lastSpace = clipped.lastIndexOf(" ");
  const safeCut = lastSpace >= 100 ? lastSpace : clipped.length;
  return `${clipped.slice(0, safeCut).replace(/[,:;\-\s]+$/g, "")}.`;
}

export function buildProductMetaDescription({ brand, description, name }: ProductMetaDescriptionInput) {
  const productName = normalizeInlineText(name);
  const productBrand = brand ? normalizeInlineText(brand) : "";
  const productDescription = description ? normalizeInlineText(description) : "";

  if (productDescription) {
    const includesName = productDescription.toLocaleLowerCase("pt-BR").includes(productName.toLocaleLowerCase("pt-BR"));
    return finishMetaDescription(includesName ? productDescription : `${productName}. ${productDescription}`);
  }

  const brandedName = productBrand ? `${productName} da ${productBrand}` : productName;
  return finishMetaDescription(
    `${brandedName} na Wimifarma em Ivate-PR. Consulte preco, disponibilidade e opcoes de entrega ou retirada.`,
  );
}

function absoluteProductImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl, SITE_URL);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildProductStructuredData(input: ProductStructuredDataInput) {
  const productUrl = `${SITE_URL}/produto/${encodeURIComponent(input.slug)}`;
  const imageUrl = absoluteProductImageUrl(input.imageUrl);
  const normalizedEan = input.ean?.replace(/\D/g, "") ?? "";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    aggregateRating:
      input.rating.average !== null && input.rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: input.rating.average,
            reviewCount: input.rating.count,
          }
        : undefined,
    brand: input.brand
      ? {
          "@type": "Brand",
          name: normalizeInlineText(input.brand),
        }
      : undefined,
    description: buildProductMetaDescription(input),
    gtin13: normalizedEan.length === 13 ? normalizedEan : undefined,
    image: imageUrl ? [imageUrl] : undefined,
    name: normalizeInlineText(input.name),
    offers: {
      "@type": "Offer",
      availability: input.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      price: input.price.toFixed(2),
      priceCurrency: "BRL",
      seller: {
        "@type": "Organization",
        name: "Wimifarma",
      },
      url: productUrl,
    },
    sku: input.sku ? normalizeInlineText(input.sku) : undefined,
    url: productUrl,
  };
}

export function serializeProductStructuredData(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

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
