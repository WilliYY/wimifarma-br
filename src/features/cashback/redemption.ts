import type { Prisma } from "@/generated/prisma/client";
import { lockCashbackAccount } from "./wallet";
import { reverseReviewRewards } from "./review-service";

// O chamador mantem o bloqueio de escrita do pedido durante toda a liquidacao.
export async function settleOrderBenefits(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!order.customerId) return;
  const canceled = order.status === "CANCELED" || order.paymentStatus === "CANCELED" || order.paymentStatus === "REFUNDED";
  const completed = order.status === "COMPLETED" && order.paymentStatus === "PAID";
  const state = order.cashbackRedemptionState;
  if (!canceled && !(completed && state === "RESERVED")) return;
  const account = await lockCashbackAccount(tx, order.customerId);
  if (canceled) await reverseReviewRewards(tx, orderId);
  if (state !== "RESERVED" && state !== "REDEEMED") return;
  const amount = (order.cashbackRedeemedCents / 100).toFixed(2);
  const next = canceled ? "RETURNED" : "REDEEMED";
  if (canceled) {
    await tx.cashbackTransaction.create({ data: { accountId: account.id, type: "CREDIT", amount, eventKey: `redemption:${order.id}:RETURNED`, reference: order.number, description: `Cashback devolvido - pedido ${order.number}` } });
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { increment: amount }, ...(state === "REDEEMED" ? { lifetimeRedeemed: { decrement: amount } } : {}) } });
  } else {
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { lifetimeRedeemed: { increment: amount } } });
  }
  await tx.order.update({ where: { id: orderId }, data: { cashbackRedemptionState: next } });
  await tx.auditLog.create({ data: { action: `CASHBACK_REDEMPTION_${next}`, entity: "Order", entityId: orderId, metadata: { amountCents: order.cashbackRedeemedCents } } });
}
