import { NextResponse } from "next/server";
import type { z } from "zod";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { RestockError } from "./contracts";

export const restockHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
type RestockOperation = "customer_get" | "customer_post" | "customer_delete" | "admin_get" | "admin_post" | "admin_patch" | "unknown";
export function restockFailure(error: unknown, operation: RestockOperation = "unknown") {
  const expected = error instanceof RestockError || error instanceof RequestBodyError;
  const status = expected ? error.status : 503;
  if (!expected) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : "UNKNOWN";
    console.error("RESTOCK_FAILURE", { operation, code });
  }
  const message = error instanceof RestockError ? error.message : "Não foi possível processar o aviso. Tente novamente.";
  return NextResponse.json({ message }, { status, headers: restockHeaders });
}
export function assertRestockOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) throw new RestockError("Solicitação não autorizada.", 403);
  const origin = request.headers.get("origin");
  if (origin) {
    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || url.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.slice(0, -1);
    try { if (new URL(origin).origin !== new URL(`${protocol}://${host}`).origin) throw new Error(); }
    catch { throw new RestockError("Solicitação não autorizada.", 403); }
  }
}
export async function restockBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const bytes = await readLimitedBody(request, { maxBytes: 4096 });
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RestockError("Solicitação inválida.", 422); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new RestockError("Solicitação inválida.", 422);
  return parsed.data;
}
