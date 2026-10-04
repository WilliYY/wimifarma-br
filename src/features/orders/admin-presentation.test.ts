import assert from "node:assert/strict";
import test from "node:test";
import { getAdminOrderGroup, matchesAdminOrderSearch } from "./admin-presentation";

test("operational groups retain pending paid orders and completed orders in their own queues", () => {
  for (const paymentStatus of ["PENDING", "PAID"]) {
    assert.equal(getAdminOrderGroup({ status: "PENDING", paymentStatus }), "NEW");
    for (const status of ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]) {
      assert.equal(getAdminOrderGroup({ status, paymentStatus }), "ACTIVE");
    }
    assert.equal(getAdminOrderGroup({ status: "COMPLETED", paymentStatus }), "COMPLETED");
  }
});

test("financial cancellation and refunds do not appear in the preparation queue", () => {
  for (const status of ["PENDING", "CONFIRMED", "PREPARING", "COMPLETED", "CANCELED"]) {
    for (const paymentStatus of ["CANCELED", "REFUNDED"]) {
      assert.equal(getAdminOrderGroup({ status, paymentStatus }), "CANCELED");
    }
    for (const payment of ["FAILED", "CANCELED", "REFUNDED", "DISPUTED"]) {
      assert.equal(getAdminOrderGroup({ status, paymentStatus: "PENDING", onlinePayment: { status: payment } }), "CANCELED");
    }
  }
  assert.equal(getAdminOrderGroup({ status: "CANCELED", paymentStatus: "PAID" }), "CANCELED");
});

test("uncertain and partial financial states remain operationally visible without fabricated cancellation", () => {
  for (const status of ["UNKNOWN", "SUBMITTING", "PENDING", "PARTIALLY_REFUNDED"]) {
    assert.equal(getAdminOrderGroup({ status: "PENDING", paymentStatus: "PENDING", onlinePayment: { status } }), "NEW");
    assert.equal(getAdminOrderGroup({ status: "PREPARING", paymentStatus: "PAID", onlinePayment: { status } }), "ACTIVE");
  }
});

test("search covers order, customer, phone and products while preserving source data", () => {
  const order = { number: "WBR-100", customerName: "Cliente Fictício", customerPhone: "44999990000", items: [{ productName: "Sabonete Teste" }] };
  for (const query of [" wbr-100 ", "CLIENTE", "4499999", "sabonete", ""]) assert.ok(matchesAdminOrderSearch(order, query));
  assert.equal(matchesAdminOrderSearch(order, "outro produto"), false);
  assert.equal(order.items[0].productName, "Sabonete Teste");
});
