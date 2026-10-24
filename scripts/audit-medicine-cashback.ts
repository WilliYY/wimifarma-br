import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/lib/prisma";
import { cashbackEligibleWhere } from "../src/features/cashback/eligibility";
import { cashbackProductIsEligible, productCashbackCents } from "../src/features/cashback/rules";
import { applyMedicineCashback, planMedicineCashback } from "../src/features/cashback/medicine-activation";
import { settleOrderCashback } from "../src/features/cashback/service";
import { productWimicoinsPoints } from "../src/features/club/rules";
import type { Prisma } from "../src/generated/prisma/client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  assert.equal(url.pathname, "/wimifarma_br_chat5_cashback_rx_qa_20261023");
  assert.equal(process.env.CASHBACK_RX_AUDIT, "synthetic-only");
  const db = getPrisma();
  const source = "a".repeat(40);
  const prefix = `cashback-rx-qa-${randomUUID()}`;
  const rollback = new Error("EXPECTED_SYNTHETIC_ROLLBACK");
  const checks: string[] = [];
  try {
    assert.equal(await db.product.count(), 0, "Somente banco QA vazio.");
    assert.equal(await db.customer.count(), 0);
    assert.equal(await db.user.count(), 0);
    try {
      await db.$transaction(async tx => {
        const admin = await tx.user.create({ data: { name: "Synthetic ADMIN", email: `${prefix}@example.test`, passwordHash: "synthetic-unusable", role: "ADMIN" } });
        const classification = { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false };
        const variants = [
          {}, { catalogClassification: { ...classification, medicineClass: "SIMILAR" }, prescriptionType: "ANTIMICROBIAL" },
          { catalogClassification: { ...classification, medicineClass: "REFERENCE" } },
          { catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC" } },
          { catalogClassification: { ...classification, unknown: true } },
          { prescriptionType: "UNREVIEWED" }, { prescriptionType: "CONTROLLED" }, { isPopularPharmacy: true },
          { requiresPrescription: false, prescriptionType: "UNREVIEWED", catalogClassification: { ...classification, otc: true } },
        ] as const;
        const products = [];
        for (const [index, variant] of variants.entries()) {
          products.push(await tx.product.create({ data: { name: `Synthetic ${index}`, slug: `${prefix}-${index}`, price: "20.00", status: "ACTIVE",
            requiresPrescription: true, prescriptionType: "ORDINARY", catalogClassification: classification, ...variant } as Prisma.ProductCreateInput }));
        }
        const databaseEligible = await tx.product.findMany({ where: cashbackEligibleWhere, select: { id: true } });
        assert.deepEqual(databaseEligible.map(p => p.id).sort(), products.filter(cashbackProductIsEligible).map(p => p.id).sort());
        checks.push("PostgreSQL JSONB: elegibilidade exata, parciais/extras/referencia/controlado/FP excluidos");
        const plan = await planMedicineCashback(tx, source);
        assert.equal(plan.items.length, 3);
        await assert.rejects(applyMedicineCashback(tx, plan, admin.id, "b".repeat(40)));
        await assert.rejects(applyMedicineCashback(tx, plan, admin.id, source, new Date(Date.parse(plan.createdAt) + 16 * 60_000)));
        await assert.rejects(applyMedicineCashback(tx, plan, "missing-admin", source));
        const changed = await applyMedicineCashback(tx, plan, admin.id, source);
        assert.equal(changed.length, 3);
        assert.equal(await tx.auditLog.count({ where: { action: "PRODUCT_BULK_UPDATED" } }), 3);
        await assert.rejects(applyMedicineCashback(tx, plan, admin.id, source));
        assert.equal(await tx.auditLog.count({ where: { action: "PRODUCT_BULK_UPDATED" } }), 3);
        checks.push("Plano: somente 3 elegiveis, ADMIN/versionamento/expiracao/repeticao protegidos, auditoria atomica");
        const enabled = await tx.product.findUniqueOrThrow({ where: { id: products[0].id } });
        assert.equal(productCashbackCents(enabled, 2000), 20);
        assert.equal(productWimicoinsPoints({ ...enabled, wimicoinsEnabled: true }, 2000), 0);
        const customer = await tx.customer.create({ data: { name: "Synthetic customer" } });
        const order = await tx.order.create({ data: { number: prefix, customerId: customer.id, customerName: "Synthetic customer", customerPhone: "synthetic",
          fulfillmentMethod: "PICKUP", paymentMethod: "PIX", status: "PENDING", paymentStatus: "PENDING", subtotalCents: 2000, totalCents: 2000,
          privacyConsentAt: new Date(), cashbackEarnedCents: 20, cashbackState: "PENDING",
          items: { create: { productId: enabled.id, productName: enabled.name, productSlug: enabled.slug, quantity: 1, unitPriceCents: 2000, totalCents: 2000, cashbackRateBps: 100, cashbackEarnedCents: 20 } } } });
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
        await settleOrderCashback(tx, order.id);
        assert.equal(await tx.cashbackTransaction.count(), 0);
        await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED", paymentStatus: "PAID" } });
        await settleOrderCashback(tx, order.id);
        await settleOrderCashback(tx, order.id);
        assert.equal((await tx.cashbackAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balance.toFixed(2), "0.20");
        await tx.product.update({ where: { id: enabled.id }, data: { cashbackEnabled: false, cashbackRateBps: 500 } });
        assert.equal((await tx.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).cashbackRateBps, 100);
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUNDED" } });
        await settleOrderCashback(tx, order.id);
        await settleOrderCashback(tx, order.id);
        assert.equal((await tx.cashbackAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balance.toFixed(2), "0.00");
        assert.equal(await tx.cashbackTransaction.count(), 2);
        checks.push("Credito 20c so COMPLETED+PAID, snapshot preservado, WimiCoins zero, estorno unico de 20c");
        throw rollback;
      }, { timeout: 60_000 });
    } catch (error) { if (error !== rollback) throw error; }
    for (const count of await Promise.all([db.product.count(), db.user.count(), db.customer.count(), db.order.count(), db.cashbackAccount.count(), db.cashbackTransaction.count(), db.auditLog.count()])) assert.equal(count, 0);
    checks.push("Rollback real: nenhum produto, usuario, pedido, saldo ou auditoria sintetico persistido");
    console.log(JSON.stringify({ ok: true, database: url.pathname.slice(1), productionWrites: false, checks }));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Auditoria sintetica falhou."); process.exitCode = 1; });
