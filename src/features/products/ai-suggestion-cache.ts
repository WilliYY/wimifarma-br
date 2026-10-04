import { createHash } from "node:crypto";
import type { ProductSuggestionRequest } from "./ai-suggestions";

export function productSuggestionCacheKey(input: ProductSuggestionRequest, model: string, apiKey: string): string {
  const credentialFingerprint = createHash("sha256").update(apiKey).digest("hex");
  return createHash("sha256").update(JSON.stringify({
    ean: input.ean, name: input.name, brand: input.brand,
    categories: input.knownCategories, model, credentialFingerprint,
  })).digest("hex");
}

export function createProductSuggestionCache<T extends { confidence: string }>(options: {
  now?: () => number;
  maxEntries?: number;
  maxInflight?: number;
} = {}) {
  const now = options.now ?? Date.now;
  const maxEntries = options.maxEntries ?? 128;
  const maxInflight = options.maxInflight ?? 20;
  const results = new Map<string, { data: T; expiresAt: number }>();
  const inflight = new Map<string, Promise<T>>();
  const pruneExpired = () => {
    for (const [entryKey, entry] of results) if (entry.expiresAt <= now()) results.delete(entryKey);
  };
  // Expired data is removed during idle periods too; this timer never holds the process open.
  setInterval(pruneExpired, 60_000).unref();

  return async function getSuggestion(key: string, load: () => Promise<T>): Promise<T> {
    pruneExpired();
    const cached = results.get(key);
    if (cached) {
      results.delete(key);
      results.set(key, cached);
      return structuredClone(cached.data);
    }
    const pending = inflight.get(key);
    if (pending) return structuredClone(await pending);
    if (inflight.size >= maxInflight) throw new Error("Pesquisa de produtos ocupada. Tente novamente em instantes.");

    const request = Promise.resolve().then(load).then(data => {
      // Keep an entry bounded even if a provider returns unusually large notes.
      if (maxEntries > 0 && Buffer.byteLength(JSON.stringify(data), "utf8") <= 256 * 1024) {
        while (results.size >= maxEntries) results.delete(results.keys().next().value!);
        results.set(key, { data: structuredClone(data), expiresAt: now() + (data.confidence === "high" ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000) });
      }
      return data;
    }).finally(() => { inflight.delete(key); });
    inflight.set(key, request);
    return structuredClone(await request);
  };
}
