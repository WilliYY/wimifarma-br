import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { secretCredentialCreateSchema } from "@/features/secrets/schema";
import { getPrisma } from "@/lib/prisma";
import { encryptOptionalValue, encryptValue } from "@/lib/secret-vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const credentialSelect = {
  createdAt: true,
  createdById: true,
  id: true,
  identifier: true,
  lastViewedAt: true,
  service: true,
  title: true,
  updatedAt: true,
} as const;

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

export async function GET() {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const credentials = await prisma.secretCredential.findMany({
    orderBy: { updatedAt: "desc" },
    select: credentialSelect,
    take: 100,
  });

  return NextResponse.json({ data: credentials });
}

export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const parsed = secretCredentialCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const secret = encryptValue(parsed.data.secret);
  const notes = encryptOptionalValue(parsed.data.notes);
  const prisma = getPrisma();
  const credential = await prisma.secretCredential.create({
    data: {
      createdById: guard.session?.user.id,
      identifier: parsed.data.identifier?.trim() || null,
      notesCiphertext: notes?.ciphertext,
      notesIv: notes?.iv,
      notesTag: notes?.tag,
      secretCiphertext: secret.ciphertext,
      secretIv: secret.iv,
      secretTag: secret.tag,
      service: parsed.data.service?.trim() || null,
      title: parsed.data.title,
      updatedById: guard.session?.user.id,
    },
    select: credentialSelect,
  });

  await prisma.auditLog.create({
    data: {
      action: "SECRET_CREDENTIAL_CREATED",
      entity: "SecretCredential",
      entityId: credential.id,
      metadata: {
        service: credential.service,
        title: credential.title,
      },
      userId: persistedUserId(guard.session?.user.id),
    },
  });

  return NextResponse.json({ data: credential }, { status: 201 });
}
