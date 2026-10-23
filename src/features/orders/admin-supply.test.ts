import assert from "node:assert/strict";
import test from "node:test";
import { getOrderSupplyGroups, resolveOrderItemEan, supplierSourceLabel } from "./admin-supply";

test("EAN da oferta exige o fornecedor registrado e preserva a apresentação cadastrada equivalente", () => {
  assert.deepEqual(resolveOrderItemEan({ supplierCode: "ANB", product: { ean: "7891234567895" }, supplierOffer: { supplier: "ANB", eanNormalized: "07891234567895" } }), { ean: "7891234567895", eanSource: "offer" });
  assert.deepEqual(resolveOrderItemEan({ supplierCode: "ANB", product: { ean: "7891234567895" }, supplierOffer: { supplier: "GAM", eanNormalized: "07890000000000" } }), { ean: "7891234567895", eanSource: "product" });
  assert.deepEqual(resolveOrderItemEan({ supplierCode: "ANB", product: null, supplierOffer: null }), { ean: null, eanSource: null });
  assert.deepEqual(resolveOrderItemEan({ product: { ean: "não é EAN" } }), { ean: null, eanSource: null });
});

const item = { id: "item-a", productName: "Produto sintético", inventorySource: "DISTRIBUTOR" as const, supplierCode: "ANB", ean: "7891234567895", eanSource: "offer" as const, quantity: 3, shortageQuantity: 1 };
const order = { id: "order-a", number: "WIM-SINTETICO-A", status: "PENDING", paymentStatus: "PAID", items: [item] };

test("conferência soma a quantidade restante pelo fornecedor do pedido e mantém a referência de cada compra", () => {
  const groups = getOrderSupplyGroups([order, { ...order, id: "order-b", number: "WIM-SINTETICO-B", paymentStatus: "PENDING", items: [{ ...item, id: "item-b", quantity: 4, shortageQuantity: 0 }] },
    { ...order, id: "order-c", number: "WIM-SINTETICO-C", items: [{ ...item, id: "item-c", supplierCode: "GAM", quantity: 1, shortageQuantity: 0 }] }]);
  assert.equal(groups.length, 2);
  const anb = groups.find(group => group.supplierCode === "ANB")!;
  assert.equal(anb.items.length, 1);
  assert.equal(anb.items[0].quantity, 6);
  assert.equal(anb.items[0].paidQuantity, 2);
  assert.deepEqual(anb.items[0].orders.map(row => [row.number, row.quantity]), [["WIM-SINTETICO-A", 2], ["WIM-SINTETICO-B", 4]]);
  assert.equal(groups.find(group => group.supplierCode === "GAM")?.items[0].quantity, 1);
  assert.equal(item.quantity, 3);
  assert.equal(item.shortageQuantity, 1);
});

test("pedidos encerrados, cancelados financeiramente, homologação e unidades faltantes não entram na conferência", () => {
  const excluded = [
    { ...order, status: "CANCELED" }, { ...order, status: "COMPLETED" }, { ...order, paymentStatus: "REFUNDED" },
    { ...order, onlinePayment: { status: "FAILED", environment: "production" } },
    { ...order, onlinePayment: { status: "PAID", environment: "test" } },
    { ...order, items: [{ ...item, shortageQuantity: 3 }] },
  ];
  assert.deepEqual(getOrderSupplyGroups(excluded), []);
  const [group] = getOrderSupplyGroups([{ ...order, onlinePayment: { status: "REVIEW", environment: "production" } }]);
  assert.equal(group.items[0].paidQuantity, 0);
  assert.equal(group.items[0].orders[0].needsReview, true);
});

test("EAN ausente não reúne apresentações apenas pelo nome e origem desconhecida exige conferência", () => {
  const [group] = getOrderSupplyGroups([{ ...order, items: [{ ...item, ean: null, supplierCode: null }, { ...item, id: "item-b", ean: null, supplierCode: null }] }]);
  assert.equal(group.label, "Distribuidora não registrada");
  assert.equal(group.items.length, 2);
  assert.equal(supplierSourceLabel({ inventorySource: "PHARMACY", supplierCode: "ANB" }), "Loja física");
  assert.equal(supplierSourceLabel({ inventorySource: "DISTRIBUTOR", supplierCode: "DM" }), "DM Paraná");
});
