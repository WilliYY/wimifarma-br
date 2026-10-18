import type { Prisma } from "@/generated/prisma/client";
import { isShowcasePosition, SHOWCASE_SLOT_COUNT } from "@/features/offers/showcase";
import { MAX_PRODUCT_IMAGES, productGalleryImages } from "./gallery";
import { isPrivateSupplierImageUrl } from "@/features/product-images/private-supplier-policy";

export class ProductMutationError extends Error {
  constructor(message: string, public readonly status = 422) { super(message); }
}

export async function lockProductCatalog(transaction: Prisma.TransactionClient) {
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(87164322)::text`;
}

/** Caller holds the catalog lock, shared with library deletion. */
export async function resolveProductGallery(transaction: Prisma.TransactionClient, cover: string | null | undefined, urls: readonly string[]) {
  const gallery = productGalleryImages(cover, urls);
  if (gallery.length > MAX_PRODUCT_IMAGES) throw new ProductMutationError("Selecione no máximo seis fotos por produto.");
  const extras = gallery.filter(url => url !== cover?.trim());
  if (extras.some(isPrivateSupplierImageUrl)) throw new ProductMutationError("A galeria aceita somente fotos públicas da biblioteca.");
  if (!extras.length) return [];
  const images = await transaction.productImage.findMany({ where: { url: { in: extras } }, select: { url: true } });
  const existing = new Set(images.map(image => image.url));
  if (extras.some(url => !existing.has(url))) throw new ProductMutationError("Uma foto da galeria não existe mais na biblioteca. Selecione novamente.", 409);
  return extras;
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
