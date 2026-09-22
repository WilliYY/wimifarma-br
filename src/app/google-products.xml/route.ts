import { createMerchantFeedStream } from "@/features/products/merchant-feed";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const stream = await createMerchantFeedStream(getPrisma());
    return new Response(stream, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Catálogo temporariamente indisponível. Tente novamente.", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } }); }
}
