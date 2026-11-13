import "dotenv/config";
import { Prisma } from "../src/generated/prisma/client";
import { lockCashbackAccount } from "../src/features/cashback/wallet";
import { getPrisma } from "../src/lib/prisma";

const ACTION = "OWNER_CASHBACK_GRANTED";
const ENTITY = "CashbackTransaction";
const DESCRIPTION = "Crédito concedido pela Wimifarma";

class OperationError extends Error {}

function readInput(env: NodeJS.ProcessEnv, args: string[]) {
  const email = env.OWNER_CASHBACK_CUSTOMER_EMAIL ?? "";
  const name = env.OWNER_CASHBACK_CUSTOMER_NAME ?? "";
  const cents = env.OWNER_CASHBACK_AMOUNT_CENTS ?? "";
  const key = env.OWNER_CASHBACK_OPERATION_KEY ?? "";
  const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailFormat.test(email) || !name || name !== name.trim() || name.length > 160 ||
      !/^[1-9]\d{0,9}$/.test(cents) || !/^[a-z0-9][a-z0-9_-]{7,79}$/.test(key)) {
    throw new OperationError("Revise as variáveis OWNER_CASHBACK_*: e-mail, nome exato, centavos inteiros e chave da operação.");
  }
  const eventKey = `owner-cashback:${key}`;
  const commit = args.length === 1 && args[0] === `--commit=${key}`;
  if (args.length && !commit) throw new OperationError("Confirmação inválida: use --commit com a mesma chave da operação.");
  return { email, name, cents, eventKey, commit };
}

async function main() {
  const input = readInput(process.env, process.argv.slice(2));
  const db = getPrisma();
  const amount = new Prisma.Decimal(input.cents).div(100);
  try {
    const result = await db.$transaction(async (tx) => {
      if (!input.commit) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const customers = await tx.customer.findMany({ where: { email: { equals: input.email, mode: "insensitive" } },
        take: 2, select: { id: true, email: true, name: true, status: true } });
      const customer = customers[0];
      if (customers.length !== 1 || customer.email !== input.email || customer.name !== input.name || customer.status !== "ACTIVE") {
        throw new OperationError("Cliente ativo não identificado de forma inequívoca pelo nome e e-mail exatos.");
      }
      const admins = await tx.$queryRaw<Array<{ id: string; customerId: string }>>`
        SELECT u."id", u."customerId"
        FROM "User" u
        JOIN "Customer" c ON c."id" = u."customerId"
        WHERE u."role" = 'ADMIN' AND u."isActive" AND c."status" = 'ACTIVE' AND c."googleSubject" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM "AuditLog" a
            WHERE a."userId" = u."id" AND a."entityId" = u."id"
              AND a."action" = 'OWNER_GOOGLE_ADMIN_GRANTED' AND a."entity" = 'UserAccess'
              AND a."metadata" ->> 'source' = 'explicit_owner_request'
          )
        LIMIT 2`;
      const admin = admins[0];
      if (admins.length !== 1 || admin.customerId === customer.id) {
        throw new OperationError("ADMIN ativo do proprietário não identificado de forma inequívoca na auditoria.");
      }
      if (input.commit) {
        await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customer.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${admin.id} FOR SHARE`;
        await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${admin.customerId} FOR SHARE`;
      }
      const before = await tx.cashbackAccount.findUnique({ where: { customerId: customer.id }, select: { id: true, balance: true, lifetimeEarned: true } });
      const prior = await tx.cashbackTransaction.findUnique({ where: { eventKey: input.eventKey },
        select: { id: true, accountId: true, amount: true, type: true, reference: true, expiresAt: true } });
      const audits = await tx.auditLog.findMany({ where: { action: ACTION, entity: ENTITY, metadata: { path: ["eventKey"], equals: input.eventKey } },
        take: 2, select: { id: true, userId: true, entityId: true, metadata: true } });
      const metadata = { source: "explicit_owner_request", eventKey: input.eventKey, amountCents: Number(input.cents), customerId: customer.id };
      if (prior || audits.length) {
        const audit = audits[0];
        const payload = audit?.metadata as Partial<typeof metadata> | null | undefined;
        if (!prior || !before || prior.accountId !== before.id || !prior.amount.equals(amount) || prior.type !== "CREDIT" || prior.reference !== null || prior.expiresAt !== null ||
            audits.length !== 1 || audit.userId !== admin.id || audit.entityId !== prior.id || payload?.source !== metadata.source ||
            payload?.customerId !== metadata.customerId || payload?.amountCents !== metadata.amountCents) {
          throw new OperationError("Chave de operação existente com dados divergentes; nenhuma alteração aplicada.");
        }
        return { status: "already_applied", transactionId: prior.id, auditId: audit.id, balance: before.balance.toFixed(2) };
      }
      const currentBalance = before?.balance ?? new Prisma.Decimal(0);
      const currentEarned = before?.lifetimeEarned ?? new Prisma.Decimal(0);
      if (currentBalance.plus(amount).greaterThan("99999999.99") || currentEarned.plus(amount).greaterThan("99999999.99")) {
        throw new OperationError("Crédito excede o limite da carteira.");
      }
      if (!input.commit) return { status: "dry_run", balance: currentBalance.toFixed(2), projectedBalance: currentBalance.plus(amount).toFixed(2) };

      const account = await lockCashbackAccount(tx, customer.id);
      const entry = await tx.cashbackTransaction.create({ data: { accountId: account.id, eventKey: input.eventKey, type: "CREDIT", amount, description: DESCRIPTION }, select: { id: true } });
      const updated = await tx.cashbackAccount.update({ where: { id: account.id },
        data: { balance: { increment: amount }, lifetimeEarned: { increment: amount } }, select: { balance: true } });
      const audit = await tx.auditLog.create({ data: { userId: admin.id, action: ACTION, entity: ENTITY, entityId: entry.id, metadata }, select: { id: true } });
      return { status: "applied", transactionId: entry.id, auditId: audit.id, balance: updated.balance.toFixed(2) };
    }, { isolationLevel: "Serializable" });
    console.log(JSON.stringify({ ...result, amount: amount.toFixed(2), eventKey: input.eventKey }));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof OperationError) console.error(error.message);
  else if (error instanceof Prisma.PrismaClientKnownRequestError) console.error(`Operação não confirmada (${error.code}); confira com a mesma chave em modo simulação.`);
  else console.error("Operação não confirmada; confira conexão e configuração sem expor credenciais.");
  process.exitCode = 1;
});
