import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  const { id } = await context.params;
  const prisma = getPrisma();
  const credential = await prisma.secretCredential.findUnique({
    select: {
      id: true,
      service: true,
      title: true,
    },
    where: { id },
  });

  if (!credential) {
    return NextResponse.json(
      { error: "Credencial nao encontrada." },
      { status: 404 },
    );
  }

  await prisma.secretCredential.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      action: "SECRET_CREDENTIAL_DELETED",
      entity: "SecretCredential",
      entityId: credential.id,
      metadata: {
        service: credential.service,
        title: credential.title,
      },
      userId: persistedUserId(guard.session?.user.id),
    },
  });

  return NextResponse.json({ ok: true });
}
