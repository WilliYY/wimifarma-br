import assert from "node:assert/strict";
import test from "node:test";
import { isDiscountedOffer, productOfferDiscount, rotateDailyOffers } from "./daily-rotation";
import type { PublicPmcReference } from "@/features/products/cmed-reference";

const item = (id: string, extra = {}) => ({ id, price: "20.00", promotionalPrice: "15.00", stock: 2, requiresPrescription: false, isPopularPharmacy: false, ...extra });
const pmc: PublicPmcReference = { amountCents: 3000, column: "PMC 20%", publishedOn: "2026-10-09", sourceUrl: "https://www.gov.br/anvisa", presentation: "Apresentação sintética", laboratory: "Laboratório sintético", registration: "123", rates: [] };
const otc = { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true };

test("ofertas incluem promoção real e economia PMC elegível sem misturar bases", () => {
  assert.equal(productOfferDiscount(item("manual")), 25);
  const medicine = item("pmc", { price: "20.00", promotionalPrice: null, pmcReference: pmc, catalogClassification: otc });
  assert.equal(productOfferDiscount(medicine), 33);
  assert.equal(isDiscountedOffer(medicine), true);
  assert.equal(productOfferDiscount({ ...medicine, pmcReference: { ...pmc, amountCents: 1000 }, promotionalPrice: "15.00" }), null);
  assert.equal(productOfferDiscount({ ...medicine, requiresPrescription: true }), null);
  assert.equal(productOfferDiscount({ ...medicine, catalogClassification: { ...otc, otc: false } }), null);
});

test("seleção não cria desconto Pix nem inclui indisponíveis, receita ou Popular", () => {
  assert.equal(isDiscountedOffer(item("no-promo", { promotionalPrice: null })), false);
  for (const patch of [{ stock: 0 }, { requiresPrescription: true }, { isPopularPharmacy: true }, { prescriptionType: "CONTROLLED" }, { prescriptionType: "ORDINARY" }, { prescriptionType: "ANTIMICROBIAL" }]) {
    assert.equal(isDiscountedOffer(item("excluded", patch)), false);
  }
  for (const patch of [{ price: "NaN" }, { promotionalPrice: "0" }, { promotionalPrice: "25" }, { promotionalPrice: "19.99" }, { price: "0" }]) {
    assert.equal(isDiscountedOffer(item("invalid", patch)), false);
  }
});

test("rotação permanece igual no dia de Brasília, muda no próximo e não depende da consulta", () => {
  const products = Array.from({ length: 60 }, (_, index) => item(`produto-${index}`));
  const before = rotateDailyOffers(products, new Date("2026-10-24T02:59:59Z"));
  const sameDay = rotateDailyOffers([...products].reverse(), new Date("2026-10-23T03:00:00Z"));
  const after = rotateDailyOffers(products, new Date("2026-10-24T03:00:00Z"));
  assert.deepEqual(before, sameDay);
  assert.notDeepEqual(before.slice(0, 24), after.slice(0, 24));
  assert.equal(new Set(before.map(product => product.id)).size, products.length);
  assert.equal(products[0].id, "produto-0");
});
