import type { Prisma } from "@/generated/prisma/client";
import { nextCashbackState } from "./rules";

// O chamador deve manter o bloqueio de escrita do pedido na mesma transacao.
export async function settleOrderCashback(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, number: true, customerId: true, cashbackEarnedCents: true, cashbackEarnedVoidedCents: true,
      cashbackState: true, status: true, paymentStatus: true },
  });
  const next = nextCashbackState(order.cashbackState, order.status, order.paymentStatus);
  if (next === order.cashbackState) return;
  const earnedCents = order.cashbackEarnedCents - (order.cashbackEarnedVoidedCents ?? 0);
  if (!order.customerId || earnedCents <= 0) {
    await tx.order.update({ where: { id: orderId }, data: { cashbackState: "VOIDED" } });
    return;
  }
  if (next === "CREDITED" || next === "REVERSED") {
    const credit = next === "CREDITED";
    const amount = (earnedCents / 100).toFixed(2);
    await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${order.customerId} FOR UPDATE`;
    const account = await tx.cashbackAccount.upsert({
      where: { customerId: order.customerId },
      create: { customerId: order.customerId },
      update: {},
      select: { id: true },
    });
    await tx.cashbackTransaction.create({ data: {
      accountId: account.id,
      eventKey: `order:${order.id}:${next}`,
      type: credit ? "CREDIT" : "DEBIT",
      amount,
      reference: order.number,
      description: `${credit ? "Cashback" : "Estorno do cashback"} do pedido ${order.number}`,
    } });
    await tx.cashbackAccount.update({
      where: { id: account.id },
      data: {
        balance: credit ? { increment: amount } : { decrement: amount },
        lifetimeEarned: credit ? { increment: amount } : { decrement: amount },
      },
    });
  }
  await tx.order.update({ where: { id: order.id }, data: { cashbackState: next } });
  await tx.auditLog.create({ data: {
    action: `CASHBACK_${next}`, entity: "Order", entityId: order.id,
    metadata: { from: order.cashbackState, to: next, amountCents: earnedCents },
  } });
}

export async function getCustomerCashback(tx: Prisma.TransactionClient, customerId: string) {
  const account = await tx.cashbackAccount.findUnique({
    where: { customerId },
    select: {
      balance: true, lifetimeEarned: true, lifetimeRedeemed: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 20,
        select: { id: true, type: true, amount: true, description: true, createdAt: true } },
    },
  });
  const pending = await tx.order.aggregate({
    where: { customerId, cashbackState: "PENDING" }, _sum: { cashbackEarnedCents: true, cashbackEarnedVoidedCents: true },
  });
  const reserved = await tx.order.aggregate({ where: { customerId, cashbackRedemptionState: "RESERVED" }, _sum: { cashbackRedeemedCents: true, cashbackReturnedCents: true } });
  return {
    reservedCents: (reserved._sum.cashbackRedeemedCents ?? 0) - (reserved._sum.cashbackReturnedCents ?? 0),
    balance: account?.balance.toString() ?? "0",
    pendingCents: (pending._sum.cashbackEarnedCents ?? 0) - (pending._sum.cashbackEarnedVoidedCents ?? 0),
    lifetimeEarned: account?.lifetimeEarned.toString() ?? "0",
    lifetimeRedeemed: account?.lifetimeRedeemed.toString() ?? "0",
    transactions: account?.transactions.map((item) => ({
      ...item, amount: item.amount.toString(), createdAt: item.createdAt.toISOString(),
    })) ?? [],
  };
}
