import type { Prisma } from "@/generated/prisma/client";
import { isShowcasePosition, SHOWCASE_SLOT_COUNT } from "@/features/offers/showcase";

export class ProductMutationError extends Error {
  constructor(message: string, public readonly status = 422) { super(message); }
}

export async function lockProductCatalog(transaction: Prisma.TransactionClient) {
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(87164322)::text`;
}

export async function resolveFeaturedPosition(transaction: Prisma.TransactionClient, input: {
  featured?: boolean; currentPosition?: number | null; status: string; imageUrl?: string | null;
}) {
  if (input.featured && (input.status !== "ACTIVE" || !input.imageUrl)) {
    throw new ProductMutationError("Publique o produto e adicione uma foto antes de destaca-lo.");
  }
  if (input.featured === false || input.status !== "ACTIVE" || !input.imageUrl) return null;
  if (isShowcasePosition(input.currentPosition ?? null)) return input.currentPosition!;
  if (!input.featured) return null;
  const products = await transaction.product.findMany({ select: { featuredPosition: true }, where: { featuredPosition: { gte: 1, lte: SHOWCASE_SLOT_COUNT } } });
  const positions = new Set(products.map(product => product.featuredPosition));
  for (let position = 1; position <= SHOWCASE_SLOT_COUNT; position++) if (!positions.has(position)) return position;
  throw new ProductMutationError("Os 10 destaques estao ocupados. Libere uma posicao em Ofertas ou salve sem destaque.", 409);
}
