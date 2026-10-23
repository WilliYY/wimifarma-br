import type { Prisma } from "@/generated/prisma/client";
import { nextCashbackState } from "@/features/cashback/rules";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { emptyClubSummary, type ClubSummary } from "./contracts";
import { ClubRuleError, lockWimicoinAccount } from "./wallet";

type ClubSession = { user?: { id?: string; role?: string; customerId?: string } } | null;

export async function resolveClubCustomer(tx: Prisma.TransactionClient, session: ClubSession, join = false) {
  if (!session?.user?.id) throw new ClubRuleError("Entre na sua conta.", 401);
  let customerId: string | null | undefined;
  if (session.user.role === "CUSTOMER") customerId = sessionCustomerId(session);
  else {
    if (join) await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${session.user.id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: session.user.id }, select: { id: true, isActive: true, customerId: true, name: true, email: true, passwordHash: true } });
    if (!user?.isActive) throw new ClubRuleError("Conta indisponível.", 401);
    customerId = user.customerId;
    if (!customerId && join) {
      const conflict = await tx.customer.findUnique({ where: { email: user.email }, select: { id: true } });
      if (conflict) throw new ClubRuleError("Não foi possível vincular esta conta. Contate a administração.", 409);
      const localPassword = user.passwordHash !== "!GOOGLE_ONLY" ? user.passwordHash : null;
      const customer = await tx.customer.create({ data: {
        name: user.name, email: user.email,
        passwordHash: localPassword,
        passwordSetAt: localPassword ? new Date() : null,
      }, select: { id: true } });
      await tx.user.update({ where: { id: user.id }, data: { customerId: customer.id } });
      customerId = customer.id;
    }
  }
  if (!customerId) return null;
  const customer = await tx.customer.findUnique({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } });
  if (!customer) throw new ClubRuleError("Conta indisponível.", 401);
  return customer.id;
}

export async function getClubSummary(tx: Prisma.TransactionClient, customerId: string | null): Promise<ClubSummary> {
  if (!customerId) return emptyClubSummary();
  const membership = await tx.clubMembership.findUnique({ where: { customerId }, select: { active: true, joinedAt: true } });
  const account = await tx.wimicoinAccount.findUnique({ where: { customerId }, select: {
    balancePoints: true, lifetimeEarnedPoints: true, lifetimeRedeemedPoints: true,
    transactions: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, amountPoints: true, description: true, createdAt: true } },
  } });
  const pending = await tx.order.aggregate({ where: { customerId, wimicoinsState: "PENDING" }, _sum: { wimicoinsEarnedPoints: true, wimicoinsEarnedVoidedPoints: true } });
  return { member: membership?.active ?? false, joinedAt: membership?.joinedAt.toISOString() ?? null,
    balancePoints: account?.balancePoints ?? 0, pendingPoints: (pending._sum.wimicoinsEarnedPoints ?? 0) - (pending._sum.wimicoinsEarnedVoidedPoints ?? 0),
    lifetimeEarnedPoints: account?.lifetimeEarnedPoints ?? 0, lifetimeRedeemedPoints: account?.lifetimeRedeemedPoints ?? 0,
    transactions: account?.transactions.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })) ?? [] };
}

export async function joinClub(tx: Prisma.TransactionClient, session: ClubSession) {
  const customerId = await resolveClubCustomer(tx, session, true);
  if (!customerId) throw new ClubRuleError("Conta indisponível.", 401);
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`;
  const membership = await tx.clubMembership.findUnique({ where: { customerId }, select: { active: true } });
  await tx.clubMembership.upsert({ where: { customerId }, create: { customerId }, update: { active: true } });
  if (!membership?.active) await tx.auditLog.create({ data: { action: "CLUB_JOINED", entity: "Customer", entityId: customerId } });
  return getClubSummary(tx, customerId);
}

// O chamador mantém o bloqueio do pedido e da carteira cashback, nessa ordem.
export async function settleOrderWimicoins(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { id: true, number: true, customerId: true, status: true, paymentStatus: true, wimicoinsEarnedPoints: true, wimicoinsEarnedVoidedPoints: true, wimicoinsState: true, wimicoinsRedeemedPoints: true, wimicoinsReturnedPoints: true, wimicoinsRedemptionState: true } });
  if (!order.customerId) return;
  const next = nextCashbackState(order.wimicoinsState, order.status, order.paymentStatus);
  const canceled = order.status === "CANCELED" || order.paymentStatus === "CANCELED" || order.paymentStatus === "REFUNDED";
  const completed = order.status === "COMPLETED" && order.paymentStatus === "PAID";
  const redemption = order.wimicoinsRedemptionState;
  const settleRedemption = (redemption === "RESERVED" || redemption === "REDEEMED") && (canceled || (completed && redemption === "RESERVED"));
  if (next === order.wimicoinsState && !settleRedemption) return;
  const account = await lockWimicoinAccount(tx, order.customerId);
  if (next !== order.wimicoinsState) {
    const earnedPoints = order.wimicoinsEarnedPoints - (order.wimicoinsEarnedVoidedPoints ?? 0);
    if ((next === "CREDITED" || next === "REVERSED") && earnedPoints > 0) {
      const eventKey = `wimicoins:order:${order.id}:${next}`;
      if (!await tx.wimicoinTransaction.findUnique({ where: { eventKey } })) {
        const credit = next === "CREDITED";
        await tx.wimicoinTransaction.create({ data: { accountId: account.id, eventKey, type: credit ? "CREDIT" : "DEBIT", amountPoints: earnedPoints, reference: order.number, description: `${credit ? "WimiCoins" : "Estorno de WimiCoins"} do pedido ${order.number}` } });
        await tx.wimicoinAccount.update({ where: { id: account.id }, data: { balancePoints: credit ? { increment: earnedPoints } : { decrement: earnedPoints }, lifetimeEarnedPoints: credit ? { increment: earnedPoints } : { decrement: earnedPoints } } });
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { wimicoinsState: next } });
    await tx.auditLog.create({ data: { action: `WIMICOINS_${next}`, entity: "Order", entityId: orderId, metadata: { points: order.wimicoinsEarnedPoints } } });
  }
  if (settleRedemption) {
    const remainingPoints = order.wimicoinsRedeemedPoints - (order.wimicoinsReturnedPoints ?? 0);
    const state = canceled ? "RETURNED" : "REDEEMED";
    const eventKey = `wimicoins:redemption:${order.id}:${state}`;
    if (remainingPoints > 0 && !await tx.wimicoinTransaction.findUnique({ where: { eventKey } })) {
      await tx.wimicoinTransaction.create({ data: { accountId: account.id, eventKey, type: canceled ? "CREDIT" : "ADJUSTMENT", amountPoints: remainingPoints, reference: order.number, description: `WimiCoins ${canceled ? "devolvidos" : "utilizados"} - pedido ${order.number}` } });
      await tx.wimicoinAccount.update({ where: { id: account.id }, data: {
        ...(canceled ? { balancePoints: { increment: remainingPoints } } : {}),
        ...(!canceled ? { lifetimeRedeemedPoints: { increment: remainingPoints } } : redemption === "REDEEMED" ? { lifetimeRedeemedPoints: { decrement: remainingPoints } } : {}),
      } });
    }
    await tx.order.update({ where: { id: orderId }, data: { wimicoinsRedemptionState: state, ...(canceled ? { wimicoinsReturnedPoints: order.wimicoinsRedeemedPoints } : {}) } });
    await tx.auditLog.create({ data: { action: `WIMICOINS_REDEMPTION_${state}`, entity: "Order", entityId: orderId, metadata: { points: remainingPoints } } });
  }
}

export async function grantOwnerWimicoins(tx: Prisma.TransactionClient, input: { userId: string; points: number; eventKey: string }) {
  if (!Number.isSafeInteger(input.points) || input.points <= 0 || input.points > 600_000_000 || !input.eventKey || input.eventKey.length > 200) throw new ClubRuleError("Crédito inválido.", 422);
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true, isActive: true, customerId: true, customer: { select: { status: true } } } });
  if (!user?.isActive || user.role !== "ADMIN" || !user.customerId || user.customer?.status !== "ACTIVE") throw new ClubRuleError("Conta vinculada indisponível.", 403);
  const account = await lockWimicoinAccount(tx, user.customerId);
  const existing = await tx.wimicoinTransaction.findUnique({ where: { eventKey: input.eventKey } });
  if (existing) {
    if (existing.accountId !== account.id || existing.amountPoints !== input.points || existing.type !== "CREDIT") throw new ClubRuleError("Crédito incompatível.");
    return;
  }
  await tx.wimicoinTransaction.create({ data: { accountId: account.id, eventKey: input.eventKey, type: "CREDIT", amountPoints: input.points, description: "Crédito único autorizado pelo titular" } });
  await tx.wimicoinAccount.update({ where: { id: account.id }, data: { balancePoints: { increment: input.points }, lifetimeEarnedPoints: { increment: input.points } } });
  await tx.auditLog.create({ data: { userId: user.id, action: "WIMICOINS_OWNER_GRANT", entity: "Customer", entityId: user.customerId, metadata: { points: input.points, eventKey: input.eventKey } } });
}
