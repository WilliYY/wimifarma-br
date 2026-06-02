import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { whatsappContactCreateSchema } from "@/features/whatsapp/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const contacts = await prisma.whatsAppContact.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: contacts });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = whatsappContactCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const contact = await prisma.whatsAppContact.create({ data: parsed.data });

  return NextResponse.json({ data: contact }, { status: 201 });
}
