import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { bulkProductUpdateSchema, bulkRequiresAdmin } from "@/features/products/catalog-bulk";
import { updateCatalogBulk } from "@/features/products/catalog-bulk-service";
import { ProductMutationError } from "@/features/products/mutations";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function PATCH(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) {
    Object.entries(headers).forEach(([key, value]) => guard.response.headers.set(key, value));
    return guard.response;
  }
  try {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const expected = new URL(process.env.AUTH_URL || request.url).origin;
    if (!origin || origin !== expected || (fetchSite && !["same-origin", "none"].includes(fetchSite))) throw new ProductMutationError("Origem da solicitação inválida.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ProductMutationError("Envie JSON.", 415);
    const bytes = await readLimitedBody(request, { maxBytes: 16_000 });
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new ProductMutationError("Solicitação inválida."); }
    const parsed = bulkProductUpdateSchema.safeParse(raw);
    if (!parsed.success) throw new ProductMutationError("Confira o lote: até 50 produtos, versões atuais e somente os campos permitidos.");
    if (bulkRequiresAdmin(parsed.data.changes) && guard.session!.user.role !== "ADMIN") throw new ProductMutationError("Somente ADMIN pode alterar percentuais e benefícios.", 403);
    const data = await getPrisma().$transaction(tx => updateCatalogBulk(tx, parsed.data, guard.session!.user.id), { timeout: 15000 });
    return NextResponse.json({ data, count: data.length }, { headers });
  } catch (error) {
    const known = error instanceof ProductMutationError || error instanceof RequestBodyError;
    if (!known) console.error("Falha no lote de catálogo", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: known ? error.message : "Não foi possível salvar o lote. Atualize a lista antes de tentar novamente." }, { status: known ? error.status : 503, headers });
  }
}
