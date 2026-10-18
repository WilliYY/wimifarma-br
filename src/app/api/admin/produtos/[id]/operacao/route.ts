import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { quickProductUpdateSchema } from "@/features/products/catalog-operations";
import { updateCatalogOperations } from "@/features/products/catalog-operations-service";
import { ProductMutationError } from "@/features/products/mutations";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  const parsed = quickProductUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Confira a classificação, os valores e o percentual (0 a 100%)." }, { status: 422, headers });
  const { id } = await params;
  try {
    const data = await getPrisma().$transaction(tx => updateCatalogOperations(tx, id, parsed.data, guard.session!.user.id), { timeout: 10000 });
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    if (!(error instanceof ProductMutationError)) console.error("Falha no ajuste de catálogo", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: error instanceof ProductMutationError ? error.message : "Não foi possível salvar. Atualize a lista antes de tentar novamente." }, { status: error instanceof ProductMutationError ? error.status : 503, headers });
  }
}
