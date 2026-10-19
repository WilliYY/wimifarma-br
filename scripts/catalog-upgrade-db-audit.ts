import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { bulkProductUpdateSchema, type BulkProductChanges } from "../src/features/products/catalog-bulk";
import { updateCatalogBulk } from "../src/features/products/catalog-bulk-service";
import { ProductMutationError } from "../src/features/products/mutations";
import { normalizeGtin } from "../src/features/supplier-catalog/commerce";
import { reserveSupplierInventory, settleSupplierOrder, validateSupplierPayment } from "../src/features/supplier-catalog/inventory";
import { createCheckout } from "../src/features/orders/create-checkout";
import { checkoutRequestSchema } from "../src/features/orders/checkout";

// Only the explicitly named disposable database is accepted. Never load .env here.
const QA_DATABASE = "wimifarma_br_catalog_qa_20261019";
const rollback = new Error("SYNTHETIC_CATALOG_QA_ROLLBACK");

function qaConnection() {
  if (process.env.CATALOG_UPGRADE_QA !== "isolated-disposable") throw new Error("Disposable catalog QA mode required.");
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL ?? ""); } catch { throw new Error("Disposable catalog QA connection required."); }
  if (url.protocol !== "postgresql:" || !["postgres", "wimifarma-br-postgres", "127.0.0.1", "localhost"].includes(url.hostname) ||
    (url.port !== "" && url.port !== "5432") || url.pathname !== `/${QA_DATABASE}` || !url.username || url.search || url.hash) {
    throw new Error("Only the exact isolated catalog QA database is allowed.");
  }
  // Explicit fields prevent connection-string query parameters from redirecting the database.
  return { host: url.hostname, port: 5432, database: QA_DATABASE, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), ssl: false as const };
}

async function counts(db: PrismaClient) {
  const [products, users, orders, items, offers, reservations, audit] = await Promise.all([
    db.product.count(), db.user.count(), db.order.count(), db.orderItem.count(),
    db.supplierCatalogOffer.count(), db.supplierInventoryReservation.count(), db.auditLog.count(),
  ]);
  return { products, users, orders, items, offers, reservations, audit };
}

async function fixtures(tx: Prisma.TransactionClient) {
  const admin = await tx.user.create({ data: { id: "catalog-qa-admin", name: "Synthetic QA ADMIN", email: "catalog-admin@example.invalid", passwordHash: "disabled-synthetic-fixture", role: "ADMIN" } });
  const manager = await tx.user.create({ data: { id: "catalog-qa-manager", name: "Synthetic QA MANAGER", email: "catalog-manager@example.invalid", passwordHash: "disabled-synthetic-fixture", role: "MANAGER" } });
  const pharmacy = await tx.product.create({ data: { id: "catalog-qa-a", name: "Synthetic pharmacy A", slug: "catalog-qa-a", price: 10, stock: 7, status: "ACTIVE", featuredPosition: 1 } });
  const second = await tx.product.create({ data: { id: "catalog-qa-b", name: "Synthetic pharmacy B", slug: "catalog-qa-b", price: 20, stock: 11, status: "ACTIVE" } });
  const supplier = await tx.product.create({ data: { id: "catalog-qa-c", name: "Synthetic supplier", slug: "catalog-qa-c", price: 16, stock: 3, status: "ACTIVE", inventorySource: "DISTRIBUTOR", ean: "1234567890128", eanNormalized: normalizeGtin("1234567890128"), requiresPrescription: true, prescriptionType: "ORDINARY" } });
  const offer = await tx.supplierCatalogOffer.create({ data: { productId: supplier.id, supplier: "ANB", externalCode: "catalog-synthetic-only", eanNormalized: supplier.eanNormalized!, unitCostCents: 1000, retailCeilingCents: 5000, available: true, stockQuantity: 100, allocationQuantity: 5, observedAt: new Date(Date.now() - 1000), validUntil: new Date(Date.now() + 3600000) } });
  return { admin, manager, pharmacy, second, supplier, offer };
}

async function bulkInput(tx: Prisma.TransactionClient, ids: string[], changes: BulkProductChanges) {
  const products = await tx.product.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } });
  assert.equal(products.length, ids.length);
  return bulkProductUpdateSchema.parse({ items: products.map(product => ({ id: product.id, expectedUpdatedAt: product.updatedAt.toISOString() })), changes });
}

async function auditBehavior(tx: Prisma.TransactionClient) {
  const { admin, manager, pharmacy, second, supplier, offer } = await fixtures(tx);
  const immutable = async () => tx.product.findMany({ orderBy: { id: "asc" }, select: { id: true, inventorySource: true, stock: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, ean: true, eanNormalized: true, price: true, promotionalPrice: true } });
  const original = await immutable();
  const snapshot = async () => ({ products: await tx.product.findMany({ orderBy: { id: "asc" } }), audit: await tx.auditLog.count() });
  const unchangedAfter = async (operation: () => Promise<unknown>, status?: number) => {
    const before = await snapshot();
    await assert.rejects(operation, error => error instanceof ProductMutationError && (status === undefined || error.status === status));
    assert.deepEqual(await snapshot(), before, "Rejected bulk must preserve every product and audit row");
  };

  const stale = await bulkInput(tx, [pharmacy.id, second.id], { category: "Synthetic stale category" });
  await tx.product.update({ where: { id: second.id }, data: { updatedAt: new Date(second.updatedAt.getTime() + 1000) } });
  await unchangedAfter(() => updateCatalogBulk(tx, stale, admin.id), 409);
  const benefits = await bulkInput(tx, [pharmacy.id, second.id], { cashbackEnabled: true, cashbackRateBps: 300, wimicoinsEnabled: true, wimicoinsRateBps: 400 });
  await unchangedAfter(() => updateCatalogBulk(tx, benefits, manager.id), 403);
  await unchangedAfter(() => updateCatalogBulk(tx, benefits, "catalog-qa-missing-actor"), 403);
  await tx.user.update({ where: { id: manager.id }, data: { isActive: false } });
  const statusInput = await bulkInput(tx, [pharmacy.id, second.id], { status: "DRAFT", category: "Synthetic category" });
  await unchangedAfter(() => updateCatalogBulk(tx, statusInput, manager.id), 403);
  await tx.user.update({ where: { id: manager.id }, data: { isActive: true } });
  const changed = await updateCatalogBulk(tx, statusInput, manager.id);
  assert.equal(changed.length, 2);
  for (const id of [pharmacy.id, second.id]) {
    const product = await tx.product.findUniqueOrThrow({ where: { id } });
    assert.equal(product.status, "DRAFT");
    assert.equal(product.category, "Synthetic category");
    assert.equal(product.featuredPosition, null, "Unpublishing clears featured placement");
  }
  await updateCatalogBulk(tx, await bulkInput(tx, [pharmacy.id, second.id], benefits.changes), admin.id);
  for (const id of [pharmacy.id, second.id]) {
    const product = await tx.product.findUniqueOrThrow({ where: { id } });
    assert.equal(product.cashbackEnabled, true); assert.equal(product.cashbackRateBps, 300);
    assert.equal(product.wimicoinsEnabled, true); assert.equal(product.wimicoinsRateBps, 400);
  }
  const rxBenefits = await bulkInput(tx, [pharmacy.id, supplier.id], { cashbackEnabled: true });
  await unchangedAfter(() => updateCatalogBulk(tx, rxBenefits, admin.id));
  const mixedMarkup = await bulkInput(tx, [pharmacy.id, supplier.id], { supplierMarkupBps: 5000 });
  await unchangedAfter(() => updateCatalogBulk(tx, mixedMarkup, admin.id));
  for (const status of ["ACTIVE", "ARCHIVED"] as const) {
    await updateCatalogBulk(tx, await bulkInput(tx, [pharmacy.id, second.id], { status }), manager.id);
    assert.equal(await tx.product.count({ where: { id: { in: [pharmacy.id, second.id] }, status } }), 2);
  }
  await updateCatalogBulk(tx, await bulkInput(tx, [supplier.id], { supplierMarkupBps: 5000 }), admin.id);
  assert.equal((await tx.product.findUniqueOrThrow({ where: { id: supplier.id } })).supplierMarkupBps, 5000);
  assert.deepEqual(await immutable(), original, "Bulk preserves origin, prescription, identity, price and physical stock");
  assert.deepEqual(await tx.supplierCatalogOffer.findUniqueOrThrow({ where: { id: offer.id } }), offer, "Bulk must not rewrite observed supplier inventory");
  const logs = await tx.auditLog.findMany({ where: { action: "PRODUCT_BULK_UPDATED" } });
  assert.equal(logs.length, 9, "Exactly one audit row per successfully changed product");
  for (const log of logs) {
    assert.equal(log.entity, "Product");
    assert.ok([admin.id, manager.id].includes(log.userId!));
    const metadata = log.metadata as { before: Record<string, unknown>; after: Record<string, unknown>; count: number };
    assert.ok(metadata.before && metadata.after);
    assert.equal(metadata.count, log.entityId === supplier.id ? 1 : 2);
    assert.deepEqual(Object.keys(metadata.before).sort(), Object.keys(metadata.after).sort());
  }
  const markupLog = logs.find(log => log.entityId === supplier.id)!;
  assert.equal(markupLog.userId, admin.id);
  assert.deepEqual(markupLog.metadata, { before: { supplierMarkupBps: 6000 }, after: { supplierMarkupBps: 5000 }, count: 1 });

  const createItem = async (suffix: string, quantity: number, supplierDemandAllowed?: boolean) => {
    const order = await tx.order.create({ data: { number: `SYNTHETIC-CATALOG-${suffix}`, customerName: "Synthetic QA", customerPhone: "00000000000", fulfillmentMethod: "PICKUP", paymentMethod: "CASH", subtotalCents: quantity * 1500, totalCents: quantity * 1500, privacyConsentAt: new Date(), items: { create: { productId: supplier.id, productName: supplier.name, productSlug: supplier.slug, inventorySource: "DISTRIBUTOR", supplierOfferId: offer.id, supplierDemandAllowed, quantity, unitPriceCents: 1500, totalCents: quantity * 1500 } } } });
    return { order, item: await tx.orderItem.findFirstOrThrow({ where: { orderId: order.id } }) };
  };
  const pricing = { ...supplier, supplierMarkupBps: 5000 };
  const demand = await createItem("demand", 150, true);
  await reserveSupplierInventory(tx, demand.item, pricing);
  await reserveSupplierInventory(tx, demand.item, pricing);
  await validateSupplierPayment(tx, demand.item, pricing);
  assert.equal((await tx.supplierCatalogOffer.findUniqueOrThrow({ where: { id: offer.id } })).reservedQuantity, 150);
  assert.equal(await tx.supplierInventoryReservation.count(), 1, "Reservation retry is idempotent");
  await settleSupplierOrder(tx, demand.order.id, "CANCELED", "CANCELED");
  await settleSupplierOrder(tx, demand.order.id, "CANCELED", "CANCELED");
  assert.equal((await tx.supplierInventoryReservation.findUniqueOrThrow({ where: { orderItemId: demand.item.id } })).status, "RELEASED");
  await assert.rejects(() => validateSupplierPayment(tx, demand.item, pricing), /Reserva do distribuidor indisponível/);
  const legacyOverflow = await createItem("legacy-overflow", 6);
  assert.equal(legacyOverflow.item.supplierDemandAllowed, false, "Database migration defaults historical items to legacy allocation");
  await assert.rejects(() => reserveSupplierInventory(tx, legacyOverflow.item, pricing), /oferta do distribuidor mudou/);
  const legacy = await createItem("legacy", 5);
  await reserveSupplierInventory(tx, legacy.item, pricing);
  await validateSupplierPayment(tx, legacy.item, pricing);
  await tx.supplierCatalogOffer.update({ where: { id: offer.id }, data: { allocationQuantity: 4 } });
  await assert.rejects(() => validateSupplierPayment(tx, legacy.item, pricing), /Preço ou disponibilidade/);
  await tx.supplierCatalogOffer.update({ where: { id: offer.id }, data: { allocationQuantity: 5 } });
  await settleSupplierOrder(tx, legacy.order.id, "CANCELED", "CANCELED");
  await settleSupplierOrder(tx, legacy.order.id, "CANCELED", "CANCELED");
  const finalOffer = await tx.supplierCatalogOffer.findUniqueOrThrow({ where: { id: offer.id } });
  assert.equal(finalOffer.stockQuantity, 100); assert.equal(finalOffer.allocationQuantity, 5);
  assert.equal(finalOffer.reservedQuantity, 0); assert.equal(finalOffer.committedQuantity, 0);
  assert.deepEqual(await immutable(), original, "Supplier allocation and cancellation never consume PHARMACY stock or change prescription");

  const checkout = await createCheckout(tx, checkoutRequestSchema.parse({
    customer: { name: "Cliente exclusivamente sintético QA", phone: "44999999999", email: "catalog-checkout@example.invalid" },
    fulfillmentMethod: "PICKUP", paymentMethod: "CASH", privacyConsent: true,
    items: [{ productId: supplier.id, quantity: 150, expectedUnitPriceCents: 1500 }],
  }));
  const checkoutItem = await tx.orderItem.findFirstOrThrow({ where: { orderId: checkout.id } });
  assert.equal(checkoutItem.quantity, 150);
  assert.equal(checkoutItem.supplierDemandAllowed, true, "Actual checkout persists the demand policy, not just the service fixture");
  assert.equal(checkoutItem.inventorySource, "DISTRIBUTOR");
  assert.equal(checkout.totalCents, 225000);
  assert.equal(checkout.paymentStatus, "PENDING", "Creating an order must never invent payment approval");
  await validateSupplierPayment(tx, checkoutItem, pricing);
  await settleSupplierOrder(tx, checkout.id, "CANCELED", "CANCELED");
  await settleSupplierOrder(tx, checkout.id, "CANCELED", "CANCELED");
  assert.equal((await tx.supplierCatalogOffer.findUniqueOrThrow({ where: { id: offer.id } })).reservedQuantity, 0);
  assert.equal(await tx.miaubyEvent.count(), 0, "Synthetic checkout must not enqueue an external communication");
  assert.deepEqual(await immutable(), original);
}

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg(qaConnection()) });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Network is disabled in disposable catalog QA."); };
  try {
    const identity = await db.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`;
    assert.equal(identity[0]?.database, QA_DATABASE);
    const empty = { products: 0, users: 0, orders: 0, items: 0, offers: 0, reservations: 0, audit: 0 };
    assert.deepEqual(await counts(db), empty, "QA database must contain no application data");
    // All fixtures and successful mutations roll back, allowing an identical rerun.
    await assert.rejects(db.$transaction(async tx => { await auditBehavior(tx); throw rollback; }, { timeout: 60000 }), error => error === rollback);
    assert.deepEqual(await counts(db), empty, "Behavior audit must leave no synthetic records");

    // Force a real SQL audit failure after a product update. The transaction must
    // roll back products, fixtures, audits and the temporary QA constraint together.
    let reachedAuditFailure = false;
    await assert.rejects(db.$transaction(async tx => {
      const { admin, pharmacy, second } = await fixtures(tx);
      await tx.$executeRaw`ALTER TABLE "AuditLog" ADD CONSTRAINT "catalog_qa_reject_bulk_audit" CHECK (action <> 'PRODUCT_BULK_UPDATED')`;
      reachedAuditFailure = true;
      await updateCatalogBulk(tx, await bulkInput(tx, [pharmacy.id, second.id], { category: "Synthetic rejected category" }), admin.id);
    }, { timeout: 30000 }), error => error instanceof Error && /catalog_qa_reject_bulk_audit/.test(error.message));
    assert.equal(reachedAuditFailure, true);
    assert.deepEqual(await counts(db), empty, "Audit failure must roll back all product writes and fixtures");
    const constraints = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_constraint WHERE conname = 'catalog_qa_reject_bulk_audit'`;
    assert.equal(Number(constraints[0]?.count), 0, "Synthetic constraint must roll back too");
    console.log(JSON.stringify({ ok: true, database: QA_DATABASE, bulk: "atomic, stale-safe, ADMIN/MANAGER, status and audit verified", supplier: "150 demand vs legacy allocation 5, payment validation and idempotent cancellation", preserved: "physical stock, origins, prescriptions and observed supplier stock", fixtures: "synthetic only; all rolled back", realPayments: false, externalMessages: false }));
  } finally { globalThis.fetch = previousFetch; await db.$disconnect(); }
}

main().catch(error => {
  // Do not print connection strings, query arguments or Prisma error internals.
  console.error(error instanceof assert.AssertionError ? `Catalog QA assertion failed: ${error.message}` : error instanceof Error && /^(Disposable catalog|Only the exact)/.test(error.message) ? error.message : "Catalog QA failed; inspect the isolated database and local diagnostics.");
  process.exitCode = 1;
});
