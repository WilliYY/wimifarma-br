import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const pageSchema = z.coerce.number().int().min(1).max(100_000);

export async function GET(request: Request) {
  try {
    const access = await requireAdminOnlyApi();
    if (access.response || !access.session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers });
    const page = pageSchema.safeParse(new URL(request.url).searchParams.get("page") ?? 1);
    if (!page.success) return NextResponse.json({ error: "Página inválida." }, { status: 400, headers });
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: access.session.user.id }, select: { isActive: true, role: true } });
    if (!user?.isActive || user.role !== "ADMIN") return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers });
    const result = await prisma.$transaction(async tx => {
      const total = await tx.clubMembership.count();
      const members = await tx.clubMembership.count({ where: { active: true } });
      const available = await tx.wimicoinAccount.aggregate({ _sum: { balancePoints: true } });
      const pending = await tx.order.aggregate({ where: { wimicoinsState: "PENDING" }, _sum: { wimicoinsEarnedPoints: true } });
      const rows = await tx.clubMembership.findMany({ skip: (page.data - 1) * 24, take: 24, orderBy: [{ joinedAt: "desc" }, { id: "desc" }], select: { id: true, customerId: true, joinedAt: true, active: true, customer: { select: { name: true, email: true, phone: true, wimicoinAccount: { select: { balancePoints: true } } } } } });
      return { data: rows.map(row => ({ id: row.id, customerId: row.customerId, customerName: row.customer.name, email: row.customer.email, phone: row.customer.phone, joinedAt: row.joinedAt.toISOString(), active: row.active, balancePoints: row.customer.wimicoinAccount?.balancePoints ?? 0 })), page: page.data, pages: Math.max(1, Math.ceil(total / 24)), total, summary: { members, availablePoints: available._sum.balancePoints ?? 0, pendingPoints: pending._sum.wimicoinsEarnedPoints ?? 0 } };
    }, { isolationLevel: "RepeatableRead" });
    return NextResponse.json(result, { headers });
  } catch { return NextResponse.json({ error: "Não foi possível consultar os participantes." }, { status: 503, headers }); }
}
