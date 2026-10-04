import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAsaasFees, retrieveAsaasFees } from "./asaas-fees";

const now = Date.parse("2026-10-04T12:00:00Z");
const card = { operationValue: 0.49, oneInstallmentPercentage: 2.99,
  upToSixInstallmentsPercentage: 3.49, upToTwelveInstallmentsPercentage: 3.99, daysToReceive: 32 };

test("imports account card baseline, expires daily and never invents interest-free coverage", () => {
  const rules = normalizeAsaasFees({ payment: { creditCard: card } }, now);
  assert.equal(rules.length, 3);
  assert.equal(rules[0].fixedCents, 49);
  assert.equal(rules[0].percentageBps, 299);
  assert.equal(rules[1].minInstallments, 2);
  assert.equal(rules[2].maxInstallments, 12);
  assert.equal(rules[0].settlementDays, 32);
  assert.equal(rules[0].zeroInterestInstallments, 1);
  assert.equal(Date.parse(rules[0].validUntil) - now, 86_400_000);
});

test("unsupported fractional-cent fees fail instead of becoming a cheaper rounded quote", () => {
  assert.throws(() => normalizeAsaasFees({ payment: { creditCard: { ...card, operationValue: 0.491 } } }, now));
  assert.throws(() => normalizeAsaasFees({ payment: { creditCard: { ...card, oneInstallmentPercentage: 2.991 } } }, now));
});

test("Pix tariff semantics and settlement cannot be inferred from fee fields alone", () => {
  const rules = normalizeAsaasFees({ payment: { creditCard: card,
    pix: { fixedFeeValue: 1.99, percentageFee: 1, minimumFeeValue: 1, maximumFeeValue: 0 } } }, now);
  assert.ok(rules.every(rule => rule.method === "card"));
  assert.throws(() => normalizeAsaasFees({ payment: { pix: {} } }, now));
});

test("API uses only fixed official origins and never leaks rejected credentials or body", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api-sandbox.asaas.com/v3/myAccount/fees/");
    assert.equal(options?.redirect, "error");
    return new Response("private-key-and-account", { status: 401 });
  };
  try { await assert.rejects(retrieveAsaasFees("fixture-not-a-real-key", "sandbox", 1), /não confirmou acesso/); }
  finally { globalThis.fetch = original; }
});

test("oversized tariff response is stopped before parsing", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("x".repeat(64_001));
  try { await assert.rejects(retrieveAsaasFees("fixture-not-a-real-key", "production", 1), /acima do limite/); }
  finally { globalThis.fetch = original; }
});
