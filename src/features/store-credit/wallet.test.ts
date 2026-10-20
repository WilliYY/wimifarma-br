import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { reserveStoreCredit, StoreCreditRuleError } from "./wallet";

function fixture(balanceCents = 1000, reviewRequired = false) {
  const account = { id: "credit-account", customerId: "customer", balanceCents, reviewRequired };
  const entries = new Map<string, Record<string, unknown>>();
  const audits: unknown[] = [];
  const tx = {
    $queryRaw: async () => [],
    storeCreditAccount: { upsert: async () => ({ id: account.id }), findUniqueOrThrow: async () => account,
      update: async ({ data }: { data: { balanceCents: { decrement: number } } }) => { account.balanceCents -= data.balanceCents.decrement; return account; } },
    storeCreditTransaction: { findUnique: async ({ where }: { where: { eventKey: string } }) => entries.get(where.eventKey),
      create: async ({ data }: { data: Record<string, unknown> }) => { entries.set(data.eventKey as string, data); return data; } },
    auditLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); } },
  } as unknown as Prisma.TransactionClient;
  return { account, entries, audits, tx };
}
const input = { customerId: "customer", orderId: "order", number: "WF-SYNTHETIC", cents: 600 };

test("crédito é reservado uma vez e repetição incompatível não movimenta saldo", async () => {
  const f = fixture();
  await reserveStoreCredit(f.tx, input);
  await reserveStoreCredit(f.tx, input);
  assert.equal(f.account.balanceCents, 400);
  assert.equal(f.entries.size, 1);
  assert.equal([...f.entries.values()][0].amountCents, -600);
  assert.equal(f.audits.length, 1);
  await assert.rejects(reserveStoreCredit(f.tx, { ...input, cents: 601 }), StoreCreditRuleError);
  assert.equal(f.account.balanceCents, 400);
});

test("saldo insuficiente, negativo, em revisão ou valor inválido não gera reserva", async () => {
  for (const [balance, review] of [[599, false], [-200, false], [1000, true]] as const) {
    const f = fixture(balance, review);
    await assert.rejects(reserveStoreCredit(f.tx, input), StoreCreditRuleError);
    assert.equal(f.account.balanceCents, balance);
    assert.equal(f.entries.size, 0);
  }
  for (const cents of [-1, 0.1, NaN, Infinity, 600_000_001]) {
    const f = fixture();
    await assert.rejects(reserveStoreCredit(f.tx, { ...input, cents }), StoreCreditRuleError);
    assert.equal(f.entries.size, 0);
  }
  const f = fixture();
  await reserveStoreCredit(f.tx, { ...input, cents: 0 });
  assert.equal(f.entries.size, 0);
});
