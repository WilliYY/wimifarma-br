import { z } from "zod";

export const SHOWCASE_SLOT_COUNT = 10;

export type PublicShowcaseProduct = {
  brand: string | null;
  category: string | null;
  description: string | null;
  featuredPosition: number;
  id: string;
  imageUrl: string;
  name: string;
  price: string;
  promotionalPrice: string | null;
};

export const showcaseSelectionSchema = z
  .object({
    productIds: z
      .array(z.string().min(1).max(40).nullable())
      .length(SHOWCASE_SLOT_COUNT),
  })
  .superRefine(({ productIds }, context) => {
    const selectedIds = productIds.filter((productId): productId is string => Boolean(productId));

    if (new Set(selectedIds).size !== selectedIds.length) {
      context.addIssue({
        code: "custom",
        message: "O mesmo produto nao pode ocupar mais de uma posicao.",
        path: ["productIds"],
      });
    }
  });

export function isShowcasePosition(position: number | null): position is number {
  return position !== null && position >= 1 && position <= SHOWCASE_SLOT_COUNT;
}

export function arrangeShowcaseProducts<T extends { featuredPosition: number | null }>(
  products: T[],
) {
  const slots: Array<T | null> = Array.from(
    { length: SHOWCASE_SLOT_COUNT },
    () => null,
  );

  for (const product of products) {
    if (isShowcasePosition(product.featuredPosition)) {
      slots[product.featuredPosition - 1] = product;
    }
  }

  return slots;
}

export function productIdsFromShowcase<
  T extends { featuredPosition: number | null; id: string },
>(products: T[]) {
  return arrangeShowcaseProducts(products).map((product) => product?.id ?? null);
}

export function updateShowcaseProduct(
  currentProductIds: Array<string | null>,
  productId: string,
  shouldFeature: boolean,
) {
  const nextProductIds = currentProductIds.map((selectedId) =>
    selectedId === productId ? null : selectedId,
  );

  if (!shouldFeature) return nextProductIds;

  const availablePosition = nextProductIds.findIndex((selectedId) => selectedId === null);
  if (availablePosition === -1) return null;

  nextProductIds[availablePosition] = productId;
  return nextProductIds;
}
