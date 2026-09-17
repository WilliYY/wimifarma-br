import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { getCustomerCashback } from "@/features/cashback/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const headers = { "Cache-Control": "private, no-store" };
  const customerId = sessionCustomerId(session);
  if (!customerId) {
    return NextResponse.json({ error: "Entre na sua conta de cliente." }, { status: 401, headers });
  }
  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId, status: "ACTIVE" }, select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Conta indisponivel." }, { status: 401, headers });
  const data = await prisma.$transaction((tx) => getCustomerCashback(tx, customer.id), { isolationLevel: "RepeatableRead" });
  return NextResponse.json({ data }, { headers });
}
