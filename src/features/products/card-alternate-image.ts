import { publicProductImageUrl, publicProductImageUrls } from "@/features/product-images/private-supplier-policy";
import type { ProductImageIdentity } from "./image-placeholder";
import { productGalleryImages } from "./gallery";

/** Only real, distinct public photos can preview the existing product gallery. */
export function productCardAlternateImage(product: ProductImageIdentity & { imageUrl?: string | null; imageUrls?: readonly string[] }) {
  const cover = publicProductImageUrl(product)?.trim();
  if (!cover || cover.startsWith("/brand/")) return undefined;
  return productGalleryImages(cover, publicProductImageUrls(product))
    .find(url => url !== cover && !url.startsWith("/brand/"));
}
