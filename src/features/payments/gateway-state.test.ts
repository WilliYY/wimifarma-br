import assert from "node:assert/strict";
import test from "node:test";
import { reconcileGatewayState } from "./gateway-state";

test("delayed pending or rejection cannot reverse a confirmed payment", () => {
  for (const next of ["PENDING", "FAILED", "CANCELED"] as const) {
    assert.equal(reconcileGatewayState("asaas", "PAID", next), null);
    assert.equal(reconcileGatewayState("mercado-pago", "PAID", next), null);
  }
});

test("refund and dispute facts cannot be erased by delayed confirmation", () => {
  for (const current of ["REFUNDED", "DISPUTED"] as const) {
    assert.equal(reconcileGatewayState("asaas", current, "PAID"), null);
  }
  assert.equal(reconcileGatewayState("asaas", "PARTIALLY_REFUNDED", "PAID"), null);
  assert.equal(reconcileGatewayState("asaas", "PARTIALLY_REFUNDED", "REFUNDED"), "REFUNDED");
  assert.equal(reconcileGatewayState("asaas", "PARTIALLY_REFUNDED", "DISPUTED"), "DISPUTED");
});

test("late Asaas payment remains visible for review without approving canceled fulfillment", () => {
  for (const current of ["FAILED", "CANCELED"] as const) {
    assert.equal(reconcileGatewayState("asaas", current, "PAID"), "REVIEW");
    assert.equal(reconcileGatewayState("asaas", current, "PARTIALLY_REFUNDED"), "REVIEW");
    assert.equal(reconcileGatewayState("asaas", current, "REFUNDED"), "REFUNDED");
    assert.equal(reconcileGatewayState("asaas", current, "DISPUTED"), "DISPUTED");
    assert.equal(reconcileGatewayState("mercado-pago", current, "PAID"), null);
  }
  assert.equal(reconcileGatewayState("asaas", "REVIEW", "PAID"), null);
  assert.equal(reconcileGatewayState("asaas", "REVIEW", "PENDING"), null);
  assert.equal(reconcileGatewayState("asaas", "REVIEW", "REFUNDED"), "REFUNDED");
});

test("normal initial transitions and partial-refund progress remain applicable", () => {
  assert.equal(reconcileGatewayState("asaas", "NEW", "PENDING"), "PENDING");
  assert.equal(reconcileGatewayState("asaas", "UNKNOWN", "PAID"), "PAID");
  assert.equal(reconcileGatewayState("mercado-pago", "PENDING", "PAID"), "PAID");
  assert.equal(reconcileGatewayState("asaas", "PAID", "PARTIALLY_REFUNDED"), "PARTIALLY_REFUNDED");
});
