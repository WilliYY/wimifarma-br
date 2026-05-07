import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { customerCreateSchema } from "@/features/customers/schema";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: customers });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await request.json();
  const parsed = customerCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const customer = await prisma.customer.create({ data: parsed.data });

  return NextResponse.json({ data: customer }, { status: 201 });
}
