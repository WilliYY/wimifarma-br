import assert from "node:assert/strict";
import test from "node:test";
import { allocatePixDiscount, orderPixDiscountCents, PIX_DISCOUNT_PERCENT, pixDiscountCents } from "./pix-discount";

test("Pix calcula 3% com arredondamento matemático em centavos inteiros", () => {
  assert.equal(PIX_DISCOUNT_PERCENT, 3);
  for (const [base, expected] of [[0, 0], [1, 0], [16, 0], [17, 1], [50, 2], [100, 3], [1025, 31], [8500, 255]]) {
    assert.equal(pixDiscountCents(base), expected);
  }
  const base = Number.MAX_SAFE_INTEGER;
  assert.equal(pixDiscountCents(base), Number((BigInt(base) * BigInt(3) + BigInt(50)) / BigInt(100)));
});

test("Pix rejeita valores que não sejam centavos inteiros seguros não negativos", () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => pixDiscountCents(value));
  }
});

test("desconto histórico usa somente a diferença persistida após os dois resgates e o frete", () => {
  const order = { subtotalCents: 10000, deliveryFeeCents: 1200, cashbackRedeemedCents: 1000, wimicoinsRedeemedPoints: 500 };
  assert.equal(orderPixDiscountCents({ ...order, totalCents: 9445 }), 255);
  assert.equal(orderPixDiscountCents({ ...order, totalCents: 9700 }), 0);
  assert.equal(orderPixDiscountCents({ subtotalCents: 10000, deliveryFeeCents: 1200, totalCents: 11200 }), 0);
  assert.equal(orderPixDiscountCents({ ...order, totalCents: 9600 }), 100);
  assert.equal(orderPixDiscountCents({ ...order, totalCents: 9800 }), 0);
});

test("rateio Pix desempata pelo slug congelado e preserva valores com ordem permutada", () => {
  const items = [{ productSlug: "b", totalCents: 154 }, { productSlug: "a", totalCents: 154 }];
  assert.deepEqual(allocatePixDiscount(items, 9), [4, 5]);
  assert.deepEqual(allocatePixDiscount([...items].reverse(), 9), [5, 4]);
  assert.deepEqual(allocatePixDiscount(items, 0), [0, 0]);
});
