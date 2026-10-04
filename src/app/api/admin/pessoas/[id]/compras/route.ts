import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { purchaseMonthSchema, purchasePeriod } from "@/features/admin-users/purchase-period";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const querySchema = z.object({ month: purchaseMonthSchema, page: z.coerce.number().int().min(1).max(10000).default(1) });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  const { id } = await context.params;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !parsed.success)
    return NextResponse.json({ error: "Cliente ou período inválido." }, { status: 422, headers });
  try {
    const data = await getPrisma().$transaction(async tx => {
      const person = await tx.customer.findUnique({ where: { id }, select: { id: true, name: true } });
      if (!person) return null;
      const period = purchasePeriod(parsed.data.month);
      // Prisma DateTime is stored as UTC; PostgreSQL resolves the business timezone.
      const dates = period ? await tx.$queryRaw<{ start: Date; end: Date }[]>(Prisma.sql`SELECT
        ((${period.start}::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC') AS start,
        ((${period.end}::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC') AS end`) : null;
      const where: Prisma.OrderWhereInput = { customerId: id,
        NOT: { onlinePayment: { is: { environment: "test" } } },
        ...(dates ? { createdAt: { gte: dates[0].start, lt: dates[0].end } } : {}) };
      const [orders, total] = await Promise.all([
        tx.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (parsed.data.page - 1) * 20,
          select: { id: true, number: true, createdAt: true, status: true, paymentStatus: true,
            subtotalCents: true, deliveryFeeCents: true, totalCents: true, fulfillmentMethod: true,
            items: { select: { productName: true, quantity: true, totalCents: true } } } }),
        tx.order.count({ where }),
      ]);
      return { person, orders, total, page: parsed.data.page, pageSize: 20 };
    }, { isolationLevel: "RepeatableRead" });
    return NextResponse.json(data ?? { error: "Cliente não encontrado." }, { status: data ? 200 : 404, headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o histórico. Tente novamente." }, { status: 503, headers });
  }
}
