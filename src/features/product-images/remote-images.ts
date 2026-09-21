import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

export function isPublicIpv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113));
}

export function validateRemoteUrl(value: string) {
  const url = new URL(value);
  if (value.length > 2048 || url.protocol !== "https:" || url.username || url.password
    || (url.port && url.port !== "443") || isIP(url.hostname) || url.hostname.includes(":")
    || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)
    || /\.(local|internal|localhost|test|invalid)$/i.test(url.hostname)) {
    throw new Error("Endereco de imagem nao permitido.");
  }
  return url;
}

export type RemoteAsset = { bytes: Buffer; contentType: string; url: string };

// Pin the validated DNS answer to this socket; validate every redirect again.
export async function downloadPublicAsset(value: string, maxBytes: number, redirects = 0): Promise<RemoteAsset> {
  const url = validateRemoteUrl(value);
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, family: 4 }),
    new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error("DNS demorou demais.")), 4000); timer.unref(); }),
  ]);
  if (!addresses.length || addresses.some(item => !isPublicIpv4(item.address))) throw new Error("Destino de rede nao permitido.");
  const address = addresses[0].address;
  return new Promise((resolve, reject) => {
    const req = request(url, {
      agent: false,
      family: 4,
      headers: { "User-Agent": "WimifarmaProductImages/1.0", Accept: "text/html,image/webp,image/png,image/jpeg;q=0.9", "Accept-Encoding": "identity" },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address, family: 4 }]);
        else callback(null, address, 4);
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy();
        if (redirects >= 3 || !response.headers.location) return reject(new Error("Redirecionamento nao permitido."));
        try { resolve(downloadPublicAsset(new URL(response.headers.location, url).toString(), maxBytes, redirects + 1)); }
        catch (error) { reject(error); }
        return;
      }
      if (status !== 200 || Number(response.headers["content-length"] ?? 0) > maxBytes) {
        response.destroy(); reject(new Error("Fonte indisponivel ou muito grande.")); return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) { response.destroy(new Error("Limite de download excedido.")); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ bytes: Buffer.concat(chunks), contentType: String(response.headers["content-type"] ?? ""), url: url.toString() }));
    });
    const timer = setTimeout(() => req.destroy(new Error("Fonte demorou demais.")), 7000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
}

function decodeEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function extractProductImageUrls(html: string, pageUrl: string) {
  const found: string[] = [];
  const add = (value: unknown) => {
    if (found.length >= 12) return;
    if (typeof value === "string") {
      try { const url = validateRemoteUrl(new URL(decodeEntities(value), pageUrl).toString()).toString(); if (!found.includes(url)) found.push(url); } catch { /* Untrusted metadata. */ }
    } else if (Array.isArray(value)) value.slice(0, 12).forEach(add);
    else if (value && typeof value === "object") { const image = value as Record<string, unknown>; add(image.contentUrl ?? image.url); }
  };
  const visit = (value: unknown, depth = 0) => {
    if (depth > 8 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.slice(0, 50).forEach(item => visit(item, depth + 1)); return; }
    const item = value as Record<string, unknown>;
    if ([item["@type"]].flat().includes("Product")) add(item.image);
    if (item["@graph"]) visit(item["@graph"], depth + 1);
    if (item.mainEntity) visit(item.mainEntity, depth + 1);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1])); } catch { /* Invalid source metadata. */ }
  }
  for (const match of html.matchAll(/<(?:meta|img)\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
    if (attrs.property === "og:image" || attrs.name === "twitter:image") add(attrs.content);
    if (/^<img/i.test(match[0]) && !/logo|icon|banner|avatar|loading|pixel/i.test(`${attrs.src} ${attrs.alt}`)) add(attrs["data-src"] || attrs.src);
    if (found.length >= 12) break;
  }
  return found.slice(0, 12);
}
