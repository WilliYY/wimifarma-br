import { medicineIllustrationUrl, type ProductImageIdentity } from "@/features/products/image-placeholder";

export const PRIVATE_SUPPLIER_IMAGE_PREFIX = "/api/admin/fornecedores/imagens/";
export const PRIVATE_SUPPLIER_IMAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function isPrivateSupplierImageUrl(value: string | null | undefined) {
  if (!value) return false;
  if (value.startsWith(PRIVATE_SUPPLIER_IMAGE_PREFIX)) return true;
  try { return new URL(value, "https://internal.invalid").pathname.startsWith(PRIVATE_SUPPLIER_IMAGE_PREFIX); }
  catch { return false; }
}

export function privateSupplierImageAllowed(imageUrl: string | null | undefined, inventorySource: string | undefined, requiresPrescription: boolean) {
  if (!isPrivateSupplierImageUrl(imageUrl)) return true;
  return inventorySource === "DISTRIBUTOR" && requiresPrescription && imageUrl!.startsWith(PRIVATE_SUPPLIER_IMAGE_PREFIX) &&
    PRIVATE_SUPPLIER_IMAGE_NAME.test(imageUrl!.slice(PRIVATE_SUPPLIER_IMAGE_PREFIX.length));
}

/** Public DTOs and external inference must never receive an internal image URL. */
export function publicProductImageUrl(product: { imageUrl?: string | null; inventorySource?: string } & ProductImageIdentity) {
  if (product.requiresPrescription) return medicineIllustrationUrl(product);
  return isPrivateSupplierImageUrl(product.imageUrl)
    ? null : product.imageUrl ?? null;
}

export function publicProductImageUrls(product: { imageUrls?: readonly string[]; inventorySource?: string; requiresPrescription?: boolean }) {
  if (product.requiresPrescription) return [];
  return [...new Set((product.imageUrls ?? []).filter(url => !isPrivateSupplierImageUrl(url)))];
}
