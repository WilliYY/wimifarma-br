import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { toSaleProduct } from "./commerce";

const bundle = build({ entryPoints: ["src/features/orders/create-checkout.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "supplier-continuity-checkout", setup(builder) {
  builder.onResolve({ filter: /features\/cashback\/(rules|wallet)$|features\/shipping\/service$|features\/payments\/routing$|features\/miauby\/commerce-service$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
    args.path.endsWith("rules") ? "export const productCashbackCents=()=>0;" :
    args.path.endsWith("wallet") ? "export class CashbackRuleError extends Error{}; export const lockCashbackAccount=()=>{throw new Error('unexpected wallet access')};" :
    args.path.endsWith("shipping/service") ? "export const validateOrderShipping=async()=>null;" :
    args.path.endsWith("routing") ? "export const checkoutPaymentConnections=async()=>{throw new Error('unexpected payment access')}; export const resolveCheckoutPayment=async()=>{throw new Error('unexpected payment access')};" : "export const queueCommerceOrder=async()=>{};",
  }));
} }] });

async function fixture() {
  const now = Date.now();
  const offer = { id: "synthetic-offer", productId: "synthetic-product", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 1000, retailCeilingCents: 2000, available: true, stockQuantity: 3, allocationQuantity: 2, reservedQuantity: 1, committedQuantity: 1,
    observedAt: new Date(now - 7 * 86_400_000), validUntil: new Date(now - 6 * 86_400_000) };
  const product = { id: offer.productId, name: "Produto sintético", slug: "produto-sintetico", imageUrl: null, price: "99.00", promotionalPrice: null, status: "ACTIVE", stock: 17,
    inventorySource: "DISTRIBUTOR" as const, ean: "1234567890128", supplierMarkupBps: 4000, supplierOffers: [offer], requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false, cashbackEnabled: false, cashbackRateBps: 0 };
  let saved: Record<string, unknown> | undefined;
  let items: Array<{ id: string; quantity: number; supplierOfferId: string; supplierDemandAllowed: boolean; unitPriceCents: number }> = [];
  const reservations: Array<{ quantity: number; unitCostCents: number }> = [];
  const tx = {
    $queryRaw: async () => [],
    product: { findMany: async () => [product] },
    order: { create: async ({ data }: { data: Record<string, unknown> & { items: { create: typeof items } } }) => {
      items = data.items.create.map(item => ({ ...item, id: "synthetic-item" }));
      saved = { ...data, id: "synthetic-order" }; return saved;
    }, findUniqueOrThrow: async () => saved },
    orderItem: { findMany: async () => items },
    supplierCatalogOffer: { findUnique: async () => offer, update: async ({ data }: { data: { reservedQuantity: { increment: number } } }) => { offer.reservedQuantity += data.reservedQuantity.increment; return offer; } },
    supplierInventoryReservation: { findUnique: async () => null, create: async ({ data }: { data: typeof reservations[number] }) => { reservations.push(data); return data; } },
  };
  const loaded = { exports: {} as { createCheckout(tx: unknown, input: unknown): Promise<unknown> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), crypto: webcrypto, console });
  return { offer, product, reservations, saved: () => saved, items: () => items, run: (expectedUnitPriceCents = 1400) => loaded.exports.createCheckout(tx, {
    customer: { name: "Cliente sintético", email: "synthetic@example.com", phone: "44999999999" }, fulfillmentMethod: "PICKUP", paymentMethod: "CASH", cashbackRedeemCents: 0, privacyConsent: true,
    items: [{ productId: product.id, quantity: 4, expectedUnitPriceCents }],
  }) };
}

test("checkout real cria pedido pelo preço contínuo da vitrine e registra reserva sem alterar estoque ou datas", async () => {
  const f = await fixture();
  const dates = [f.offer.observedAt.getTime(), f.offer.validUntil.getTime()];
  assert.equal(toSaleProduct(f.product).price, "14.00");
  await f.run();
  assert.equal(f.saved()?.subtotalCents, 5600);
  assert.equal(f.items()[0].unitPriceCents, 1400);
  assert.equal(f.items()[0].supplierOfferId, f.offer.id);
  assert.equal(f.items()[0].supplierDemandAllowed, true);
  assert.equal(f.reservations[0].quantity, 4);
  assert.equal(f.reservations[0].unitCostCents, 1000);
  assert.equal(f.offer.reservedQuantity, 5);
  assert.equal(f.offer.committedQuantity, 1);
  assert.equal(f.offer.allocationQuantity, 2);
  assert.equal(f.product.stock, 17);
  assert.deepEqual([f.offer.observedAt.getTime(), f.offer.validUntil.getTime()], dates);
});

test("continuidade no checkout preserva bloqueios por indisponibilidade, preço divergente e medicamento controlado", async () => {
  const unavailable = await fixture();
  unavailable.offer.available = false;
  await assert.rejects(unavailable.run());
  assert.equal(unavailable.saved(), undefined);
  const price = await fixture();
  await assert.rejects(price.run(1000));
  assert.equal(price.saved(), undefined);
  const controlled = await fixture();
  Object.assign(controlled.product, { requiresPrescription: true, prescriptionType: "CONTROLLED" });
  await assert.rejects(controlled.run(), /precisa de atendimento/);
  assert.equal(controlled.saved(), undefined);
  assert.equal(controlled.reservations.length, 0);
});
