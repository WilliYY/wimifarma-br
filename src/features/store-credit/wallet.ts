import type { Prisma } from "@/generated/prisma/client";
import { CashbackRuleError } from "@/features/cashback/wallet";

export class StoreCreditRuleError extends CashbackRuleError {}

// Existing order first, then cashback, store credit, WimiCoins and supplier offers.
export async function lockStoreCreditAccount(tx: Prisma.TransactionClient, customerId: string) {
  const account = await tx.storeCreditAccount.upsert({ where: { customerId }, create: { customerId }, update: {}, select: { id: true } });
  await tx.$queryRaw`SELECT "id" FROM "StoreCreditAccount" WHERE "id" = ${account.id} FOR UPDATE`;
  return tx.storeCreditAccount.findUniqueOrThrow({ where: { id: account.id } });
}

export async function reserveStoreCredit(tx: Prisma.TransactionClient, input: { customerId: string; orderId: string; number: string; cents: number }) {
  if (!Number.isSafeInteger(input.cents) || input.cents < 0 || input.cents > 600_000_000) throw new StoreCreditRuleError("Valor de crédito inválido.", 422);
  if (input.cents === 0) return;
  const account = await lockStoreCreditAccount(tx, input.customerId);
  const eventKey = `store-credit:redemption:${input.orderId}:RESERVED`;
  const existing = await tx.storeCreditTransaction.findUnique({ where: { eventKey } });
  if (existing) {
    if (existing.accountId !== account.id || existing.amountCents !== -input.cents) throw new StoreCreditRuleError("Reserva de crédito incompatível.");
    return;
  }
  if (account.reviewRequired) throw new StoreCreditRuleError("Seu crédito está em conferência. Fale com a equipe.");
  if (account.balanceCents < input.cents) throw new StoreCreditRuleError("Saldo de crédito alterado ou insuficiente. Atualize o checkout.");
  await tx.storeCreditTransaction.create({ data: { accountId: account.id, eventKey, kind: "RESERVE", amountCents: -input.cents, orderId: input.orderId, description: `Crédito utilizado no pedido ${input.number}` } });
  await tx.storeCreditAccount.update({ where: { id: account.id }, data: { balanceCents: { decrement: input.cents } } });
  await tx.auditLog.create({ data: { action: "STORE_CREDIT_RESERVED", entity: "Order", entityId: input.orderId, metadata: { cents: input.cents } } });
}
