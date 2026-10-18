export const MAX_PRODUCT_IMAGES = 6;

/** The scalar cover remains first for legacy cards and checkout. */
export function productGalleryImages(imageUrl?: string | null, imageUrls: readonly string[] = []) {
  return [...new Set([imageUrl, ...imageUrls].filter((url): url is string => Boolean(url?.trim())).map(url => url.trim()))];
}
