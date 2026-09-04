import { NextResponse } from "next/server";
import { requireApiRole } from "@/features/auth/permissions";
import {
  canTransitionStatus,
  orderStatusTransitions,
  orderStatusUpdateSchema,
  paymentStatusTransitions,
} from "@/features/orders/checkout";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["ADMIN", "MANAGER", "STAFF"]);
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { id } = await params;
  const prisma = getPrisma();
  const current = await prisma.order.findUnique({
    select: { paymentStatus: true, status: true },
    where: { id },
  });

  if (!current) {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  if (
    parsed.data.status &&
    !canTransitionStatus(orderStatusTransitions, current.status, parsed.data.status)
  ) {
    return NextResponse.json(
      { error: "Esta mudanca de status do pedido nao e permitida." },
      { status: 409 },
    );
  }

  if (
    parsed.data.paymentStatus &&
    !canTransitionStatus(
      paymentStatusTransitions,
      current.paymentStatus,
      parsed.data.paymentStatus,
    )
  ) {
    return NextResponse.json(
      { error: "Esta mudanca de status do pagamento nao e permitida." },
      { status: 409 },
    );
  }

  const userId = guard.session?.user?.id;
  const order = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.order.updateMany({
      data: parsed.data,
      where: {
        id,
        paymentStatus: current.paymentStatus,
        status: current.status,
      },
    });

    if (updated.count !== 1) return null;

    const saved = await transaction.order.findUniqueOrThrow({
      select: { id: true, paymentStatus: true, status: true, updatedAt: true },
      where: { id },
    });

    await transaction.auditLog.create({
      data: {
        action: "ORDER_STATUS_UPDATED",
        entity: "Order",
        entityId: id,
        metadata: {
          fromPaymentStatus: current.paymentStatus,
          fromStatus: current.status,
          toPaymentStatus: parsed.data.paymentStatus ?? current.paymentStatus,
          toStatus: parsed.data.status ?? current.status,
        },
        userId: userId && userId !== "demo-admin" ? userId : undefined,
      },
    });

    return saved;
  });

  if (!order) {
    return NextResponse.json(
      { error: "O pedido foi alterado por outra pessoa. Atualize a pagina e tente novamente." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    data: { ...order, updatedAt: order.updatedAt.toISOString() },
  });
}
