import { z } from "zod";

export const SHOWCASE_SLOT_COUNT = 15;

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

export function arrangeShowcaseProducts<T extends { featuredPosition: number | null }>(
  products: T[],
) {
  const slots: Array<T | null> = Array.from(
    { length: SHOWCASE_SLOT_COUNT },
    () => null,
  );

  for (const product of products) {
    if (
      product.featuredPosition !== null &&
      product.featuredPosition >= 1 &&
      product.featuredPosition <= SHOWCASE_SLOT_COUNT
    ) {
      slots[product.featuredPosition - 1] = product;
    }
  }

  return slots;
}
