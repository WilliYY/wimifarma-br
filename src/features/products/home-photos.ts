import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const photoChecks = new Map<string, { version: string; result: Promise<boolean> }>();
const maxPhotoChecks = 4096;
const versionOf = (file: Awaited<ReturnType<typeof stat>>) =>
  [file.dev, file.ino, file.size, file.mtimeMs, file.ctimeMs].join(":");

async function validPhoto(filePath: string) {
  try {
    // Still stat on every request: replacement, edits, deletion and permission changes invalidate the cache.
    const file = await stat(filePath);
    if (!file.isFile() || file.size > 10 * 1024 * 1024) { photoChecks.delete(filePath); return false; }
    const version = versionOf(file);
    const cached = photoChecks.get(filePath);
    if (cached?.version === version) return cached.result;
    const result = (async () => {
      const photo = sharp(await readFile(filePath), { limitInputPixels: 40_000_000 });
      const metadata = await photo.metadata();
      if (!metadata.width || !metadata.height || !["webp", "png", "jpeg", "avif", "heif"].includes(metadata.format ?? "")) return false;
      // Metadata can survive a truncated file; fully decode before caching eligibility.
      await photo.resize(1, 1).raw().toBuffer();
      return versionOf(await stat(filePath)) === version;
    })().catch(() => false);
    photoChecks.set(filePath, { version, result });
    void result.then(valid => {
      if (!valid && photoChecks.get(filePath)?.result === result) photoChecks.delete(filePath);
    });
    if (photoChecks.size > maxPhotoChecks) photoChecks.delete(photoChecks.keys().next().value!);
    return result;
  } catch { photoChecks.delete(filePath); return false; }
}

/** Only local public product photos are eligible; private, illustrative and remote URLs are excluded. */
export async function validatedHomePhotos(urls: readonly (string | null)[], publicDirectory = path.join(process.cwd(), "public")) {
  const valid = new Set<string>();
  const candidates = [...new Set(urls.filter((url): url is string => Boolean(url)))].filter(url =>
    /^\/(uploads\/products|banners\/products)\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g|avif)$/.test(url));
  for (let offset = 0; offset < candidates.length; offset += 8) {
    await Promise.all(candidates.slice(offset, offset + 8).map(async url => {
      if (await validPhoto(path.resolve(publicDirectory, url.slice(1)))) valid.add(url);
    }));
  }
  return valid;
}
