import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { getCustomerStoreCredit } from "@/features/store-credit/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function GET() {
  try {
    const customerId = sessionCustomerId(await auth());
    if (!customerId) return NextResponse.json({ error: "Entre na sua conta de cliente." }, { status: 401, headers });
    const data = await getPrisma().$transaction(async tx => {
      if (!await tx.customer.findFirst({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } })) return null;
      return getCustomerStoreCredit(tx, customerId);
    }, { isolationLevel: "RepeatableRead" });
    return data ? NextResponse.json({ data }, { headers }) : NextResponse.json({ error: "Conta indisponível." }, { status: 401, headers });
  } catch { return NextResponse.json({ error: "Não foi possível consultar seus créditos. Tente novamente." }, { status: 503, headers }); }
}
