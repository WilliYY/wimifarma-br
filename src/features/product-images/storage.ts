import { constants } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";

export const productUploadsDirectory = () => path.join(process.cwd(), "public", "uploads", "products");
const UPLOAD_NAME = /^product-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
const missingImage = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function serveProductImage(request: Request, fileName: string, directory = productUploadsDirectory()) {
  if (!UPLOAD_NAME.test(fileName)) return missingImage();
  const file = await open(path.join(directory, fileName), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null);
  if (!file) return missingImage();
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size < 12 || stat.size > 10 * 1024 * 1024) return missingImage();
    const bytes = await file.readFile();
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return missingImage();
    const etag = `W/"${stat.size}-${stat.mtimeMs}"`;
    const headers = {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    };
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
  } finally { await file.close(); }
}
