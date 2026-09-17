import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { accessSchema, AccessError, changeAccess } from "@/features/admin-users/directory";
import { getPrisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  const parsed = accessSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Dados de acesso invalidos." }, { status: 422 });
  try {
    const { id } = await params;
    await getPrisma().$transaction(tx => changeAccess(tx, guard.session!.user.id, id, parsed.data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (!(error instanceof AccessError)) console.error("USER_ACCESS_SAVE_FAILED", error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN");
    return NextResponse.json({ error: error instanceof AccessError ? error.message : "Nao foi possivel alterar o acesso. Atualize a lista." }, { status: error instanceof AccessError ? error.status : 503 });
  }
}
