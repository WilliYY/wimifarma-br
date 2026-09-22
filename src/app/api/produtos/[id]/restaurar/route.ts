import { requireAdminApi } from "@/features/auth/permissions";
import { productTrashMutationSchema } from "@/features/products/trash-policy";
import { restoreTrashedProduct } from "@/features/products/trash-service";
import { ProductMutationError } from "@/features/products/mutations";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  if (!guard.session?.user) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = productTrashMutationSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return Response.json({ error: "Reabra a lixeira para confirmar a versão do produto." }, { status: 422 });
  const { id } = await params;
  const userId = guard.session.user.id;
  try {
    const data = await getPrisma().$transaction(tx => restoreTrashedProduct(tx, id, new Date(parsed.data.expectedUpdatedAt), userId), { timeout: 10000 });
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof ProductMutationError ? error.message : "Não foi possível restaurar o produto." }, { status: error instanceof ProductMutationError ? error.status : 503 });
  }
}
