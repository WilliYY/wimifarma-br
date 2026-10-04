import { NextResponse } from "next/server";
import { PaymentError } from "./schema";
export const paymentHeaders = { "Cache-Control": "private, no-store" };
export function paymentFailure(error: unknown) {
  return NextResponse.json({ error: error instanceof PaymentError ? error.message : "Não foi possível concluir a operação de pagamento." }, { status: error instanceof PaymentError ? error.status : 503, headers: paymentHeaders });
}
export async function paymentJson(request: Request, maxBytes = 16_000) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(process.env.AUTH_URL || request.url).origin) throw new PaymentError("Origem inválida.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PaymentError("Envie JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new PaymentError("Solicitação vazia.", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new PaymentError("Solicitação muito grande.", 413); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; } catch { throw new PaymentError("JSON inválido.", 400); }
}
const requests = new Map<string, { time: number; count: number }>();
export function limitPaymentRequest(request: Request, scope: string, max = 20) {
  const now = Date.now(); for (const [key, entry] of requests) if (entry.time < now) requests.delete(key);
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
  const key = `${scope}:${ip}`; const entry = requests.get(key);
  if ((entry?.count ?? 0) >= max || (!entry && requests.size >= 5000)) throw new PaymentError("Aguarde um minuto antes de consultar novamente.", 429);
  requests.set(key, { time: entry?.time ?? now + 60_000, count: (entry?.count ?? 0) + 1 });
}
