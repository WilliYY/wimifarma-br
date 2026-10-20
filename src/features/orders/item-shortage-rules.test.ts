import assert from "node:assert/strict";
import test from "node:test";
import { allocateShortageUnits, shortageInterval } from "./item-shortage-rules";

test("rateio sequencial conserva centavos, capacidade e ganhos originais", () => {
  const units = allocateShortageUnits({ quantity: 3, totalCents: 300, cashbackDiscountCents: 101, wimicoinsDiscountPoints: 99, storeCreditDiscountCents: 20, pixDiscountCents: 3, cashbackEarnedCents: 7, wimicoinsEarnedPoints: 5 });
  for (const unit of units) assert.equal(unit.cashPaidCents + unit.cashbackReturnCents + unit.wimicoinsReturnPoints + unit.storeCreditReturnCents + unit.pixDiscountCents, 100);
  for (const [key, total] of Object.entries({ cashPaidCents: 77, cashbackReturnCents: 101, wimicoinsReturnPoints: 99, storeCreditReturnCents: 20, pixDiscountCents: 3, cashbackEarnedVoidedCents: 7, wimicoinsEarnedVoidedPoints: 5 })) assert.equal(units.reduce((sum, unit) => sum + unit[key as keyof typeof unit], 0), total);
});

test("intervalos não sobrepõem propostas e validam quantidades inteiras", () => {
  assert.equal(shortageInterval(5, 2, [{ startUnit: 0, quantity: 2 }]), 2);
  assert.equal(shortageInterval(5, 1, [{ startUnit: 1, quantity: 2 }]), 0);
  assert.throws(() => shortageInterval(3, 2, [{ startUnit: 0, quantity: 2 }]));
  assert.throws(() => shortageInterval(3, -1, []));
  assert.throws(() => allocateShortageUnits({ quantity: 1, totalCents: 100, cashbackDiscountCents: 101, wimicoinsDiscountPoints: 0, storeCreditDiscountCents: 0, pixDiscountCents: 0, cashbackEarnedCents: 0, wimicoinsEarnedPoints: 0 }));
});
