import assert from "node:assert/strict";
import test from "node:test";
import { calculateCashbackCents, cashbackRateSchema, nextCashbackState, productCashbackCents } from "./rules";

test("2% de R$ 20 resulta em 40 centavos", () => {
  assert.equal(calculateCashbackCents(2000, 200), 40);
  assert.equal(calculateCashbackCents(999, 200), 20);
  assert.equal(calculateCashbackCents(999, 200, 3), 60);
  assert.equal(calculateCashbackCents(1, 200), 0);
  assert.equal(calculateCashbackCents(2000, 125), 25);
});

test("percentual aceita centesimos, nunca NaN, infinito ou acima de 100%", () => {
  for (const invalid of [-1, 0, 10001, 1.5, NaN, Infinity, ""]) {
    assert.equal(cashbackRateSchema.safeParse(invalid).success, false);
  }
  assert.equal(cashbackRateSchema.parse(200), 200);
  assert.throws(() => calculateCashbackCents(-1, 200));
  assert.throws(() => calculateCashbackCents(2000, 200, 0));
});

test("cashback depende de produto habilitado e elegivel", () => {
  const product = { cashbackEnabled: true, cashbackRateBps: 200 };
  assert.equal(productCashbackCents(product, 2000), 40);
  assert.equal(productCashbackCents({ ...product, cashbackEnabled: false }, 2000), 0);
  assert.equal(productCashbackCents({ ...product, requiresPrescription: true }, 2000), 0);
  assert.equal(productCashbackCents({ ...product, isPopularPharmacy: true }, 2000), 0);
  assert.equal(productCashbackCents({}, 2000), 0);
});

test("saldo so libera com pedido concluido E pago", () => {
  assert.equal(nextCashbackState("PENDING", "COMPLETED", "PAID"), "CREDITED");
  assert.equal(nextCashbackState("PENDING", "COMPLETED", "PENDING"), "PENDING");
  assert.equal(nextCashbackState("PENDING", "READY", "PAID"), "PENDING");
});

test("cancelamento e reembolso anulam ou estornam, sem credito retroativo", () => {
  assert.equal(nextCashbackState("PENDING", "CANCELED", "PAID"), "VOIDED");
  assert.equal(nextCashbackState("PENDING", "COMPLETED", "REFUNDED"), "VOIDED");
  assert.equal(nextCashbackState("CREDITED", "COMPLETED", "REFUNDED"), "REVERSED");
  assert.equal(nextCashbackState("NONE", "COMPLETED", "PAID"), "NONE");
  assert.equal(nextCashbackState("VOIDED", "COMPLETED", "PAID"), "VOIDED");
});

test("repeticao nao altera estado nem recredita", () => {
  assert.equal(nextCashbackState("CREDITED", "COMPLETED", "PAID"), "CREDITED");
  assert.equal(nextCashbackState("REVERSED", "COMPLETED", "REFUNDED"), "REVERSED");
});
