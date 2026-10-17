import assert from "node:assert/strict";
import test from "node:test";
import { decimalToMinorUnits, quantityFromText } from "./form";

test("valores monetários e percentuais preservam centavos sem ponto flutuante", () => {
  assert.equal(decimalToMinorUnits("2,81"), 281);
  assert.equal(decimalToMinorUnits("2.81"), 281);
  assert.equal(decimalToMinorUnits("60"), 6000);
  assert.equal(decimalToMinorUnits("0"), 0);
  assert.equal(decimalToMinorUnits(""), null);
  assert.equal(decimalToMinorUnits("  "), null);
  assert.equal(decimalToMinorUnits(" 2,8 "), 280);
});

test("formato ambíguo, precisão excessiva e valores inseguros são recusados", () => {
  for (const value of ["1.000,00", "2,819", "2.", ".5", "2,8.1", "-1", "NaN", "1e3", "R$ 2,81", "999999999999999999999"]) {
    assert.throws(() => decimalToMinorUnits(value));
  }
  assert.equal(decimalToMinorUnits("1000000,00"), 100_000_000);
  assert.throws(() => decimalToMinorUnits("1000000,01"));
});

test("quantidade não é arredondada nem convertida parcialmente", () => {
  assert.equal(quantityFromText("25"), 25);
  assert.equal(quantityFromText("10000"), 10_000);
  for (const value of ["", "0", "-1", "2,5", "1e2", "10001"]) assert.throws(() => quantityFromText(value));
});
