import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { getClubSummary, grantOwnerWimicoins, joinClub, resolveClubCustomer } from "../src/features/club/service";
import { ClubRuleError } from "../src/features/club/wallet";
import { createCheckout } from "../src/features/orders/create-checkout";
import { checkoutRequestSchema } from "../src/features/orders/checkout";
import { settleOrderCashback } from "../src/features/cashback/service";
import { settleOrderBenefits } from "../src/features/cashback/redemption";
import { lockCashbackAccount } from "../src/features/cashback/wallet";
import { saveRewardedReview } from "../src/features/cashback/review-service";

// Auditoria destrutiva apenas no banco QA vazio. Repetir exige recriar o banco QA.
// Não carregar .env, iniciar workers, chamar gateways ou enviar mensagens.
function guardedDatabaseUrl() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "QA_DATABASE_PROTOCOL_REQUIRED");
  assert.equal(url.hostname, "db-club-qa", "QA_DATABASE_HOST_REQUIRED");
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^wimifarma_club_qa[a-zA-Z0-9_]*$/, "QA_DATABASE_NAME_REQUIRED");
  assert.equal(url.searchParams.get("host"), null, "QA_DATABASE_HOST_OVERRIDE_FORBIDDEN");
  assert.equal(url.searchParams.get("hostaddr"), null, "QA_DATABASE_ADDRESS_OVERRIDE_FORBIDDEN");
  return url.toString();
}

async function main() {
  const connectionString = guardedDatabaseUrl();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("QA_EXTERNAL_HTTP_FORBIDDEN"); };
  const pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 10_000 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const transaction = <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) => db.$transaction(callback, { timeout: 30_000, maxWait: 30_000 });
  let passed = 0;
  const check = (name: string) => { passed++; console.log(`PASS ${name}`); };
  const prefix = `club-qa-${randomUUID()}`;
  try {
    const [customers, users, orders, products, events] = await Promise.all([db.customer.count(), db.user.count(), db.order.count(), db.product.count(), db.miaubyEvent.count()]);
    assert.equal(customers + users + orders + products + events, 0, "QA_DATABASE_MUST_BE_PRISTINE");
    assert.equal(await db.paymentIntegration.count(), 0, "QA_PAYMENT_INTEGRATIONS_FORBIDDEN");
    assert.equal(await db.miaubyConfig.count({ where: { enabled: true } }), 0, "QA_COMMERCE_TRANSPORT_FORBIDDEN");
    check("guarded-pristine-database");

    const customer = await db.customer.create({ data: { name: "QA Club Synthetic", email: `${prefix}@example.invalid` } });
    const nonmember = await db.customer.create({ data: { name: "QA Nonmember Synthetic", email: `${prefix}-other@example.invalid` } });
    const owner = await db.user.create({ data: { name: "QA Owner Synthetic", email: `${prefix}-owner@example.invalid`, passwordHash: "qa-not-a-valid-password-hash", role: "ADMIN", customerId: customer.id } });
    const staff = await db.user.create({ data: { name: "QA Staff Synthetic", email: `${prefix}-staff@example.invalid`, passwordHash: "qa-not-a-valid-password-hash", role: "STAFF" } });
    const memberSession = { user: { id: customer.id, role: "CUSTOMER" } };
    assert.equal((await transaction(tx => getClubSummary(tx, customer.id))).member, false);
    await transaction(tx => joinClub(tx, memberSession));
    await transaction(tx => joinClub(tx, memberSession));
    assert.equal(await db.clubMembership.count({ where: { customerId: customer.id } }), 1);
    assert.equal(await db.wimicoinTransaction.count(), 0);
    const staffSession = { user: { id: staff.id, role: "STAFF", customerId: customer.id } };
    assert.equal(await transaction(tx => resolveClubCustomer(tx, staffSession)), null);
    await transaction(tx => joinClub(tx, staffSession));
    const linkedStaff = await db.user.findUniqueOrThrow({ where: { id: staff.id }, select: { customerId: true } });
    assert.ok(linkedStaff.customerId && linkedStaff.customerId !== customer.id);
    const conflictCustomer = await db.customer.create({ data: { name: "QA Conflicting Synthetic", email: `${prefix}-conflict@example.invalid` } });
    const conflictUser = await db.user.create({ data: { name: "QA Conflict Synthetic", email: conflictCustomer.email!, passwordHash: "qa-not-a-valid-password-hash", role: "ADMIN" } });
    await assert.rejects(transaction(tx => joinClub(tx, { user: { id: conflictUser.id, role: "ADMIN" } })), error => error instanceof ClubRuleError && error.status === 409);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: conflictUser.id } })).customerId, null);
    check("explicit-idempotent-membership-and-no-email-merge");

    const grant = { userId: owner.id, points: 500, eventKey: `owner:${prefix}:500` };
    await transaction(tx => grantOwnerWimicoins(tx, grant));
    await transaction(tx => grantOwnerWimicoins(tx, grant));
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 500);
    assert.equal(await db.wimicoinTransaction.count({ where: { eventKey: grant.eventKey } }), 1);
    await assert.rejects(transaction(tx => grantOwnerWimicoins(tx, { ...grant, userId: staff.id, eventKey: `denied:${prefix}` })), error => error instanceof ClubRuleError && error.status === 403);
    await db.cashbackAccount.create({ data: { customerId: customer.id, balance: "10.00", lifetimeEarned: "10.00" } });
    await db.cashbackAccount.create({ data: { customerId: nonmember.id, balance: "10.00" } });
    // Saldo sintético de não membro prova que saldo sozinho não autoriza o resgate.
    await db.wimicoinAccount.create({ data: { customerId: nonmember.id, balancePoints: 500 } });
    check("owner-grant-500-idempotent-and-admin-only");

    const product = await db.product.create({ data: { name: "QA Coin Product", slug: `${prefix}-product`, price: "20.00", stock: 100, status: "ACTIVE", cashbackEnabled: true, cashbackRateBps: 200, wimicoinsEnabled: true, wimicoinsRateBps: 200 } });
    const request = (coins: number, cashback = 0, quantity = 1) => checkoutRequestSchema.parse({ customer: { name: "QA Buyer Synthetic", phone: "44999999999", email: customer.email }, fulfillmentMethod: "PICKUP", paymentMethod: "CASH", privacyConsent: true, cashbackRedeemCents: cashback, wimicoinsRedeemPoints: coins, checkoutRequestId: randomUUID(), items: [{ productId: product.id, quantity, expectedUnitPriceCents: 2000 }] });
    const input = request(300, 200, 2);
    const order = await transaction(tx => createCheckout(tx, input, customer.id));
    const persisted = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    assert.equal(persisted.totalCents, 3500);
    assert.equal(persisted.cashbackEarnedCents, 70);
    assert.equal(persisted.wimicoinsEarnedPoints, 70);
    assert.equal(persisted.items.reduce((sum, item) => sum + item.cashbackDiscountCents + item.wimicoinsDiscountPoints, 0), 500);
    assert.equal(persisted.wimicoinsRedemptionState, "RESERVED");
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 200);
    assert.equal((await db.cashbackAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balance.toString(), "8");
    assert.equal((await transaction(tx => createCheckout(tx, input, customer.id))).id, order.id);
    await assert.rejects(transaction(tx => createCheckout(tx, { ...input, notes: "changed synthetic payload" }, customer.id)));
    assert.equal(await db.order.count({ where: { checkoutRequestId: input.checkoutRequestId } }), 1);
    check("combined-discounts-liquid-rewards-reservation-and-replay");

    const beforeRejected = await db.order.count();
    await assert.rejects(transaction(tx => createCheckout(tx, request(201), customer.id)));
    await assert.rejects(transaction(tx => createCheckout(tx, request(100), nonmember.id)));
    await assert.rejects(transaction(tx => createCheckout(tx, request(100))));
    assert.equal(await db.order.count(), beforeRejected);
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 200);
    check("insufficient-nonmember-and-anonymous-reservation-rollback");

    async function settle(orderId: string, update: { status?: "COMPLETED" | "CANCELED"; paymentStatus?: "PAID" | "REFUNDED" }) {
      await transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
        const current = await tx.order.update({ where: { id: orderId }, data: update });
        await lockCashbackAccount(tx, current.customerId!);
        await settleOrderCashback(tx, orderId);
        await settleOrderBenefits(tx, orderId);
      });
    }
    await settle(order.id, { status: "COMPLETED" });
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 200);
    await settle(order.id, { paymentStatus: "PAID" });
    await settle(order.id, {});
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 270);
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).lifetimeRedeemedPoints, 300);
    const review = await transaction(tx => saveRewardedReview(tx, customer.id, product.id, { rating: 1, comment: "Experiência sintética para verificar o benefício." }));
    assert.equal(review.awardedCents, 18);
    assert.equal((await transaction(tx => saveRewardedReview(tx, customer.id, product.id, { rating: 5, comment: "Revisão sintética sem segundo benefício." }))).awardedCents, 0);
    const eventsBeforeRefund = await db.wimicoinTransaction.count();
    await settle(order.id, { paymentStatus: "REFUNDED" });
    await settle(order.id, {});
    const restored = await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } });
    assert.equal(restored.balancePoints, 500); assert.equal(restored.lifetimeEarnedPoints, 500); assert.equal(restored.lifetimeRedeemedPoints, 0);
    assert.equal((await db.cashbackAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balance.toString(), "10");
    assert.equal(await db.wimicoinTransaction.count(), eventsBeforeRefund + 2);
    check("completed-paid-review-and-full-refund-once");

    const races = await Promise.allSettled([request(500), request(500)].map(attempt => transaction(tx => createCheckout(tx, attempt, customer.id))));
    assert.equal(races.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(races.filter(result => result.status === "rejected").length, 1);
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 0);
    const winner = races.find(result => result.status === "fulfilled");
    assert.ok(winner?.status === "fulfilled");
    await settle(winner.value.id, { status: "CANCELED" });
    await settle(winner.value.id, {});
    assert.equal((await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balancePoints, 500);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: winner.value.id } })).wimicoinsState, "VOIDED");
    assert.equal(await db.miaubyEvent.count(), 0);
    assert.equal(await db.onlinePayment.count(), 0);
    check("concurrent-last-balance-single-winner-and-pending-cancel-once");
    console.log(`AUDIT_PASS checks=${passed}`);
  } finally {
    await db.$disconnect();
    await pool.end();
    globalThis.fetch = originalFetch;
  }
}

main().catch(error => {
  // Não emitir stack, SQL, URLs, credenciais ou dados sintéticos.
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "AUDIT_FAILED";
  console.error(`AUDIT_FAIL code=${code}`);
  process.exitCode = 1;
});
