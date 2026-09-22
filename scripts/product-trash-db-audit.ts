import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { moveProductToTrash, purgeExpiredProducts, restoreTrashedProduct } from "../src/features/products/trash-service";

// This audit must only run in the disposable, isolated QA container/database.
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(process.env.PRODUCT_TRASH_QA, "1");
  assert.equal(url.hostname, "wimifarma-br-trash-qa");
  assert.equal(url.pathname, "/trash_qa");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) });
  try {
    assert.equal(await db.product.count(), 0, "QA database must start empty");
    const admin = await db.user.create({ data: { name: "QA", email: "fixture@example.invalid", passwordHash: "disabled-fixture", role: "ADMIN" } });
    const customer = await db.customer.create({ data: { name: "Synthetic QA", cashbackAccount: { create: { balance: 1, transactions: { create: { type: "CREDIT", amount: 1, description: "Synthetic reward", reference: "review-order:fixture-order" } } } } } });
    const create = (slug: string) => db.product.create({ data: { name: `Synthetic ${slug}`, slug, price: 10, stock: 4, status: "ACTIVE", featuredPosition: slug === "expired" ? 1 : null } });
    const expired = await create("expired"), restorable = await create("restorable"), retained = await create("retained");
    const offer = await db.offer.create({ data: { productId: expired.id, title: "Synthetic offer", slug: "fixture-offer", offerPrice: 9, status: "ACTIVE", highlight: true } });
    const order = await db.order.create({ data: { id: "fixture-order", number: "QA-ONLY", customerId: customer.id, customerName: "Synthetic QA", customerPhone: "00000000000", fulfillmentMethod: "PICKUP", paymentMethod: "CASH", subtotalCents: 1000, totalCents: 1000, privacyConsentAt: new Date(), items: { create: { productId: expired.id, productName: expired.name, productSlug: expired.slug, quantity: 1, unitPriceCents: 1000, totalCents: 1000 } } } });
    await db.productReview.create({ data: { productId: expired.id, customerId: customer.id, orderId: order.id, rating: 5, comment: "Synthetic QA", cashbackRewardCents: 100, cashbackRewardState: "CREDITED" } });
    const now = new Date(), past = new Date(now.getTime() - 100 * 86400000);
    for (const product of [expired, restorable, retained]) await db.$transaction(tx => moveProductToTrash(tx, product.id, product.updatedAt, admin.id, product.id === expired.id ? past : now));
    assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).status, "ARCHIVED");
    await assert.rejects(() => db.product.update({ where: { id: retained.id }, data: { status: "ACTIVE" } }), "Database must prevent publishing a trashed product");
    await assert.rejects(() => db.$transaction(tx => restoreTrashedProduct(tx, expired.id, now, admin.id, now)));
    const current = await db.product.findUniqueOrThrow({ where: { id: restorable.id } });
    await db.$transaction(tx => restoreTrashedProduct(tx, current.id, current.updatedAt, admin.id, now));
    const restored = await db.product.findUniqueOrThrow({ where: { id: current.id } });
    assert.equal(restored.status, "DRAFT"); assert.equal(restored.stock, 4); assert.equal(restored.price.toString(), "10");
    assert.equal(await db.$transaction(tx => purgeExpiredProducts(tx, now)), 1);
    assert.equal(await db.product.count(), 2);
    assert.equal(await db.$transaction(tx => purgeExpiredProducts(tx, now)), 0, "Purge is idempotent");
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    assert.equal(item.productId, null); assert.equal(item.productName, expired.name); assert.equal(item.totalCents, 1000);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).totalCents, 1000);
    assert.equal((await db.cashbackAccount.findUniqueOrThrow({ where: { customerId: customer.id } })).balance.toString(), "1");
    assert.equal(await db.cashbackTransaction.count(), 1);
    assert.equal((await db.cashbackTransaction.findFirstOrThrow()).reference, "review-order:fixture-order");
    assert.equal(await db.productReview.count(), 0);
    assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).productId, null);
    assert.equal(await db.auditLog.count({ where: { action: "PRODUCT_PURGED" } }), 1);
    console.log(JSON.stringify({ migration: "validated", restore: "draft", purge: "expired only, idempotent", orders: "preserved", cashback: "preserved", realData: false }));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
