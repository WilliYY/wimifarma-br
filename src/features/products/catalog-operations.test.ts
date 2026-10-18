import assert from "node:assert/strict";
import test from "node:test";
import { catalogClassificationSchema, classificationIsConsistent, readClassification, quickProductUpdateSchema } from "./catalog-operations";
import { resolveSupplierOffer, withCommerceAvailability } from "@/features/supplier-catalog/commerce";

test("MIP é independente de genérico/similar e não retira receita", () => {
  const classification = catalogClassificationSchema.parse({ kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true });
  assert.equal(classificationIsConsistent(classification, { requiresPrescription: false, prescriptionType: "UNREVIEWED" }), true);
  assert.equal(classificationIsConsistent(classification, { requiresPrescription: true, prescriptionType: "ORDINARY" }), false);
  assert.equal(classificationIsConsistent({ ...classification, kind: "PERFUMERY" }, { requiresPrescription: false }), false);
  assert.equal(readClassification(null).kind, "UNCLASSIFIED");
  assert.equal(catalogClassificationSchema.safeParse({ ...classification, medicineClass: "ETHICAL" }).success, false);
});

test("edição rápida rejeita injeção de estoque/receita, valores inválidos e versão ausente", () => {
  const body = { expectedUpdatedAt: "2026-10-18T12:00:00.000Z", supplierMarkupBps: 6000 };
  assert.equal(quickProductUpdateSchema.safeParse(body).success, true);
  for (const extra of [{ stock: 999 }, { requiresPrescription: false }, { supplierMarkupBps: -1 }, { supplierMarkupBps: 10001 }, { supplierMarkupBps: 100.2 }, { price: 0 }, { price: 100000001 }, { expectedUpdatedAt: "" }]) {
    assert.equal(quickProductUpdateSchema.safeParse({ ...body, ...extra }).success, false);
  }
  assert.equal(quickProductUpdateSchema.safeParse({ expectedUpdatedAt: body.expectedUpdatedAt }).success, false);
});

test("markup configurado mantém seleção pelo menor custo e não vaza no DTO público", () => {
  const now = Date.parse("2026-10-18T15:00:00Z");
  const offer = { id: "synthetic", supplier: "ANB", eanNormalized: "07896181915638", unitCostCents: 250, retailCeilingCents: 5000, available: true, stockQuantity: null, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now - 1000), validUntil: new Date(now + 1000) };
  const product = { inventorySource: "DISTRIBUTOR" as const, ean: "7896181915638", supplierMarkupBps: 4000, price: "4.00", stock: 7, supplierOffers: [{ ...offer, id: "expensive", supplier: "PROFARMA", unitCostCents: 300 }, offer] };
  assert.equal(resolveSupplierOffer(product, 1, now)?.unitPriceCents, 350);
  assert.equal(resolveSupplierOffer({ ...product, supplierMarkupBps: 10001 }, 1, now), null);
  const dto = withCommerceAvailability(product, now);
  assert.equal(dto.price, "3.50");
  assert.equal(dto.stock, 7);
  assert.equal("supplierMarkupBps" in dto, false);
  assert.equal("supplierOffers" in dto, false);
});
