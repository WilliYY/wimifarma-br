import { NextResponse } from "next/server";
import { adminUserStatusSchema } from "@/features/admin-users/schema";
import { AccessError, changeAccess, lockUserAccess } from "@/features/admin-users/directory";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  const parsed = adminUserStatusSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  try {
    const { id } = await params;
    const user = await getPrisma().$transaction(async tx => {
      await lockUserAccess(tx, guard.session!.user.id);
      const existing = await tx.user.findUnique({ where: { id } });
      if (!existing) throw new AccessError("Usuario nao encontrado.", 404);
      await changeAccess(tx, guard.session!.user.id, id, { kind: "staff", role: existing.role, isActive: parsed.data.isActive, version: existing.updatedAt.toISOString() });
      return tx.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true, lastLoginAt: true } });
    });
    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccessError ? error.message : "Nao foi possivel alterar o acesso." }, { status: error instanceof AccessError ? error.status : 503 });
  }
}
