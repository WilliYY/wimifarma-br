import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { cashbackTransactionCreateSchema } from "@/features/cashback/schema";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const accounts = await prisma.cashbackAccount.findMany({
    include: { customer: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: accounts });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await request.json();
  const parsed = cashbackTransactionCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const account = await prisma.cashbackAccount.upsert({
    create: {
      balance: 0,
      customerId: parsed.data.customerId,
    },
    update: {},
    where: { customerId: parsed.data.customerId },
  });
  const transaction = await prisma.cashbackTransaction.create({
    data: {
      accountId: account.id,
      amount: parsed.data.amount,
      description: parsed.data.description,
      reference: parsed.data.reference,
      type: parsed.data.type,
    },
  });

  return NextResponse.json({ data: transaction }, { status: 201 });
}
