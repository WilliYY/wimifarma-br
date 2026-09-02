import { z } from "zod";

const productFieldsSchema = z.object({
  brand: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  description: z.string().max(800).optional(),
  ean: z.string().max(32).optional(),
  imageUrl: z.string().max(300).optional(),
  imageAssetId: z.string().max(40).optional(),
  isPopularPharmacy: z.boolean().default(false),
  name: z.string().min(3).max(160),
  price: z.coerce.number().positive(),
  promotionalPrice: z.coerce.number().positive().optional(),
  requiresPrescription: z.boolean().default(false),
  sku: z.string().max(80).optional(),
  slug: z.string().min(3).max(120).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  stock: z.coerce.number().int().min(0).default(0),
});

const validPromotionalPrice = (product: { price: number; promotionalPrice?: number | null }) =>
  !product.promotionalPrice || product.promotionalPrice <= product.price;

const promotionalPriceError = {
  message: "O preco promocional nao pode ser maior que o preco normal.",
  path: ["promotionalPrice"],
};

export const productCreateSchema = productFieldsSchema.refine(
  validPromotionalPrice,
  promotionalPriceError,
);

export const productUpdateSchema = productFieldsSchema
  .omit({ slug: true })
  .extend({
    brand: z.string().max(120).nullable().optional(),
    category: z.string().max(120).nullable().optional(),
    description: z.string().max(800).nullable().optional(),
    ean: z.string().max(32).nullable().optional(),
    expectedUpdatedAt: z.iso.datetime(),
    promotionalPrice: z.coerce.number().positive().nullable().optional(),
    sku: z.string().max(80).nullable().optional(),
  })
  .refine(
  (product) =>
    validPromotionalPrice(product),
    promotionalPriceError,
  );
