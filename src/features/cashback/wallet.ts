import type { Prisma } from "@/generated/prisma/client";

export class CashbackRuleError extends Error {
  constructor(message: string, public readonly status = 409, public readonly code?: string) { super(message); }
}

// Movimentacoes do cliente passam pelo mesmo bloqueio; pedido existente vem antes.
export async function lockCashbackAccount(tx: Prisma.TransactionClient, customerId: string) {
  const account = await tx.cashbackAccount.upsert({
    where: { customerId }, create: { customerId }, update: {}, select: { id: true },
  });
  await tx.$queryRaw`SELECT "id" FROM "CashbackAccount" WHERE "id" = ${account.id} FOR UPDATE`;
  return tx.cashbackAccount.findUniqueOrThrow({ where: { id: account.id } });
}
