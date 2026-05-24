import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { customerProfileUpdateSchema } from "@/features/customers/schema";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = customerProfileUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();

  try {
    const customer = await prisma.customer.update({
      data: parsed.data,
      select: {
        address: true,
        city: true,
        id: true,
        name: true,
        neighborhood: true,
        notes: true,
        phone: true,
      },
      where: { id: session.user.id },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "Este telefone ja esta em outro cadastro." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel salvar seus dados agora." },
      { status: 500 },
    );
  }
}
