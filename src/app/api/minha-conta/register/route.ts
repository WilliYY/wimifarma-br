import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { customerPublicRegisterSchema } from "@/features/customers/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { auditClubAutoEnrollment } from "@/features/club/membership";

export const dynamic = "force-dynamic";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = customerPublicRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    await getPrisma().$transaction(async tx => {
      const created = await tx.customer.create({
        data: {
          city: "",
          clubMembership: { create: {} },
          email: parsed.data.email,
          name: parsed.data.name,
          passwordHash,
          passwordSetAt: new Date(),
          phone: parsed.data.phone,
        },
        select: { id: true },
      });
      await auditClubAutoEnrollment(tx, created.id);
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "Não foi possível concluir o cadastro agora." },
        { status: 500 },
      );
    }
  }

  // A public registration response must not confirm which accounts exist.
  return NextResponse.json(
    { message: "Recebemos seus dados. Entre com seu e-mail e senha ou recupere o acesso." },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
