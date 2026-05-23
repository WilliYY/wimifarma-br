import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { decryptValue } from "@/lib/secret-vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  const { id } = await context.params;
  const prisma = getPrisma();
  const credential = await prisma.secretCredential.findUnique({
    where: { id },
  });

  if (!credential) {
    return NextResponse.json(
      { error: "Credencial nao encontrada." },
      { status: 404 },
    );
  }

  let secret = "";
  let notes: string | null = null;

  try {
    secret = decryptValue({
      ciphertext: credential.secretCiphertext,
      iv: credential.secretIv,
      tag: credential.secretTag,
    });

    if (credential.notesCiphertext && credential.notesIv && credential.notesTag) {
      notes = decryptValue({
        ciphertext: credential.notesCiphertext,
        iv: credential.notesIv,
        tag: credential.notesTag,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel abrir esta credencial." },
      { status: 500 },
    );
  }

  await prisma.secretCredential.update({
    data: {
      lastViewedAt: new Date(),
      updatedById: guard.session?.user.id,
    },
    where: { id },
  });
  await prisma.auditLog.create({
    data: {
      action: "SECRET_CREDENTIAL_REVEALED",
      entity: "SecretCredential",
      entityId: credential.id,
      metadata: {
        service: credential.service,
        title: credential.title,
      },
      userId: persistedUserId(guard.session?.user.id),
    },
  });

  return NextResponse.json({
    data: {
      id: credential.id,
      notes,
      secret,
    },
  });
}
