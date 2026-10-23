import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { adminRoutePermissions, requireApiRole } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const guard = await requireApiRole(adminRoutePermissions["/admin/pedidos"]);
  if (guard.response) {
    guard.response.headers.set("Cache-Control", headers["Cache-Control"]);
    return guard.response;
  }
  try {
    const prisma = getPrisma();
    const where: Prisma.OrderWhereInput = {
      status: "PENDING",
      paymentStatus: { in: ["PENDING", "PAID"] },
      OR: [
        { paymentMethod: { not: "ONLINE" }, onlinePayment: { is: null } },
        { onlinePayment: { is: { environment: "production", status: { notIn: ["FAILED", "CANCELED", "REFUNDED", "DISPUTED", "PARTIALLY_REFUNDED"] } } } },
      ],
    };
    const [pending, latest] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findFirst({ where, select: { id: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    ]);
    return NextResponse.json({ data: { pending, latestId: latest?.id ?? null, latestCreatedAt: latest?.createdAt.toISOString() ?? null } }, { headers });
  } catch {
    return NextResponse.json({ error: "Resumo de pedidos indisponível." }, { status: 503, headers });
  }
}
