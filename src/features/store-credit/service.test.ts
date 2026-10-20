import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { settleIssuedStoreCredits, settleOrderStoreCredit } from "./service";

function fixture() {
  const order = { id: "source", number: "WF-SYNTHETIC", customerId: "customer", hasItemShortages: true, status: "PREPARING", paymentStatus: "PAID",
    storeCreditRedeemedCents: 0, storeCreditReturnedCents: 0, storeCreditRedemptionState: "NONE" };
  const account = { id: "wallet", balanceCents: 100, reviewRequired: false };
  const shortage = { id: "missing", cashPaidCents: 500, creditState: "ISSUED" };
  const entries = new Map<string, { amountCents: number }>();
  const audits: unknown[] = [];
  const tx = {
    $queryRaw: async () => [],
    order: { findUniqueOrThrow: async () => order, update: async ({ data }: { data: object }) => Object.assign(order, data) },
    cashbackAccount: { upsert: async () => ({ id: "cashback" }), findUniqueOrThrow: async () => ({ id: "cashback" }) },
    storeCreditAccount: { upsert: async () => ({ id: account.id }), findUniqueOrThrow: async () => account,
      update: async ({ data }: { data: { balanceCents?: { increment?: number; decrement?: number }; reviewRequired?: boolean } }) => {
        account.balanceCents += (data.balanceCents?.increment ?? 0) - (data.balanceCents?.decrement ?? 0);
        if (data.reviewRequired !== undefined) account.reviewRequired = data.reviewRequired;
        return account;
      } },
    orderItemShortage: { findMany: async () => ["ISSUED", "REVIEW"].includes(shortage.creditState) ? [shortage] : [],
      updateMany: async ({ data }: { data: { creditState?: string } }) => { if (data.creditState) shortage.creditState = data.creditState; },
      update: async ({ data }: { data: { creditState: string } }) => Object.assign(shortage, data),
      count: async () => shortage.creditState === "REVIEW" ? 1 : 0 },
    storeCreditTransaction: { findUnique: async ({ where }: { where: { eventKey: string } }) => entries.get(where.eventKey),
      create: async ({ data }: { data: { eventKey: string; amountCents: number } }) => { entries.set(data.eventKey, data); return data; } },
    auditLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); } },
  } as unknown as Prisma.TransactionClient;
  return { order, account, shortage, entries, audits, tx };
}

test("estorno confirmado revoga emissão já usada sem gerar saldo reutilizável ou débito duplo", async () => {
  const f = fixture();
  await settleIssuedStoreCredits(f.tx, "source", "REFUNDED");
  await settleIssuedStoreCredits(f.tx, "source", "REFUNDED");
  assert.equal(f.account.balanceCents, -400);
  assert.equal(f.entries.size, 1);
  assert.equal(f.shortage.creditState, "REVERSED");
});

test("cancelar atendimento pago não revoga crédito; parcial bloqueia uma vez até revisão", async () => {
  const f = fixture();
  f.order.status = "CANCELED";
  await settleIssuedStoreCredits(f.tx, "source");
  assert.equal(f.account.balanceCents, 100);
  f.order.status = "PREPARING";
  await settleIssuedStoreCredits(f.tx, "source", "PARTIALLY_REFUNDED");
  const auditCount = f.audits.length;
  await settleIssuedStoreCredits(f.tx, "source", "PARTIALLY_REFUNDED");
  assert.equal(f.account.reviewRequired, true);
  assert.equal(f.shortage.creditState, "REVIEW");
  assert.equal(f.entries.size, 0);
  assert.equal(f.audits.length, auditCount);
  await settleIssuedStoreCredits(f.tx, "source", "REFUNDED");
  assert.equal(f.account.reviewRequired, false);
  assert.equal(f.account.balanceCents, -400);
});

test("cancelamento devolve só crédito antigo restante e revoga apenas emissão nova", async () => {
  const f = fixture();
  Object.assign(f.order, { status: "CANCELED", paymentStatus: "REFUNDED", storeCreditRedeemedCents: 500, storeCreditReturnedCents: 200, storeCreditRedemptionState: "RESERVED" });
  f.account.balanceCents = 600; // 200 restituídos da compra anterior + 400 novos pela falta.
  f.shortage.cashPaidCents = 400;
  await settleOrderStoreCredit(f.tx, "source");
  await settleIssuedStoreCredits(f.tx, "source", "REFUNDED");
  await settleOrderStoreCredit(f.tx, "source");
  assert.equal(f.account.balanceCents, 500);
  assert.equal(f.order.storeCreditReturnedCents, 500);
  assert.equal(f.entries.size, 2);
});
