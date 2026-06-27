import { NextResponse } from "next/server";
import { adminUserStatusSchema } from "@/features/admin-users/schema";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const userSelect = {
  createdAt: true,
  email: true,
  id: true,
  isActive: true,
  lastLoginAt: true,
  name: true,
  role: true,
  updatedAt: true,
} as const;

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = adminUserStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  if (guard.session?.user.id === id && !parsed.data.isActive) {
    return NextResponse.json(
      { error: "Voce nao pode bloquear o proprio acesso." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    select: { id: true, role: true },
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Usuario administrativo nao encontrado." },
      { status: 404 },
    );
  }

  if (existing.role === "ADMIN" && !parsed.data.isActive) {
    const activeAdmins = await prisma.user.count({
      where: {
        id: { not: id },
        isActive: true,
        role: "ADMIN",
      },
    });

    if (activeAdmins === 0) {
      return NextResponse.json(
        { error: "Mantenha pelo menos um ADM ativo." },
        { status: 400 },
      );
    }
  }

  const user = await prisma.user.update({
    data: { isActive: parsed.data.isActive },
    select: userSelect,
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      action: parsed.data.isActive ? "ADMIN_USER_ACTIVATED" : "ADMIN_USER_BLOCKED",
      entity: "User",
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
      userId: persistedUserId(guard.session?.user.id),
    },
  });

  return NextResponse.json({ data: user });
}
