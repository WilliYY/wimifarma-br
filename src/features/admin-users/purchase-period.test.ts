import assert from "node:assert/strict";
import test from "node:test";
import { purchasePeriod } from "./purchase-period";

test("all-time ranking has no artificial date restriction", () => {
  assert.equal(purchasePeriod(""), null);
});
test("monthly boundary is exclusive and crosses year safely", () => {
  assert.deepEqual(purchasePeriod("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
  assert.deepEqual(purchasePeriod("2024-02"), { start: "2024-02-01", end: "2024-03-01" });
});
test("invalid months and SQL fragments are rejected", () => {
  for (const value of ["2026-13", "2026-00", "2026-2", "2026-10-04", "2026-10' OR 1=1", "x"])
    assert.throws(() => purchasePeriod(value));
});
