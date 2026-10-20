import type { Prisma } from "@/generated/prisma/client";
import { ProductMutationError } from "./mutations";
import { productIdentityKey } from "./identity";
import { readClassification } from "./catalog-operations";

type PhotoProduct = {
  id?: string; inventorySource?: string; status: string; requiresPrescription: boolean;
  isPopularPharmacy?: boolean; imageUrl?: string | null; imageAssetId?: string | null;
  catalogClassification?: unknown;
  name?: string; brand?: string | null; ean?: string | null; prescriptionType?: string;
  imageUrls?: readonly string[];
};

export function importedProductStatus(product: { requiresPrescription: boolean }) {
  return product.requiresPrescription ? "ACTIVE" : "DRAFT";
}

function requiresPublicPhoto(product: PhotoProduct) {
  const kind = readClassification(product.catalogClassification).kind;
  return !product.requiresPrescription && !product.isPopularPharmacy &&
    (product.inventorySource === "DISTRIBUTOR" || kind === "HYGIENE" || kind === "PERFUMERY");
}

export function productPhotoReview(product: PhotoProduct) {
  return { version: 1, identityKey: productIdentityKey({ name: product.name ?? "", brand: product.brand ?? "", ean: product.ean ?? "" }),
    inventorySource: product.inventorySource ?? "PHARMACY", requiresPrescription: product.requiresPrescription,
    prescriptionType: product.prescriptionType ?? "UNREVIEWED", isPopularPharmacy: product.isPopularPharmacy ?? false,
    classificationKey: JSON.stringify(readClassification(product.catalogClassification)),
    imageAssetId: product.imageAssetId ?? null, imageUrl: product.imageUrl ?? null, imageUrls: [...product.imageUrls ?? []] };
}

/** Caller holds the catalog/product locks. ADMIN selection is audited by the same transaction. */
export async function validatePhotoPublication(tx: Prisma.TransactionClient, current: PhotoProduct | null,
  next: PhotoProduct, reviewedByAdmin = false) {
  if (!requiresPublicPhoto(next)) return;
  const review = productPhotoReview(next);
  const galleryChanged = current && JSON.stringify(current.imageUrls ?? []) !== JSON.stringify(next.imageUrls ?? []);
  const imageChanged = current && (current.imageUrl !== next.imageUrl || current.imageAssetId !== next.imageAssetId || galleryChanged);
  const identityChanged = current && productPhotoReview(current).identityKey !== review.identityKey;
  const classificationChanged = current && JSON.stringify(current.catalogClassification) !== JSON.stringify(next.catalogClassification);
  const publishing = !current || current.status !== "ACTIVE" || !requiresPublicPhoto(current) || classificationChanged || identityChanged;
  if (imageChanged && !reviewedByAdmin && (galleryChanged || next.imageUrl || next.imageAssetId)) {
    throw new ProductMutationError("Somente ADMIN pode revisar e alterar as fotos desta apresentação.", 403);
  }
  if (next.status !== "ACTIVE" && (!reviewedByAdmin || !next.imageAssetId || !next.imageUrl)) return;
  // Legacy active products may still receive price/offer edits while their photos are reviewed.
  if (!publishing && !imageChanged && !reviewedByAdmin) return;
  if (!next.imageAssetId || !next.imageUrl?.startsWith("/uploads/products/") ||
    !await tx.productImage.findFirst({ where: { id: next.imageAssetId, url: next.imageUrl }, select: { id: true } })) {
    throw new ProductMutationError("Adicione uma foto pública da biblioteca antes de publicar. Para remover a foto, salve como rascunho.");
  }
  for (const url of next.imageUrls ?? []) {
    if (!url.startsWith("/uploads/products/") || !await tx.productImage.findFirst({ where: { url }, select: { id: true } })) {
      throw new ProductMutationError("A galeria exige fotos públicas válidas da biblioteca.");
    }
  }
  if (reviewedByAdmin) return review;
  const reviewed = current?.id && await tx.auditLog.findFirst({ where: {
    entity: "Product", entityId: current.id, user: { role: "ADMIN" },
    action: { in: ["PRODUCT_CREATED", "PRODUCT_UPDATED", "SUPPLIER_CATALOG_IMAGE_PUBLISHED"] },
    metadata: { path: ["photoReview"], equals: review },
  }, select: { id: true } });
  if (!reviewed) throw new ProductMutationError("A foto precisa ser conferida e associada por ADMIN antes da publicação.", 403);
}
