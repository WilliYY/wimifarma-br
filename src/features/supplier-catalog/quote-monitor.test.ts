import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { resolveSupplierOffer, withCommerceAvailability } from "./commerce";
import { recordSupplierAbsence, recordSupplierQuote, type SupplierQuoteInput } from "./quote-monitor";
import { isUnusualSupplierIncrease } from "./quote-policy";

const ean = "01234567890128";
const now = Date.now();
const input: SupplierQuoteInput = { productId: "synthetic", supplier: "ANB", externalCode: "synthetic-anb", eanNormalized: ean,
  unitCostCents: 4800, retailCeilingCents: 10000, substitutionTaxCents: null, allocationQuantity: 5,
  available: true, stockQuantity: 2, observedAt: new Date(now - 1000).toISOString(), validUntil: new Date(now + 290_000).toISOString() };

function fixture({ previousCost = 5000, reservation = false } = {}) {
  const product = { id: input.productId, inventorySource: "DISTRIBUTOR" as const, ean, eanNormalized: ean, price: "99.00", stock: 0,
    supplierPricingBasis: null as unknown, supplierMarkupBps: 6000,
    supplierOffers: [{ ...input, id: "offer", eanNormalized: ean, unitCostCents: previousCost, observedAt: new Date(now - 86_400_000),
      validUntil: new Date(now - 1), reservedQuantity: 0, committedQuantity: 0, revision: 1 }] };
  const observations = new Map<string, Record<string, unknown>>();
  const tx = {
    $queryRaw: async () => [],
    product: {
      findUnique: async () => product,
      update: async ({ data }: { data: { supplierPricingBasis: unknown } }) => Object.assign(product, data),
    },
    supplierCatalogOffer: { upsert: async ({ create }: { create: object }) => Object.assign(product.supplierOffers[0], create) },
    supplierInventoryReservation: { findFirst: async () => reservation ? { id: "active" } : null },
    supplierQuoteObservation: {
      findUnique: async ({ where }: { where: { productId_supplier_eanNormalized_observedAt: { observedAt: Date } } }) => observations.get(where.productId_supplier_eanNormalized_observedAt.observedAt.toISOString()),
      create: async ({ data }: { data: { observedAt: Date } }) => {
        const id = data.observedAt.toISOString();
        const stored = { id, ...data };
        observations.set(id, stored);
        return stored;
      },
      update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(observations.get(where.id)!, data),
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, product, observations };
}

test("grava o custo observado de R$ 48 e mantém a base de R$ 50 na venda e no DTO", async () => {
  const { tx, product, observations } = fixture();
  const dry = await recordSupplierQuote(tx, input);
  assert.equal(dry.status, "DROP_WITHIN_TOLERANCE");
  assert.equal(observations.size, 0);
  assert.equal(product.supplierPricingBasis, null);
  const quote = await recordSupplierQuote(tx, input, { apply: true });
  assert.equal(quote.basisAfterCents, 5000);
  assert.equal(quote.offer?.unitCostCents, 4800);
  const sale = withCommerceAvailability(product, now);
  assert.equal(sale.price, "80.00");
  assert.equal("supplierPricingBasis" in sale, false);
  assert.equal("supplierOffers" in sale, false);
  await recordSupplierQuote(tx, input, { apply: true });
  assert.equal(observations.size, 1);
  await assert.rejects(recordSupplierQuote(tx, { ...input, available: false }, { apply: true, manual: true }), /observação diferente/);
  assert.equal((await recordSupplierQuote(tx, { ...input, unitCostCents: 3500, observedAt: new Date(now - 500).toISOString() }, { apply: true })).status, "DROP_BASE_KEPT");
  assert.equal(withCommerceAvailability(product, now).price, "80.00");
});

test("quarentena por percentual e reais e aumento normal com teto conferido", async () => {
  assert.equal(isUnusualSupplierIncrease(100, 300), true);
  assert.equal(isUnusualSupplierIncrease(100, 149), false);
  assert.equal(isUnusualSupplierIncrease(50000, 51500), true);
  const { tx, product } = fixture({ previousCost: 100 });
  assert.equal((await recordSupplierQuote(tx, { ...input, unitCostCents: 300 }, { apply: true })).status, "SPIKE_REVIEW");
  assert.equal(product.supplierOffers[0].unitCostCents, 100);
  assert.equal((await recordSupplierQuote(tx, { ...input, unitCostCents: 300 }, { apply: true, confirmIncrease: true })).basisAfterCents, 300);
  const second = { ...input, unitCostCents: 320, observedAt: new Date(now - 500).toISOString() };
  assert.equal((await recordSupplierQuote(tx, { ...second, retailCeilingCents: 500 }, { apply: true })).status, "INELIGIBLE");
  assert.equal((await recordSupplierQuote(tx, { ...second, observedAt: new Date(now - 400).toISOString() }, { apply: true })).basisAfterCents, 320);
});

test("falta, promoção e pagamento em andamento preservam a oferta usada na venda", async () => {
  const { tx, product, observations } = fixture({ reservation: true });
  assert.equal((await recordSupplierQuote(tx, input, { apply: true })).status, "ACTIVE_RESERVATION");
  assert.equal((await recordSupplierQuote(tx, { ...input, evidence: "PROMOTION", observedAt: new Date(now - 600).toISOString() }, { apply: true })).status, "PROMOTION_RECORDED");
  assert.equal((await recordSupplierAbsence(tx, { productId: input.productId, eanNormalized: ean, observedAt: new Date(now - 500).toISOString(), supplier: "ANB", reason: "Saldo indisponível conferido" }, { apply: true })).status, "UNAVAILABLE");
  assert.equal(product.supplierOffers[0].unitCostCents, 5000);
  assert.equal(observations.size, 3);
  assert.equal(resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, 1, now)?.unitPriceCents, 8000);
});
