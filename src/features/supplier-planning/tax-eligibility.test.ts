import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredSupplierTax } from "./tax-eligibility";

test("Profarma medicine requires an explicit valid ST amount, including zero", () => {
  for (const substitutionTaxCents of [undefined, null, -1, 0.5, NaN, Infinity, 100_000_001, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(hasRequiredSupplierTax({ supplier: "PROFARMA", substitutionTaxCents }, true), false);
  }
  for (const substitutionTaxCents of [0, 1, 100_000_000]) {
    assert.equal(hasRequiredSupplierTax({ supplier: "PROFARMA", substitutionTaxCents }, true), true);
  }
});

test("ST eligibility does not restrict non-medicines or other suppliers", () => {
  assert.equal(hasRequiredSupplierTax({ supplier: "PROFARMA" }, false), true);
  for (const supplier of ["ANB", "SANTA_CRUZ", "GAM", "DM"]) {
    assert.equal(hasRequiredSupplierTax({ supplier }, true), true);
  }
});
