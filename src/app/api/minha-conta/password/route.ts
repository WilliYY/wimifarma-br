import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { customerPasswordSchema } from "@/features/customers/schema";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = customerPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    select: { id: true, passwordHash: true },
    where: { id: session.user.id },
  });

  if (!customer) {
    return NextResponse.json({ message: "Cliente nao encontrado." }, { status: 404 });
  }

  if (customer.passwordHash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json(
        { message: "Informe sua senha atual para trocar a senha." },
        { status: 400 },
      );
    }

    const currentPasswordMatches = await compare(
      parsed.data.currentPassword,
      customer.passwordHash,
    );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        { message: "Senha atual incorreta." },
        { status: 400 },
      );
    }
  }

  await prisma.customer.update({
    data: {
      passwordHash: await hash(parsed.data.password, 12),
      passwordSetAt: new Date(),
    },
    where: { id: customer.id },
  });

  return NextResponse.json({ ok: true });
}
