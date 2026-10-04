import assert from "node:assert/strict";
import test from "node:test";
import { compareFees, feeRuleSchema, feeRulesSchema, type FeeRule } from "./fee-policy";

const now = Date.parse("2026-10-04T12:00:00Z");
const checkedAt = "2026-10-04T10:00:00Z";
const validUntil = "2026-10-05T10:00:00Z";
const input = { amountCents: 1000, method: "pix" as const, installments: 1, maxSettlementDays: 30 };
function rule(overrides: Partial<FeeRule> = {}): FeeRule {
  return feeRuleSchema.parse({ id: "rate", provider: "asaas", method: "pix", fixedCents: 0,
    percentageBps: 100, minInstallments: 1, maxInstallments: 1, settlementDays: 1,
    checkedAt, validUntil, source: "https://example.com/confirmed-fees", ...overrides });
}

test("fixed costs make small orders more expensive and compare net receipts", () => {
  const result = compareFees(input, [rule({ id: "fixed", fixedCents: 199, percentageBps: 0 }),
    rule({ id: "percentage", provider: "mercado-pago", percentageBps: 200 })], now);
  assert.equal(result.best?.ruleId, "percentage");
  assert.equal(result.best?.feeCents, 20);
  assert.equal(result.best?.netCents, 980);
});

test("percentage rounds up once before fixed costs and PIX minimum/maximum caps", () => {
  assert.equal(compareFees({ ...input, amountCents: 101 }, [rule({ fixedCents: 2, percentageBps: 333 })], now).best?.feeCents, 6);
  assert.equal(compareFees(input, [rule({ minimumFeeCents: 30 })], now).best?.feeCents, 30);
  assert.equal(compareFees(input, [rule({ fixedCents: 199, maximumFeeCents: 100 })], now).best?.feeCents, 100);
});

test("large safe amounts use exact integer arithmetic", () => {
  const amountCents = Number.MAX_SAFE_INTEGER;
  const expected = Number((BigInt(amountCents) * BigInt(333) + BigInt(9999)) / BigInt(10000));
  assert.equal(compareFees({ ...input, amountCents }, [rule({ percentageBps: 333 })], now).best?.feeCents, expected);
});

test("invalid, expired, future, mismatched and unknown withdrawal deadlines never win", () => {
  const candidates = [
    { ...rule({ id: "unknown" }), settlementDays: undefined },
    rule({ id: "expired", provider: "pagbank", checkedAt: "2026-10-03T10:00:00Z", validUntil: "2026-10-04T12:00:00Z" }),
    rule({ id: "future", checkedAt: "2026-10-04T13:00:00Z" }),
    rule({ id: "deadline", settlementDays: 31 }),
    rule({ id: "method", method: "card" }),
  ];
  const result = compareFees(input, candidates, now);
  assert.equal(result.best, null);
  assert.deepEqual(Object.fromEntries(result.excluded.map(value => [value.id, value.reason])), {
    unknown: "invalid", future: "future-check", method: "method", expired: "expired", deadline: "deadline",
  });
});

test("latest overlapping rate supersedes an outdated cheaper promotion", () => {
  const result = compareFees(input, [rule({ id: "old", checkedAt: "2026-10-03T10:00:00Z", percentageBps: 0 }),
    rule({ id: "new", percentageBps: 200 })], now);
  assert.equal(result.best?.ruleId, "new");
  assert.deepEqual(result.excluded, [{ id: "old", reason: "superseded" }]);
});

test("latest rate cannot fall back to old rates when its deadline fails or it expired", () => {
  const old = rule({ id: "old", checkedAt: "2026-10-03T10:00:00Z" });
  assert.equal(compareFees(input, [old, rule({ id: "new", settlementDays: 31 })], now).best, null);
  assert.equal(compareFees(input, [old, rule({ id: "new", validUntil: "2026-10-04T11:00:00Z" })], now).best, null);
});

test("ties sort by fee, settlement, provider and rule ID independently of input order", () => {
  const candidates = [rule({ id: "stripe", provider: "stripe", settlementDays: 0 }),
    rule({ id: "asaas", settlementDays: 0 }), rule({ id: "mp", provider: "mercado-pago", settlementDays: 1 })];
  assert.deepEqual(compareFees(input, candidates, now).options.map(value => value.ruleId), ["asaas", "stripe", "mp"]);
  assert.deepEqual(compareFees(input, [...candidates].reverse(), now).options.map(value => value.ruleId), ["asaas", "stripe", "mp"]);
});

test("same confirmation instant in different timezone offsets ties by rule ID", () => {
  const candidates = [rule({ id: "z", checkedAt: "2026-10-04T07:00:00-03:00" }), rule({ id: "a" })];
  assert.equal(compareFees(input, candidates, now).best?.ruleId, "a");
  assert.equal(compareFees(input, [...candidates].reverse(), now).best?.ruleId, "a");
});

test("three interest-free installments require an explicitly confirmed merchant policy", () => {
  const cardInput = { ...input, method: "card" as const, installments: 3 };
  const unconfirmed = rule({ method: "card", minInstallments: 1, maxInstallments: 3 });
  assert.deepEqual(compareFees(cardInput, [unconfirmed], now).excluded, [{ id: "rate", reason: "interest-free" }]);
  assert.ok(compareFees(cardInput, [rule({ ...unconfirmed, zeroInterestInstallments: 3 })], now).best);
  assert.ok(compareFees({ ...cardInput, requiredInterestFree: false }, [unconfirmed], now).best);
  assert.equal(compareFees({ ...cardInput, installments: 4 }, [unconfirmed], now).excluded[0]?.reason, "installments");
});

test("schema rejects unconfirmed ranges, currency, insecure source and long validity", () => {
  for (const invalid of [
    { minInstallments: 2, maxInstallments: 1 }, { maxInstallments: 2 }, { currency: "USD" },
    { fixedCents: -1 }, { percentageBps: 10001 }, { settlementDays: 366 },
    { source: "http://example.com/fees" }, { validUntil: checkedAt },
    { validUntil: "2026-10-12T10:00:00Z" }, { minimumFeeCents: 20, maximumFeeCents: 10 },
    { method: "card", maximumFeeCents: 100 },
  ]) assert.equal(feeRuleSchema.safeParse({ ...rule(), ...invalid }).success, false);
  assert.equal(feeRulesSchema.safeParse(Array.from({ length: 49 }, () => rule())).success, false);
  assert.equal(feeRuleSchema.safeParse(rule({ validUntil: "2026-10-11T10:00:00Z" })).success, true);
});

test("invalid comparison amounts and PIX installments fail validation", () => {
  for (const invalid of [{ amountCents: 0 }, { amountCents: 1.5 }, { amountCents: Infinity },
    { amountCents: Number.MAX_SAFE_INTEGER + 1 }, { installments: 2 }, { maxSettlementDays: -1 }]) {
    assert.throws(() => compareFees({ ...input, ...invalid }, [rule()], now));
  }
});
