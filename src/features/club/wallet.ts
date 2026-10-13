import type { Prisma } from "@/generated/prisma/client";

export class ClubRuleError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}

// O pedido e a carteira cashback devem ser bloqueados antes desta carteira.
export async function lockWimicoinAccount(tx: Prisma.TransactionClient, customerId: string) {
  const account = await tx.wimicoinAccount.upsert({ where: { customerId }, create: { customerId }, update: {}, select: { id: true } });
  await tx.$queryRaw`SELECT "id" FROM "WimicoinAccount" WHERE "id" = ${account.id} FOR UPDATE`;
  return tx.wimicoinAccount.findUniqueOrThrow({ where: { id: account.id } });
}

export async function reserveWimicoins(tx: Prisma.TransactionClient, input: { customerId: string; orderId: string; number: string; points: number }) {
  if (!Number.isSafeInteger(input.points) || input.points < 0) throw new ClubRuleError("Valor inválido.", 422);
  if (input.points === 0) return;
  const membership = await tx.clubMembership.findUnique({ where: { customerId: input.customerId }, select: { active: true } });
  if (!membership?.active) throw new ClubRuleError("Entre no Club para usar WimiCoins.");
  const account = await lockWimicoinAccount(tx, input.customerId);
  const eventKey = `wimicoins:redemption:${input.orderId}:RESERVED`;
  const existing = await tx.wimicoinTransaction.findUnique({ where: { eventKey } });
  if (existing) {
    if (existing.accountId !== account.id || existing.amountPoints !== input.points) throw new ClubRuleError("Reserva incompatível.");
    return;
  }
  if (account.balancePoints < input.points) throw new ClubRuleError("Saldo de WimiCoins insuficiente.");
  await tx.wimicoinTransaction.create({ data: { accountId: account.id, eventKey, type: "DEBIT", amountPoints: input.points, reference: input.number, description: `WimiCoins reservados - pedido ${input.number}` } });
  await tx.wimicoinAccount.update({ where: { id: account.id }, data: { balancePoints: { decrement: input.points } } });
  await tx.auditLog.create({ data: { action: "WIMICOINS_RESERVED", entity: "Order", entityId: input.orderId, metadata: { points: input.points } } });
}
