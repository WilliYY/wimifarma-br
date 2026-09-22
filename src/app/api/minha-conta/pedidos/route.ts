import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { parseOrderHistoryQuery } from "@/features/orders/customer-orders";
import { getCustomerOrders } from "@/features/orders/customer-orders-service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request) {
  const customerId = sessionCustomerId(await auth());
  if (!customerId) return NextResponse.json({ message: "Não autorizado." }, { status: 401, headers });
  const query = parseOrderHistoryQuery(new URL(request.url).searchParams);
  if (!query) return NextResponse.json({ message: "Filtro ou página inválidos." }, { status: 400, headers });
  try {
    const prisma = getPrisma();
    const customer = await prisma.customer.findUnique({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } });
    if (!customer) return NextResponse.json({ message: "Não autorizado." }, { status: 401, headers });
    return NextResponse.json({ data: await getCustomerOrders(prisma, customerId, query) }, { headers });
  } catch {
    return NextResponse.json({ message: "Não foi possível consultar os pedidos. Tente novamente." }, { status: 503, headers });
  }
}
