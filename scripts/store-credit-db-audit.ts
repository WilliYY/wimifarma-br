import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { proposeItemShortage, decideItemShortage } from "../src/features/orders/item-shortage-service";
import { reserveStoreCredit } from "../src/features/store-credit/wallet";
import { settleIssuedStoreCredits } from "../src/features/store-credit/service";
import { settleOrderBenefits } from "../src/features/cashback/redemption";
import { settleOrderCashback } from "../src/features/cashback/service";
import { settleSupplierOrder } from "../src/features/supplier-catalog/inventory";

async function main() {
  // Fail closed before constructing a database client or issuing any query.
  assert.equal(process.env.STORE_CREDIT_QA, "true", "STORE_CREDIT_QA=true obrigatório.");
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL explícita obrigatória.");
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.protocol, "postgresql:");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55449");
  assert.equal(url.pathname, "/storecredit_test");
  const pool = new Pool({ connectionString: url.toString(), max: 8 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const checks: string[] = [];
  const prefix = `store-credit-qa-${randomUUID()}`;
  const transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => db.$transaction(work, { timeout: 30000, maxWait: 30000 });
  const lock = async (tx: Prisma.TransactionClient, id: string) => { await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`; };
  const balances = async (customerId: string) => ({
    cashback: Number((await db.cashbackAccount.findUniqueOrThrow({ where: { customerId } })).balance.toString()),
    coins: (await db.wimicoinAccount.findUniqueOrThrow({ where: { customerId } })).balancePoints,
    credit: (await db.storeCreditAccount.findUniqueOrThrow({ where: { customerId } })).balanceCents,
  });
  try {
    const admin = await db.user.create({ data: { name: "Operador sintético", email: `${prefix}@example.test`, passwordHash: "SYNTHETIC-NOT-A-LOGIN", role: "ADMIN" } });
    const stranger = await db.customer.create({ data: { name: "Outro cliente sintético", email: `${prefix}-other@example.test` } });
    async function source(suffix: string, consumed = true) {
      const customer = await db.customer.create({ data: { name: "Cliente sintético QA", email: `${prefix}-${suffix}@example.test`, cashbackAccount: { create: {} }, wimicoinAccount: { create: {} }, storeCreditAccount: { create: {} } } });
      const product = await db.product.create({ data: { name: "Produto sintético QA", slug: `${prefix}-${suffix}`, price: 10, inventorySource: "DISTRIBUTOR", stock: 17, status: "ACTIVE" } });
      const offer = await db.supplierCatalogOffer.create({ data: { productId: product.id, supplier: "ANB", externalCode: `${prefix}-${suffix}`, eanNormalized: "7890000000000", unitCostCents: 500, available: true, observedAt: new Date(), validUntil: new Date(Date.now() + 3600000), allocationQuantity: 20, reservedQuantity: consumed ? 0 : 3, committedQuantity: consumed ? 3 : 0 } });
      const order = await db.order.create({ data: { number: `${prefix}-${suffix}`, customerId: customer.id, customerName: customer.name, customerPhone: "44999990000", fulfillmentMethod: "PICKUP", paymentMethod: "PIX", paymentStatus: "PAID", status: "PREPARING", subtotalCents: 3000, totalCents: 2037, deliveryFeeCents: 0, privacyConsentAt: new Date(), preparationDays: 1, cashbackRedeemedCents: 300, cashbackRedemptionState: "RESERVED", wimicoinsRedeemedPoints: 300, wimicoinsRedemptionState: "RESERVED", storeCreditRedeemedCents: 300, storeCreditRedemptionState: "RESERVED", cashbackEarnedCents: 7, cashbackState: "PENDING", wimicoinsEarnedPoints: 5, wimicoinsState: "PENDING", items: { create: { productId: product.id, productName: product.name, productSlug: product.slug, quantity: 3, unitPriceCents: 1000, totalCents: 3000, inventorySource: "DISTRIBUTOR", supplierOfferId: offer.id, cashbackDiscountCents: 300, wimicoinsDiscountPoints: 300, storeCreditDiscountCents: 300, cashbackEarnedCents: 7, wimicoinsEarnedPoints: 5, supplierReservation: { create: { offerId: offer.id, quantity: 3, unitCostCents: 500, status: consumed ? "CONSUMED" : "ACTIVE" } } } } }, include: { items: true } });
      const propose = async (quantity = 1) => { const current = await db.order.findUniqueOrThrow({ where: { id: order.id } }); return transaction(tx => proposeItemShortage(tx, { orderId: order.id, orderItemId: order.items[0].id, quantity, expectedUpdatedAt: current.updatedAt.toISOString(), actorId: admin.id })); };
      return { customer, product, offer, order, propose };
    }
    const f = await source("combined");
    const shortage = await f.propose();
    assert.deepEqual([shortage.cashPaidCents, shortage.cashbackReturnCents, shortage.wimicoinsReturnPoints, shortage.storeCreditReturnCents], [679, 100, 100, 100]);
    const choose = (override = {}) => transaction(tx => decideItemShortage(tx, { orderId: f.order.id, shortageId: shortage.id, version: shortage.version, decision: "ACCEPT_CREDIT", consent: true, customerId: f.customer.id, ...override }));
    const before = await balances(f.customer.id);
    await assert.rejects(choose({ customerId: stranger.id }));
    await assert.rejects(choose({ consent: false }));
    await assert.rejects(choose({ version: 99 }));
    await assert.rejects(f.propose(3));
    assert.deepEqual(await balances(f.customer.id), before);
    checks.push("Proposta: rateio C/W/S/P exato; conta alheia, consentimento, versão e excesso rejeitados sem saldo.");
    const race = await Promise.all([choose(), choose()]);
    assert.ok(race.every(row => row.status === "CREDIT_ACCEPTED"));
    await choose();
    assert.equal(await db.storeCreditTransaction.count({ where: { shortageId: shortage.id, kind: "ISSUE" } }), 1);
    assert.deepEqual(await balances(f.customer.id), { cashback: 1, coins: 100, credit: 779 });
    const saved = await db.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { items: true } });
    assert.deepEqual([saved.cashbackReturnedCents, saved.wimicoinsReturnedPoints, saved.storeCreditReturnedCents, saved.cashbackEarnedVoidedCents, saved.wimicoinsEarnedVoidedPoints], [100, 100, 100, 3, 2]);
    assert.deepEqual([saved.totalCents, saved.items[0].quantity, saved.items[0].totalCents, saved.items[0].shortageQuantity], [2037, 3, 3000, 1]);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 17);
    assert.equal((await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: f.offer.id } })).committedQuantity, 2);
    assert.equal((await db.supplierInventoryReservation.findUniqueOrThrow({ where: { orderItemId: f.order.items[0].id } })).releasedQuantity, 1);
    checks.push("PostgreSQL concorrente: dois aceites e replay emitem uma vez; snapshots/counters e estoque físico preservados.");

    const spending = await db.order.create({ data: { number: `${prefix}-spending`, customerId: f.customer.id, customerName: "Sintético", customerPhone: "44999990000", fulfillmentMethod: "PICKUP", paymentMethod: "CASH", privacyConsentAt: new Date(), subtotalCents: 1000, totalCents: 221, storeCreditRedeemedCents: 779, storeCreditRedemptionState: "RESERVED" } });
    await transaction(async tx => { await lock(tx, spending.id); await reserveStoreCredit(tx, { customerId: f.customer.id, orderId: spending.id, number: spending.number, cents: 779 }); });
    assert.equal((await balances(f.customer.id)).credit, 0);
    async function settleSource(paymentStatus: "PAID" | "REFUNDED") {
      await transaction(async tx => { await lock(tx, f.order.id); await tx.order.update({ where: { id: f.order.id }, data: { status: "CANCELED", paymentStatus } }); await settleIssuedStoreCredits(tx, f.order.id); await settleOrderCashback(tx, f.order.id); await settleOrderBenefits(tx, f.order.id); });
    }
    await settleSource("PAID"); await settleSource("PAID");
    assert.deepEqual(await balances(f.customer.id), { cashback: 3, coins: 300, credit: 200 });
    assert.equal((await db.orderItemShortage.findUniqueOrThrow({ where: { id: shortage.id } })).creditState, "ISSUED");
    await settleSource("REFUNDED"); await settleSource("REFUNDED");
    assert.deepEqual(await balances(f.customer.id), { cashback: 3, coins: 300, credit: -479 });
    assert.equal(await db.storeCreditTransaction.count({ where: { shortageId: shortage.id, kind: "REVERSAL" } }), 1);
    await assert.rejects(transaction(tx => reserveStoreCredit(tx, { customerId: f.customer.id, orderId: `${prefix}-blocked`, number: "QA", cents: 1 })));
    await transaction(async tx => { await lock(tx, spending.id); await tx.order.update({ where: { id: spending.id }, data: { status: "CANCELED" } }); await settleOrderBenefits(tx, spending.id); await settleOrderBenefits(tx, spending.id); });
    assert.equal((await balances(f.customer.id)).credit, 300);
    assert.equal(await db.storeCreditTransaction.count({ where: { orderId: spending.id, kind: "RETURN" } }), 1);
    checks.push("Crédito gasto: cancelamento PAID preserva emissão; reembolso revoga uma vez, saldo negativo bloqueia; cancelar resgate devolve uma vez.");

    const active = await source("active", false); const activeShortage = await active.propose();
    await transaction(tx => decideItemShortage(tx, { orderId: active.order.id, shortageId: activeShortage.id, version: activeShortage.version, decision: "ACCEPT_CREDIT", consent: true, customerId: active.customer.id }));
    assert.equal((await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: active.offer.id } })).reservedQuantity, 2);
    await transaction(async tx => { await lock(tx, active.order.id); await settleSupplierOrder(tx, active.order.id, "PREPARING", "PAID"); });
    const activeOffer = await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: active.offer.id } });
    assert.deepEqual([activeOffer.reservedQuantity, activeOffer.committedQuantity], [0, 2]);
    await transaction(async tx => { await lock(tx, active.order.id); await tx.order.update({ where: { id: active.order.id }, data: { status: "COMPLETED" } }); await settleOrderCashback(tx, active.order.id); await settleOrderBenefits(tx, active.order.id); });
    const earned = await balances(active.customer.id); assert.equal(earned.cashback, 1.04); assert.equal(earned.coins, 103);
    checks.push("Reservas ACTIVE/CONSUMED liberam só a falta; conclusão ganha apenas cashback/Coins das unidades entregues.");

    const refund = await source("refund-request"); const refundShortage = await refund.propose();
    await transaction(tx => decideItemShortage(tx, { orderId: refund.order.id, shortageId: refundShortage.id, version: refundShortage.version, decision: "REQUEST_REFUND", customerId: refund.customer.id }));
    assert.deepEqual(await balances(refund.customer.id), { cashback: 0, coins: 0, credit: 0 });
    assert.equal(await db.storeCreditTransaction.count({ where: { shortageId: refundShortage.id } }), 0);
    checks.push("REQUEST_REFUND agenda atendimento sem emitir crédito nem anunciar devolução financeira.");

    const { createCheckout } = await import("../src/features/orders/create-checkout");
    const { checkoutRequestSchema } = await import("../src/features/orders/checkout");
    const physical = await db.product.create({ data: { name: "Produto físico sintético", slug: `${prefix}-physical`, price: 10, stock: 10, status: "ACTIVE" } });
    const checkout = await transaction(tx => createCheckout(tx, checkoutRequestSchema.parse({ customer: { name: "Cliente sintético", phone: "44999990000", email: `${prefix}-combined@example.test` }, fulfillmentMethod: "PICKUP", paymentMethod: "PIX", privacyConsent: true, checkoutRequestId: randomUUID(), storeCreditRedeemCents: 100, items: [{ productId: physical.id, quantity: 1, expectedUnitPriceCents: 1000 }] }), f.customer.id));
    assert.equal(checkout.storeCreditRedeemedCents, 100); assert.equal(checkout.totalCents, 873); assert.equal((await balances(f.customer.id)).credit, 200);
    checks.push("Checkout real sintético: crédito de 100 centavos reservado; Pix 3% sobre 900 resulta total 873, sem gateway.");
    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } finally { await db.$disconnect(); await pool.end(); }
}

main().catch(error => {
  const message = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL REDACTED]").slice(0, 1000) : "Falha de integração.";
  console.error(JSON.stringify({ ok: false, error: message })); process.exitCode = 1;
});
