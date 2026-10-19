import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

/** Only local public product photos are eligible; private, illustrative and remote URLs are excluded. */
export async function validatedHomePhotos(urls: readonly (string | null)[], publicDirectory = path.join(process.cwd(), "public")) {
  const valid = new Set<string>();
  const candidates = [...new Set(urls.filter((url): url is string => Boolean(url)))].filter(url =>
    /^\/(uploads\/products|banners\/products)\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g|avif)$/.test(url));
  for (let offset = 0; offset < candidates.length; offset += 8) {
    await Promise.all(candidates.slice(offset, offset + 8).map(async url => {
      try {
        const filePath = path.join(publicDirectory, url.slice(1));
        const file = await stat(filePath);
        if (!file.isFile() || file.size > 10 * 1024 * 1024) return;
        const photo = sharp(await readFile(filePath), { limitInputPixels: 40_000_000 });
        const metadata = await photo.metadata();
        if (!metadata.width || !metadata.height || !["webp", "png", "jpeg", "avif", "heif"].includes(metadata.format ?? "")) return;
        // Metadata can survive a truncated file; decode before admitting a photo.
        await photo.resize(1, 1).raw().toBuffer();
        valid.add(url);
      } catch { /* Missing or invalid files stay out of the homepage only. */ }
    }));
  }
  return valid;
}
