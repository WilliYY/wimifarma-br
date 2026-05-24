import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { customerPublicRegisterSchema } from "@/features/customers/schema";
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

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = customerPublicRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const existingCustomer = await prisma.customer.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingCustomer) {
    return NextResponse.json(
      {
        message:
          "Este email ja possui cadastro. Entre na conta ou crie uma senha pela area do cliente.",
      },
      { status: 409 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    const customer = await prisma.customer.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        passwordSetAt: new Date(),
        phone: parsed.data.phone,
      },
      select: {
        email: true,
        id: true,
        name: true,
      },
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "Email ou telefone ja cadastrado." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar a conta agora." },
      { status: 500 },
    );
  }
}
