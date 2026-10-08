import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAsaasPayment } from "./asaas-normalization";
import type { AsaasPayment } from "./asaas-provider";

const base: AsaasPayment = { id: "pay_synthetic", billingType: "PIX", status: "RECEIVED", value: 10, netValue: 9.32 };
const binding = { environment: "test" as const, accountId: "synthetic-wallet" };

test("Pix confirmation under review does not become received money", () => {
  const pending = normalizeAsaasPayment({ ...base, status: "CONFIRMED" }, binding);
  assert.equal(pending.status, "PENDING");
  assert.equal(pending.fundsAvailable, false);
  const received = normalizeAsaasPayment(base, binding);
  assert.equal(received.status, "PAID");
  assert.equal(received.fundsAvailable, true);
  assert.equal(received.providerUpdatedAt, null);
  assert.equal(received.amountCents, 1000);
});

test("card confirmation approves commercially without claiming settled funds", () => {
  const confirmed = normalizeAsaasPayment({ ...base, billingType: "CREDIT_CARD", status: "CONFIRMED" }, binding);
  assert.equal(confirmed.status, "PAID");
  assert.equal(confirmed.fundsAvailable, false);
});

test("refunds count DONE values from one canonical snapshot, without pending or canceled amounts", () => {
  const refunds = [{ status: "DONE" as const, value: 2 }, { status: "PENDING" as const, value: 4 }, { status: "CANCELLED" as const, value: 3 }];
  assert.equal(normalizeAsaasPayment({ ...base, refunds }, binding).status, "PARTIALLY_REFUNDED");
  assert.equal(normalizeAsaasPayment({ ...base, refunds: [{ status: "DONE", value: 10 }] }, binding).status, "REFUNDED");
  assert.equal(normalizeAsaasPayment({ ...base, refunds: [{ status: "DONE", value: 11 }] }, binding).status, "REVIEW");
  const inconsistent = normalizeAsaasPayment({ ...base, status: "PENDING", refunds: [{ status: "DONE", value: 2 }] }, binding);
  assert.equal(inconsistent.status, "REVIEW");
  assert.equal(normalizeAsaasPayment({ ...base, refunds: [{ status: "DONE", value: 10 }] }, binding).fundsAvailable, false);
});

test("deletion and refund requests never approve unreceived money or disguise received funds", () => {
  assert.equal(normalizeAsaasPayment({ ...base, deleted: true, status: "PENDING" }, binding).status, "CANCELED");
  assert.equal(normalizeAsaasPayment({ ...base, deleted: true }, binding).status, "REVIEW");
  for (const status of ["REFUND_REQUESTED", "REFUND_IN_PROGRESS"] as const) {
    assert.equal(normalizeAsaasPayment({ ...base, status }, binding).status, "REVIEW");
  }
});

test("chargeback takes precedence over payment, and unknown account environments fail closed", () => {
  assert.equal(normalizeAsaasPayment({ ...base, status: "CHARGEBACK_REQUESTED" }, binding).status, "DISPUTED");
  assert.equal(normalizeAsaasPayment({ ...base, chargeback: { id: "cb_synthetic", status: "IN_DISPUTE", value: 10 } }, binding).status, "DISPUTED");
  assert.throws(() => normalizeAsaasPayment(base, { ...binding, environment: "sandbox" as "test" }), /ambiente/i);
});
