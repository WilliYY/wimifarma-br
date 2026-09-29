import { NextResponse } from "next/server";
import { ShippingError } from "./schema";

export const noStore = { "Cache-Control": "private, no-store" };
export function shippingFailure(error: unknown) {
  return NextResponse.json({ error: error instanceof ShippingError ? error.message : "Não foi possível concluir a operação de frete. Tente novamente." }, { status: error instanceof ShippingError ? error.status : 503, headers: noStore });
}
export async function shippingBody(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.AUTH_URL || request.url).origin;
  if (!origin || origin !== expected) throw new ShippingError("Origem da solicitação inválida.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ShippingError("Envie JSON.", 415);
  const bytes = await request.text();
  if (bytes.length > 32_000) throw new ShippingError("Solicitação muito grande.", 413);
  try { return JSON.parse(bytes) as unknown; } catch { throw new ShippingError("JSON inválido.", 400); }
}
const requests = new Map<string, { expires: number; count: number }>();
export function limitShippingRequest(request: Request) {
  const now = Date.now();
  for (const [key, entry] of requests) if (entry.expires <= now) requests.delete(key);
  const key = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
  const entry = requests.get(key);
  if ((entry?.count ?? 0) >= 15 || (!entry && requests.size >= 2000)) throw new ShippingError("Muitas consultas. Aguarde um minuto e tente novamente.", 429);
  requests.set(key, { expires: entry?.expires ?? now + 60_000, count: (entry?.count ?? 0) + 1 });
}
