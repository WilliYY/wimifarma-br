import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import { build } from "esbuild";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createCheckout } from "../src/features/orders/create-checkout";
import { checkoutRequestSchema } from "../src/features/orders/checkout";
import { settleOrderBenefits } from "../src/features/cashback/redemption";
import { expireSupplierOrders } from "../src/features/supplier-catalog/maintenance";
import { normalizeGtin, toSaleProduct } from "../src/features/supplier-catalog/commerce";
import { encryptValue } from "../src/lib/secret-vault";

// Never accept a production connection. Run in a disposable, private Docker network.
async function main() {
  if (process.env.SUPPLIER_CATALOG_QA !== "isolated-disposable") throw new Error("Disposable QA mode required.");
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL ?? ""); } catch { throw new Error("Disposable QA connection required."); }
  if (process.env.SUPPLIER_CATALOG_QA !== "isolated-disposable" || url.protocol !== "postgresql:" || url.hostname !== "wimifarma-br-supplier-qa" || url.port !== "5432" || url.pathname !== "/supplier_qa" || url.username !== "qa" || url.password !== "synthetic-qa-only" || url.search || url.hash) throw new Error("Only the exact disposable synthetic QA connection is allowed.");
  process.env.AUTH_SECRET = "synthetic-supplier-qa-auth-secret";
  process.env.SECRET_VAULT_KEY = "synthetic-supplier-qa-vault-secret";
  const db = new PrismaClient({ adapter: new PrismaPg({ host: "wimifarma-br-supplier-qa", port: 5432, database: "supplier_qa", user: "qa", password: "synthetic-qa-only", ssl: false }) });
  let networkCalls = 0;
  const remotes = new Map<string, Record<string, unknown>>();
  const bundle = await build({ entryPoints: ["src/features/payments/service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "supplier-gateway-isolation", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^next\/headers$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>null;" : args.path.endsWith("headers") ? "export const cookies=async()=>({get:()=>undefined});" : "export const getPrisma=()=>fixture.db;" }));
  } }] });
  type Remote = Record<string, unknown>;
  type Api = { startPayment(id: string, input: { method: "pix"; email: string }): Promise<unknown>; applyProviderOrder(remote: Remote): Promise<unknown> };
  const loaded = { exports: {} as Api };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: { db },
    URL, Request, Response, Headers, AbortSignal, console, process, Buffer,
    fetch: async (target: string, options: RequestInit) => {
      assert.match(target, /^https:\/\/api\.mercadopago\.com\/v1\/orders$/);
      networkCalls++;
      const body = JSON.parse(String(options.body));
      const remote = { id: `ORD${body.external_reference.toUpperCase()}`, type: "online", external_reference: body.external_reference,
        total_amount: body.total_amount, country_code: "BRA", user_id: "123", status: "action_required", status_detail: "waiting_transfer", last_updated_date: new Date().toISOString(),
        transactions: { payments: [{ amount: body.total_amount, status: "action_required", status_detail: "waiting_transfer", date_of_expiration: new Date(Date.now() + 7200000).toISOString(), payment_method: { id: "pix", type: "bank_transfer" } }] } };
      remotes.set(body.external_reference, remote);
      return new Response(JSON.stringify(remote));
    } });
  const api = loaded.exports;
  try {
    assert.equal(await db.product.count(), 0, "QA database must start empty");
    assert.equal(await db.order.count(), 0);
    await db.paymentIntegration.create({ data: { id: "mercado-pago", enabled: true, environment: "production", publicKey: "synthetic", accountId: "123", ...encryptValue(JSON.stringify({ accessToken: "synthetic-token", webhookSecret: "synthetic-secret" })) } });
    const own = await db.product.create({ data: { name: "Synthetic pharmacy", slug: "qa-pharmacy", price: 10, stock: 7, status: "ACTIVE" } });
    const product = await db.product.create({ data: { name: "Synthetic supplier", slug: "qa-supplier", ean: "1234567890128", eanNormalized: normalizeGtin("1234567890128"), price: 16, stock: 3, inventorySource: "DISTRIBUTOR", status: "ACTIVE" } });
    const offerData = { productId: product.id, eanNormalized: product.eanNormalized!, available: true, allocationQuantity: 5, observedAt: new Date(Date.now() - 1000), validUntil: new Date(Date.now() + 3600000) };
    const anb = await db.supplierCatalogOffer.create({ data: { ...offerData, supplier: "ANB", externalCode: "synthetic-a", unitCostCents: 1000 } });
    const profarma = await db.supplierCatalogOffer.create({ data: { ...offerData, supplier: "PROFARMA", externalCode: "synthetic-p", unitCostCents: 1200 } });
    const input = (quantity = 1, online = false) => checkoutRequestSchema.parse({ customer: { name: "Synthetic customer", email: "buyer@example.invalid", phone: "00000000000" }, fulfillmentMethod: "PICKUP", paymentMethod: online ? "ONLINE" : "CASH", privacyConsent: true, checkoutRequestId: crypto.randomUUID(), items: [{ productId: product.id, quantity, expectedUnitPriceCents: 1600 }] });
    const physical = async () => (await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
    const reservations = await Promise.allSettled([db.$transaction(tx => createCheckout(tx, input(3))), db.$transaction(tx => createCheckout(tx, input(3)))]);
    if (!reservations.some(row => row.status === "fulfilled")) console.error("QA_CHECKOUT_REJECTIONS", reservations.map(row => row.status === "rejected" && row.reason instanceof Error ? row.reason.message : row.status));
    assert.equal(reservations.filter(row => row.status === "fulfilled").length, 1, "concurrent checkouts must not exceed allocation or change price");
    assert.equal((await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: anb.id } })).reservedQuantity, 3);
    assert.equal(await physical(), 3, "physical stock is never the external allocation");
    const held = await db.order.findFirstOrThrow();
    await db.$transaction(async tx => { await tx.order.update({ where: { id: held.id }, data: { status: "CANCELED", paymentStatus: "CANCELED" } }); await settleOrderBenefits(tx, held.id); });
    assert.equal((await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: anb.id } })).reservedQuantity, 0);
    const order = await db.$transaction(tx => createCheckout(tx, input(1, true)));
    assert.ok(order.preparationReadyAt);
    assert.ok(order.preparationDays >= 1);
    const pay = () => api.startPayment(order.id, { method: "pix", email: "buyer@example.invalid" });
    await db.supplierCatalogOffer.update({ where: { id: profarma.id }, data: { unitCostCents: 500 } });
    await assert.rejects(pay(), /nova condição/);
    assert.equal(networkCalls, 0, "cheaper offer must not silently charge the old price");
    await db.supplierCatalogOffer.update({ where: { id: profarma.id }, data: { unitCostCents: 1200 } });
    await pay();
    const payment = await db.onlinePayment.findUniqueOrThrow({ where: { orderId: order.id } });
    const pending = remotes.get(payment.id)!;
    const pendingTransactions = pending.transactions as { payments: Record<string, unknown>[] };
    const paid = { ...pending, status: "processed", status_detail: "accredited", last_updated_date: new Date(Date.now() + 1000).toISOString(), transactions: { payments: [{ ...pendingTransactions.payments[0], status: "processed", status_detail: "accredited" }] } };
    await Promise.all([api.applyProviderOrder(paid), api.applyProviderOrder(paid)]);
    const consumed = await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: anb.id } });
    assert.equal(consumed.reservedQuantity, 0); assert.equal(consumed.committedQuantity, 1);
    assert.equal(networkCalls, 1);
    await api.applyProviderOrder({ ...paid, status: "refunded", status_detail: "refunded", last_updated_date: new Date(Date.now() + 2000).toISOString() });
    assert.equal(await physical(), 3);
    assert.equal((await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: anb.id } })).committedQuantity, 1, "refund never claims a supplier replenishment");
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: own.id } })).stock, 7);
    const abandoned = await db.$transaction(tx => createCheckout(tx, input()));
    await db.order.update({ where: { id: abandoned.id }, data: { createdAt: new Date(Date.now() - 25 * 3600000) } });
    await expireSupplierOrders(db);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: abandoned.id } })).status, "CANCELED");
    assert.equal((await db.supplierCatalogOffer.findUniqueOrThrow({ where: { id: anb.id } })).reservedQuantity, 0);
    await db.supplierCatalogOffer.updateMany({ data: { available: false } });
    const unavailable = await db.product.findUniqueOrThrow({ where: { id: product.id }, include: { supplierOffers: true } });
    assert.equal(toSaleProduct(unavailable).stock, 0);
    await assert.rejects(() => db.$transaction(tx => createCheckout(tx, input())));
    await assert.rejects(() => db.product.create({ data: { name: "Duplicate", slug: "qa-duplicate", price: 16, eanNormalized: product.eanNormalized } }));
    console.log("PASS: migration, concurrent allocation, same-EAN cheapest offer, stale-price payment refusal, one synthetic gateway submission, idempotent settlement/refund, separate physical stock, abandoned order expiry, unavailable offers and unique GTIN.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "QA failed"); process.exitCode = 1; });
