import assert from "node:assert/strict";
import test from "node:test";
import { getAdminOrderGroup, matchesAdminOrderSearch, matchesAdminOrderQueue, getAdminOrderSteps, groupOrderItemsBySource } from "./admin-presentation";

test("Todos mantém somente pedidos feitos e em andamento", () => {
  for (const status of ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]) {
    assert.equal(matchesAdminOrderQueue({ status, paymentStatus: "PAID" }, "ALL"), true);
  }
  for (const order of [{ status: "COMPLETED", paymentStatus: "PAID" }, { status: "PENDING", paymentStatus: "REFUNDED" }, { status: "CANCELED", paymentStatus: "PAID" }]) {
    assert.equal(matchesAdminOrderQueue(order, "ALL"), false);
  }
  assert.equal(matchesAdminOrderQueue({ status: "COMPLETED", paymentStatus: "PAID" }, "COMPLETED"), true);
});

test("etapas seguem confirmação, separação e pronto, com envio apenas na entrega", () => {
  const order = { status: "PREPARING", paymentStatus: "PAID", fulfillmentMethod: "PICKUP" as const };
  const pickup = getAdminOrderSteps(order);
  assert.deepEqual(pickup.map(step => step.status), ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);
  assert.deepEqual(pickup.map(step => step.state), ["done", "done", "current", "pending"]);
  assert.equal(pickup[2].label, "Pronto para retirada");
  const delivery = getAdminOrderSteps({ ...order, fulfillmentMethod: "DELIVERY" });
  assert.deepEqual(delivery.map(step => step.status), ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]);
  assert.equal(delivery[2].label, "Pronto para envio");
  assert.ok(getAdminOrderSteps({ ...order, status: "COMPLETED" }).every(step => step.state === "done"));
  assert.ok(getAdminOrderSteps({ ...order, paymentStatus: "REFUNDED" }).every(step => step.state === "canceled"));
});

test("itens ficam agrupados dentro do pedido sem misturar origens ou apagar faltas", () => {
  const items = [{ id: "anb", inventorySource: "DISTRIBUTOR" as const, supplierCode: "ANB", quantity: 3, shortageQuantity: 1 },
    { id: "pharmacy", inventorySource: "PHARMACY" as const, supplierCode: null, quantity: 1 },
    { id: "gam", inventorySource: "DISTRIBUTOR" as const, supplierCode: "GAM", quantity: 2 },
    { id: "anb2", inventorySource: "DISTRIBUTOR" as const, supplierCode: "ANB", quantity: 1 }];
  const groups = groupOrderItemsBySource(items);
  assert.deepEqual(groups.map(group => group.label), ["Farmácia", "ANB", "GAM / eGAM"]);
  assert.deepEqual(groups[1].items.map(item => item.id), ["anb", "anb2"]);
  assert.equal(groups[1].items[0], items[0]);
  assert.equal(items[0].shortageQuantity, 1);
});

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

test("busca operacional encontra EAN e fornecedor sem exigir abertura do pedido", () => {
  const order = { number: "WIM-SINTETICO", customerName: "Cliente sintético", customerPhone: "00000000000", items: [{ productName: "Produto sintético", ean: "7891234567895", inventorySource: "DISTRIBUTOR" as const, supplierCode: "DM" }] };
  assert.equal(matchesAdminOrderSearch(order, "7891234567895"), true);
  assert.equal(matchesAdminOrderSearch(order, "dm paraná"), true);
  assert.equal(matchesAdminOrderSearch(order, "profarma"), false);
});
