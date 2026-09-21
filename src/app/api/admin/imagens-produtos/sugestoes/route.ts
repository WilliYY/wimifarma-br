import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/features/auth/permissions";
import { analyzeProductPhoto, generateProductArtwork } from "@/features/product-images/suggestions";
import { ACCEPTED_PRODUCT_IMAGE_TYPES, MAX_PRODUCT_IMAGE_BYTES, ProductImageError } from "@/features/product-images/service";
import { isValidGtin } from "@/features/products/identity";
import { validateRemoteUrl } from "@/features/product-images/remote-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const activeUsers = new Set<string>();
const recentRequests = new Map<string, number[]>();
const inputSchema = z.object({
  name: z.string().trim().max(160), brand: z.string().trim().max(120),
  ean: z.string().trim().max(32).refine(value => !value || isValidGtin(value)),
  action: z.enum(["analyze", "studio", "editorial"]),
  referenceUrls: z.array(z.string().max(2048).refine(value => { try { validateRemoteUrl(value); return true; } catch { return false; } })).max(3).default([]),
});
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const userId = guard.session?.user?.id;
  if (!userId) return json({ error: "Entre novamente para analisar fotos." }, 401);
  if (!process.env.GEMINI_API_KEY) return json({ error: "O assistente de imagens ainda nao foi configurado." }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PRODUCT_IMAGE_BYTES + 64000) return json({ error: "Use uma foto de ate 10 MB." }, 413);
  const now = Date.now();
  for (const [key, dates] of recentRequests) if (!dates.some(date => now - date < 60000)) recentRequests.delete(key);
  const dates = (recentRequests.get(userId) ?? []).filter(date => now - date < 60000);
  if (activeUsers.has(userId) || dates.length >= 4 || activeUsers.size >= 3) return json({ error: "Uma analise esta em andamento ou o limite foi atingido. Aguarde antes de tentar novamente." }, 429);
  activeUsers.add(userId);
  recentRequests.set(userId, [...dates, now]);
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Envie uma foto." }, 422);
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_PRODUCT_IMAGE_BYTES + 64000) { await reader.cancel(); return json({ error: "Use uma foto de ate 10 MB." }, 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    let referenceUrls: unknown = [];
    try { referenceUrls = JSON.parse(String(form.get("referenceUrls") || "[]")); } catch { return json({ error: "Confira os links de referencia." }, 422); }
    const parsed = inputSchema.safeParse({ ...Object.fromEntries(["name", "brand", "ean", "action"].map(key => [key, form.get(key) ?? ""])), referenceUrls });
    const image = form.get("image");
    if (!parsed.success || !(image instanceof File) || !ACCEPTED_PRODUCT_IMAGE_TYPES.has(image.type) || !image.size || image.size > MAX_PRODUCT_IMAGE_BYTES) return json({ error: "Confira nome/EAN e envie JPG, PNG, WebP ou AVIF de ate 10 MB." }, 422);
    const bytes = Buffer.from(await image.arrayBuffer());
    const { action, referenceUrls: references, ...identity } = parsed.data;
    const options = { referenceUrls: references, apiKey: process.env.GEMINI_API_KEY, model: action === "analyze" ? process.env.GEMINI_MODEL || "gemini-2.5-flash" : process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image" };
    if (action === "analyze") return json({ data: await analyzeProductPhoto(bytes, identity, options) });
    return json({ data: await generateProductArtwork(bytes, identity, action, options) });
  } catch (error) {
    if (error instanceof ProductImageError) return json({ error: error.message }, error.status);
    // Do not log uploaded photos, provider responses or credentials.
    console.error("Falha no assistente de imagens", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Nao foi possivel concluir a sugestao agora. Sua foto foi preservada. Tente novamente." }, 502);
  } finally { activeUsers.delete(userId); }
}
