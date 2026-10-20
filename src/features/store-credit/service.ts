import type { Prisma } from "@/generated/prisma/client";
import { lockCashbackAccount } from "@/features/cashback/wallet";
import { lockStoreCreditAccount } from "./wallet";
import type { StoreCreditSummary } from "./contracts";

export async function getCustomerStoreCredit(tx: Prisma.TransactionClient, customerId: string): Promise<StoreCreditSummary> {
  const account = await tx.storeCreditAccount.findUnique({ where: { customerId }, select: {
    balanceCents: true, reviewRequired: true,
    transactions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20,
      select: { id: true, kind: true, amountCents: true, description: true, createdAt: true } },
  } });
  const reserved = await tx.order.aggregate({ where: { customerId, storeCreditRedemptionState: "RESERVED" },
    _sum: { storeCreditRedeemedCents: true, storeCreditReturnedCents: true } });
  const balanceCents = account?.balanceCents ?? 0;
  return { balanceCents, availableCents: account?.reviewRequired ? 0 : Math.max(0, balanceCents), reviewRequired: account?.reviewRequired ?? false,
    reservedCents: (reserved._sum.storeCreditRedeemedCents ?? 0) - (reserved._sum.storeCreditReturnedCents ?? 0),
    transactions: account?.transactions.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })) ?? [] };
}

// Caller holds the order and cashback account; store credit precedes WimiCoins.
export async function settleOrderStoreCredit(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!order.customerId || !order.storeCreditRedeemedCents) return;
  const canceled = order.status === "CANCELED" || order.paymentStatus === "CANCELED" || order.paymentStatus === "REFUNDED";
  const completed = order.status === "COMPLETED" && order.paymentStatus === "PAID";
  const state = order.storeCreditRedemptionState;
  if (!["RESERVED", "REDEEMED"].includes(state) || (!canceled && !(completed && state === "RESERVED"))) return;
  const next = canceled ? "RETURNED" : "REDEEMED";
  const remaining = order.storeCreditRedeemedCents - order.storeCreditReturnedCents;
  if (canceled && remaining > 0) {
    const account = await lockStoreCreditAccount(tx, order.customerId);
    const eventKey = `store-credit:redemption:${orderId}:RETURNED`;
    if (!await tx.storeCreditTransaction.findUnique({ where: { eventKey } })) {
      await tx.storeCreditTransaction.create({ data: { accountId: account.id, eventKey, kind: "RETURN", amountCents: remaining, orderId, description: `Crédito devolvido do pedido ${order.number}` } });
      await tx.storeCreditAccount.update({ where: { id: account.id }, data: { balanceCents: { increment: remaining } } });
    }
  }
  await tx.order.update({ where: { id: orderId }, data: { storeCreditRedemptionState: next,
    ...(canceled ? { storeCreditReturnedCents: order.storeCreditRedeemedCents } : {}) } });
  await tx.auditLog.create({ data: { action: `STORE_CREDIT_REDEMPTION_${next}`, entity: "Order", entityId: orderId, metadata: { cents: remaining } } });
}

// A canceled fulfillment status alone is not proof that the money was refunded.
export async function settleIssuedStoreCredits(tx: Prisma.TransactionClient, orderId: string, financialStatus?: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!order.hasItemShortages || !order.customerId) return;
  if (order.status === "CANCELED") await tx.orderItemShortage.updateMany({ where: { orderId, status: "PROPOSED" }, data: { status: "VOIDED", version: { increment: 1 } } });
  const refunded = financialStatus === "REFUNDED" || financialStatus === "DISPUTED" || order.paymentStatus === "REFUNDED";
  const partial = financialStatus === "PARTIALLY_REFUNDED";
  if (!refunded && !partial) return;
  const shortages = await tx.orderItemShortage.findMany({ where: { orderId, status: "CREDIT_ACCEPTED", creditState: { in: ["ISSUED", "REVIEW"] } }, orderBy: { id: "asc" } });
  if (!shortages.length) return;
  await lockCashbackAccount(tx, order.customerId);
  const account = await lockStoreCreditAccount(tx, order.customerId);
  if (partial && !refunded) {
    if (shortages.every(row => row.creditState === "REVIEW")) return;
    await tx.orderItemShortage.updateMany({ where: { id: { in: shortages.map(row => row.id) }, creditState: "ISSUED" }, data: { creditState: "REVIEW", version: { increment: 1 } } });
    await tx.storeCreditAccount.update({ where: { id: account.id }, data: { reviewRequired: true } });
    await tx.auditLog.create({ data: { action: "STORE_CREDIT_REFUND_REVIEW", entity: "Order", entityId: orderId } });
    return;
  }
  for (const shortage of shortages) {
    if (shortage.cashPaidCents > 0) {
      const eventKey = `store-credit:shortage:${shortage.id}:REVERSED`;
      if (!await tx.storeCreditTransaction.findUnique({ where: { eventKey } })) {
        await tx.storeCreditTransaction.create({ data: { accountId: account.id, eventKey, kind: "REVERSAL", amountCents: -shortage.cashPaidCents, orderId, shortageId: shortage.id, description: `Crédito revisto após estorno do pedido ${order.number}` } });
        await tx.storeCreditAccount.update({ where: { id: account.id }, data: { balanceCents: { decrement: shortage.cashPaidCents } } });
      }
    }
    await tx.orderItemShortage.update({ where: { id: shortage.id }, data: { creditState: "REVERSED", version: { increment: 1 } } });
  }
  const reviewCount = await tx.orderItemShortage.count({ where: { order: { customerId: order.customerId }, creditState: "REVIEW" } });
  await tx.storeCreditAccount.update({ where: { id: account.id }, data: { reviewRequired: reviewCount > 0 } });
  await tx.auditLog.create({ data: { action: "STORE_CREDIT_ISSUE_REVERSED", entity: "Order", entityId: orderId, metadata: { cents: shortages.reduce((sum, row) => sum + row.cashPaidCents, 0) } } });
}
