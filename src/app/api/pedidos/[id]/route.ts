import { NextResponse } from "next/server";
import { requireApiRole } from "@/features/auth/permissions";
import { settleOrderCashback } from "@/features/cashback/service";
import { settleOrderBenefits } from "@/features/cashback/redemption";
import { canTransitionStatus, orderStatusTransitions, orderStatusUpdateSchema, paymentStatusTransitions } from "@/features/orders/checkout";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { queueCustomerOrderStatus, type CustomerNotificationStatus } from "@/features/miauby/customer-order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiRole(["ADMIN", "MANAGER", "STAFF"]);
  if (guard.response) return guard.response;
  const parsed = orderStatusUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { id } = await params;
  const { prescriptionReviewed, ...statusUpdate } = parsed.data;
  const userId = guard.session?.user?.id;
  const result = await getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    const current = await transaction.order.findUnique({
      select: { paymentStatus: true, status: true, paymentMethod: true, fulfillmentMethod: true, requiresPrescriptionReview: true, hasItemShortages: true,
        prescriptionReviewedAt: true, prescriptionReviewedById: true,
        onlinePayment: { select: { environment: true, status: true, statusDetail: true, financialReviewReason: true } } },
      where: { id },
    });
    if (!current) return { error: "Pedido nao encontrado.", statusCode: 404 };
    if (statusUpdate.status === "OUT_FOR_DELIVERY" && current.fulfillmentMethod !== "DELIVERY") {
      return { error: "Pedidos de retirada não possuem etapa de envio ou saída para entrega.", statusCode: 409 };
    }
    if (statusUpdate.status && statusUpdate.status !== current.status && current.onlinePayment?.financialReviewReason) {
      return { error: "Resolva a revisão financeira do pagamento antes de avançar o pedido.", statusCode: 409 };
    }
    if (current.paymentMethod === "ONLINE" && (statusUpdate.paymentStatus || current.onlinePayment?.environment === "test" || current.onlinePayment?.statusDetail === "partially_refunded"
      || (statusUpdate.status && statusUpdate.status !== current.status && current.paymentStatus !== "PAID") || statusUpdate.status === "CANCELED")) {
      return { error: "Pagamento online é atualizado pelo provedor do pagamento. Para cancelar ou reembolsar, use o painel dele e aguarde a sincronização. Pedidos de teste ou com reembolso parcial não podem ser preparados.", statusCode: 409 };
    }
    if (statusUpdate.status && !canTransitionStatus(orderStatusTransitions, current.status, statusUpdate.status)) {
      return { error: "Esta mudanca de status do pedido nao e permitida.", statusCode: 409 };
    }
    if (statusUpdate.paymentStatus && !canTransitionStatus(paymentStatusTransitions, current.paymentStatus, statusUpdate.paymentStatus)) {
      return { error: "Esta mudanca de status do pagamento nao e permitida.", statusCode: 409 };
    }
    if (prescriptionReviewed && (!current.requiresPrescriptionReview || current.status === "CANCELED" || current.status === "COMPLETED")) {
      return { error: "Este pedido não permite registrar conferência de receita.", statusCode: 409 };
    }
    if (prescriptionReviewed && (!userId || userId === "demo-admin")) {
      return { error: "Entre com uma conta autorizada para registrar a conferência.", statusCode: 401 };
    }
    const reviewedAt = current.prescriptionReviewedAt ?? (prescriptionReviewed ? new Date() : null);
    const nextStatus = statusUpdate.status ?? current.status;
    const statusChanged = nextStatus !== current.status;
    if (current.hasItemShortages && ["READY", "OUT_FOR_DELIVERY", "COMPLETED"].includes(nextStatus)) {
      const unresolved = await transaction.orderItemShortage.count({ where: { orderId: id, OR: [
        { status: { in: ["PROPOSED", "REFUND_REQUESTED"] } }, { creditState: "REVIEW" },
      ] } });
      const items = await transaction.orderItem.findMany({ where: { orderId: id }, select: { quantity: true, shortageQuantity: true } });
      if (unresolved || !items.some(item => item.quantity > item.shortageQuantity)) return { error: "Resolva os itens faltantes com o cliente antes de liberar a entrega.", statusCode: 409 };
    }
    if (current.requiresPrescriptionReview && !reviewedAt && ["READY", "OUT_FOR_DELIVERY", "COMPLETED"].includes(nextStatus)) {
      return { error: "O farmacêutico precisa conferir a receita antes de liberar o pedido para entrega ou retirada.", statusCode: 409 };
    }
    if (current.paymentMethod === "ONLINE" && (statusUpdate.status || statusUpdate.paymentStatus)) {
      const online = await transaction.onlinePayment.findUnique({ where: { orderId: id } });
      if (!online || online.status !== "PAID" || online.environment !== "production" || online.financialReviewReason) {
        return { error: "Aguarde a confirmação pelo provedor do pagamento antes de preparar o pedido.", statusCode: 409 };
      }
    }
    const recordingReview = Boolean(prescriptionReviewed && !current.prescriptionReviewedAt);
    await transaction.order.update({
      data: { ...statusUpdate, ...(recordingReview ? { prescriptionReviewedAt: reviewedAt, prescriptionReviewedById: userId } : {}) },
      where: { id },
    });
    await settleOrderCashback(transaction, id);
    await settleOrderBenefits(transaction, id);
    const saved = await transaction.order.findUniqueOrThrow({
      select: { id: true, number: true, customerPhone: true, fulfillmentMethod: true, paymentStatus: true, status: true, updatedAt: true, cashbackRedeemedCents: true,
        wimicoinsRedeemedPoints: true, wimicoinsRedemptionState: true,
        cashbackRedemptionState: true, requiresPrescriptionReview: true, prescriptionReviewedAt: true },
      where: { id },
    });
    if (recordingReview) {
      await transaction.auditLog.create({ data: {
        action: "ORDER_PRESCRIPTION_REVIEW_RECORDED", entity: "Order", entityId: id, userId,
        metadata: { pharmacistReviewConfirmed: true, reviewedAt: reviewedAt!.toISOString() },
      } });
    }
    if (statusUpdate.status || statusUpdate.paymentStatus) {
      await transaction.auditLog.create({ data: {
        action: "ORDER_STATUS_UPDATED", entity: "Order", entityId: id,
        metadata: { fromPaymentStatus: current.paymentStatus, fromStatus: current.status,
          toPaymentStatus: statusUpdate.paymentStatus ?? current.paymentStatus, toStatus: nextStatus },
        userId: userId && userId !== "demo-admin" ? userId : undefined,
      } });
    }
    const notificationStatus: CustomerNotificationStatus = statusChanged ? await queueCustomerOrderStatus(transaction, saved) : "SKIPPED";
    const { customerPhone: _customerPhone, ...responseOrder } = saved;
    void _customerPhone;
    return { data: { ...responseOrder, notificationStatus, updatedAt: saved.updatedAt.toISOString(), prescriptionReviewedAt: saved.prescriptionReviewedAt?.toISOString() ?? null } };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.statusCode });
  return NextResponse.json(result);
}
