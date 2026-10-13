import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { productWimicoinsPoints } from "./rules";
import { grantOwnerWimicoins, joinClub, resolveClubCustomer, settleOrderWimicoins } from "./service";
import { reserveWimicoins } from "./wallet";

function fixture() {
  const account = { id: "wallet", customerId: "customer", balancePoints: 500, lifetimeEarnedPoints: 500, lifetimeRedeemedPoints: 0, transactions: [] };
  const order = { id: "order", number: "W-1", customerId: "customer", status: "PENDING", paymentStatus: "PENDING", wimicoinsEarnedPoints: 100, wimicoinsState: "PENDING", wimicoinsRedeemedPoints: 200, wimicoinsRedemptionState: "RESERVED" };
  const events = new Map<string, { accountId: string; type: string; amountPoints: number }>();
  const audits: unknown[] = [];
  let membership: { active: boolean; joinedAt: Date } | null = { active: true, joinedAt: new Date(0) };
  let user: { id: string; role: string; isActive: boolean; customerId: string | null; name: string; email: string; customer: { status: string } } | null = { id: "admin", role: "ADMIN", isActive: true, customerId: "customer", name: "Synthetic", email: "synthetic@example.com", customer: { status: "ACTIVE" } };
  let conflict = false;
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async () => user, update: async ({ data }: { data: { customerId: string } }) => { user!.customerId = data.customerId; } },
    customer: { findUnique: async ({ where }: { where: { email?: string } }) => where.email ? (conflict ? { id: "other" } : null) : { id: "customer" }, create: async () => ({ id: "customer" }) },
    clubMembership: { findUnique: async () => membership, upsert: async () => { membership = membership ?? { active: true, joinedAt: new Date(0) }; membership.active = true; } },
    wimicoinAccount: { upsert: async () => ({ id: account.id }), findUniqueOrThrow: async () => account, findUnique: async () => account,
      update: async ({ data }: { data: Record<string, { increment?: number; decrement?: number }> }) => { for (const [key, change] of Object.entries(data)) account[key as "balancePoints"] += (change.increment ?? 0) - (change.decrement ?? 0); } },
    wimicoinTransaction: { findUnique: async ({ where }: { where: { eventKey: string } }) => events.get(where.eventKey) ?? null, create: async ({ data }: { data: { eventKey: string; accountId: string; type: string; amountPoints: number } }) => { assert.equal(events.has(data.eventKey), false); events.set(data.eventKey, data); } },
    order: { findUniqueOrThrow: async () => ({ ...order }), update: async ({ data }: { data: object }) => Object.assign(order, data), aggregate: async () => ({ _sum: { wimicoinsEarnedPoints: 100 } }) },
    auditLog: { create: async (data: unknown) => { audits.push(data); } },
  } as unknown as Prisma.TransactionClient;
  return { tx, account, order, events, audits, setMember: (value: boolean) => { membership = value ? { active: true, joinedAt: new Date(0) } : null; }, setUser: (value: typeof user) => { user = value; }, user: () => user!, setConflict: () => { conflict = true; } };
}

test("WimiCoins use paid price, default 2%, unit rounding and exclude restricted items", () => {
  assert.equal(productWimicoinsPoints({ wimicoinsEnabled: true }, 999, 3), 60);
  assert.equal(productWimicoinsPoints({ wimicoinsEnabled: true }, 500, 2), 20);
  for (const product of [{}, { wimicoinsEnabled: true, requiresPrescription: true }, { wimicoinsEnabled: true, isPopularPharmacy: true }]) assert.equal(productWimicoinsPoints(product, 1000), 0);
  assert.throws(() => productWimicoinsPoints({ wimicoinsEnabled: true }, -1));
});

test("reservation is serialized, idempotent and rejects insufficient balance and nonmembers", async () => {
  const f = fixture();
  const input = { customerId: "customer", orderId: "order", number: "W-1", points: 200 };
  await reserveWimicoins(f.tx, input); await reserveWimicoins(f.tx, input);
  assert.equal(f.account.balancePoints, 300); assert.equal(f.events.size, 1);
  await assert.rejects(reserveWimicoins(f.tx, { ...input, orderId: "other", points: 400 }));
  await assert.rejects(reserveWimicoins(f.tx, { ...input, points: 201 }));
  f.setMember(false); await assert.rejects(reserveWimicoins(f.tx, { ...input, orderId: "other" }));
});

test("completion requires both completed and paid; cancellation reverses both benefits only once", async () => {
  const f = fixture();
  await reserveWimicoins(f.tx, { customerId: "customer", orderId: "order", number: "W-1", points: 200 });
  f.order.status = "COMPLETED";
  await settleOrderWimicoins(f.tx, "order"); assert.equal(f.account.balancePoints, 300);
  f.order.paymentStatus = "PAID";
  await settleOrderWimicoins(f.tx, "order"); await settleOrderWimicoins(f.tx, "order");
  assert.equal(f.account.balancePoints, 400); assert.equal(f.account.lifetimeRedeemedPoints, 200);
  f.order.paymentStatus = "REFUNDED";
  await settleOrderWimicoins(f.tx, "order"); await settleOrderWimicoins(f.tx, "order");
  assert.equal(f.account.balancePoints, 500); assert.equal(f.account.lifetimeEarnedPoints, 500); assert.equal(f.account.lifetimeRedeemedPoints, 0);
  assert.equal(f.order.wimicoinsState, "REVERSED"); assert.equal(f.order.wimicoinsRedemptionState, "RETURNED");
});

test("pending cancellation voids reward and returns reservation once", async () => {
  const f = fixture(); await reserveWimicoins(f.tx, { customerId: "customer", orderId: "order", number: "W-1", points: 200 });
  f.order.status = "CANCELED"; await settleOrderWimicoins(f.tx, "order"); await settleOrderWimicoins(f.tx, "order");
  assert.equal(f.account.balancePoints, 500); assert.equal(f.order.wimicoinsState, "VOIDED"); assert.equal(f.account.lifetimeRedeemedPoints, 0);
});

test("join is explicit and repeated join never grants welcome points", async () => {
  const f = fixture(); f.setMember(false);
  const session = { user: { id: "customer", role: "CUSTOMER" } };
  assert.equal((await joinClub(f.tx, session)).member, true); await joinClub(f.tx, session);
  assert.equal(f.events.size, 0); assert.equal(f.account.balancePoints, 500); assert.equal(f.audits.length, 1);
});

test("staff identity uses persistent link, does not merge matching email and rejects disabled users", async () => {
  const f = fixture(); const session = { user: { id: "admin", role: "ADMIN", customerId: "forged" } };
  assert.equal(await resolveClubCustomer(f.tx, session), "customer");
  f.user().customerId = null; assert.equal(await resolveClubCustomer(f.tx, session), null);
  f.setConflict(); await assert.rejects(joinClub(f.tx, session), error => (error as { status: number }).status === 409);
  f.user().isActive = false; await assert.rejects(resolveClubCustomer(f.tx, session));
  await assert.rejects(resolveClubCustomer(f.tx, null));
});

test("owner grant requires active ADMIN and explicit link and is idempotent", async () => {
  const f = fixture(); const input = { userId: "admin", points: 500, eventKey: "owner:synthetic" };
  await grantOwnerWimicoins(f.tx, input); await grantOwnerWimicoins(f.tx, input);
  assert.equal(f.account.balancePoints, 1000); assert.equal(f.events.size, 1); assert.equal(f.audits.length, 1);
  await assert.rejects(grantOwnerWimicoins(f.tx, { ...input, points: 501 }));
  f.user().role = "MANAGER"; await assert.rejects(grantOwnerWimicoins(f.tx, input));
  f.user().role = "ADMIN"; f.user().customerId = null; await assert.rejects(grantOwnerWimicoins(f.tx, input));
});
