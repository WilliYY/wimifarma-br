import type { Prisma } from "@/generated/prisma/client";
import { lockCashbackAccount } from "./wallet";
import { reverseReviewRewards } from "./review-service";
import { settleOrderWimicoins } from "@/features/club/service";
import { settleSupplierOrder } from "@/features/supplier-catalog/inventory";
import { settleIssuedStoreCredits, settleOrderStoreCredit } from "@/features/store-credit/service";

// O chamador mantem o bloqueio de escrita do pedido durante toda a liquidacao.
export async function settleOrderBenefits(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!order.customerId) {
    if (order.preparationDays > 0) await settleSupplierOrder(tx, orderId, order.status, order.paymentStatus);
    return;
  }
  // Todas as operações combinadas bloqueiam cashback antes da carteira WimiCoins.
  const account = await lockCashbackAccount(tx, order.customerId);
  await settleIssuedStoreCredits(tx, orderId);
  await settleOrderStoreCredit(tx, orderId);
  await settleOrderWimicoins(tx, orderId);
  // A mesma ordem do checkout: carteiras antes das ofertas de distribuidor.
  if (order.preparationDays > 0) await settleSupplierOrder(tx, orderId, order.status, order.paymentStatus);
  const canceled = order.status === "CANCELED" || order.paymentStatus === "CANCELED" || order.paymentStatus === "REFUNDED";
  const completed = order.status === "COMPLETED" && order.paymentStatus === "PAID";
  const state = order.cashbackRedemptionState;
  if (!canceled && !(completed && state === "RESERVED")) return;
  if (canceled) await reverseReviewRewards(tx, orderId);
  if (state !== "RESERVED" && state !== "REDEEMED") return;
  const remainingCents = order.cashbackRedeemedCents - (order.cashbackReturnedCents ?? 0);
  const amount = (remainingCents / 100).toFixed(2);
  const next = canceled ? "RETURNED" : "REDEEMED";
  if (canceled && remainingCents > 0) {
    await tx.cashbackTransaction.create({ data: { accountId: account.id, type: "CREDIT", amount, eventKey: `redemption:${order.id}:RETURNED`, reference: order.number, description: `Cashback devolvido - pedido ${order.number}` } });
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { increment: amount }, ...(state === "REDEEMED" ? { lifetimeRedeemed: { decrement: amount } } : {}) } });
  } else if (!canceled && remainingCents > 0) {
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { lifetimeRedeemed: { increment: amount } } });
  }
  await tx.order.update({ where: { id: orderId }, data: { cashbackRedemptionState: next, ...(canceled ? { cashbackReturnedCents: order.cashbackRedeemedCents } : {}) } });
  await tx.auditLog.create({ data: { action: `CASHBACK_REDEMPTION_${next}`, entity: "Order", entityId: orderId, metadata: { amountCents: remainingCents } } });
}
