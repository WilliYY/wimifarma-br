import assert from "node:assert/strict";
import test from "node:test";
import { allocateCashbackDiscount, reviewRewardCents } from "./review-rewards";

test("review reward is 1% of one paid unit, regardless of quantity or rating", () => {
  assert.equal(reviewRewardCents(2000, 3, 0), 20);
  assert.equal(reviewRewardCents(2000, 3, 3000), 10);
  assert.equal(reviewRewardCents(2000, 3, 6000), 0);
  assert.equal(reviewRewardCents(999, 1, 0), 10);
  assert.throws(() => reviewRewardCents(2000, 0, 0));
  assert.throws(() => reviewRewardCents(2000, 1, 2001));
});

test("discount allocation preserves exact cents without exceeding any product", () => {
  assert.deepEqual(allocateCashbackDiscount([100, 100, 100], 100), [34, 33, 33]);
  assert.deepEqual(allocateCashbackDiscount([2000, 4000], 600), [200, 400]);
  assert.deepEqual(allocateCashbackDiscount([99, 201], 300), [99, 201]);
  assert.deepEqual(allocateCashbackDiscount([99, 201], 0), [0, 0]);
  assert.throws(() => allocateCashbackDiscount([100], 101));
  assert.throws(() => allocateCashbackDiscount([100], -1));
});
