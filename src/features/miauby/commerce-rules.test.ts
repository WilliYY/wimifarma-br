import assert from "node:assert/strict";
import test from "node:test";
import { bridgeResultSchema, cartEventKey, cartRequestSchema, createCartIdentity, readCartIdentity, formatCommerceItems, formatCommerceOrder, classifyBridgeResult } from "./commerce-rules";

test("cart identity is signed, expires and deduplicates a ten-minute window", () => {
  const now = Date.now(); const secret = "synthetic-secret-only";
  const token = createCartIdentity(secret, now);
  const id = readCartIdentity(token, secret, now)!;
  assert.ok(id); assert.equal(readCartIdentity(token + "x", secret, now), null);
  assert.equal(readCartIdentity(token, "different", now), null);
  assert.equal(readCartIdentity(token, secret, now + 86_400_001), null);
  assert.equal(cartEventKey(id, 600_001), cartEventKey(id, 601_000));
  assert.notEqual(cartEventKey(id, 600_001), cartEventKey(id, 1_200_000));
});
test("cart accepts only product ids and bounded quantities, never customer details or client prices", () => {
  assert.equal(cartRequestSchema.safeParse({ items: [{ productId: "fixture", quantity: 1 }] }).success, true);
  assert.equal(cartRequestSchema.safeParse({ items: [{ productId: "fixture", quantity: 150 }] }).success, true);
  for (const input of [{ items: [{ productId: "fixture", quantity: 1000 }] }, { items: [{ productId: "fixture", quantity: 1, price: 1 }] }, { items: [], phone: "+5500000000000" }]) assert.equal(cartRequestSchema.safeParse(input).success, false);
});
test("purchase alerts distinguish payment and avoid personal data or card details", () => {
  const input = { id: "fixture", number: "TEST-123", totalCents: 499, fulfillmentMethod: "PICKUP", items: [{ name: "Produto sintético\n*novo título*", quantity: 1 }] };
  const pending = formatCommerceOrder("order", input, true);
  assert.match(pending, /TESTE/); assert.match(pending, /não confirma pagamento/);
  assert.match(pending, /R\$\s*4,99/); assert.doesNotMatch(pending, /\*novo título\*/);
  assert.match(formatCommerceOrder("payment", input, false), /Pagamento confirmado/);
});
test("only a matching positive provider message id proves acceptance, never delivery", () => {
  const accepted = { ok: true, eventId: "fixture", status: "accepted", messageId: "provider-123", accepted: true, delivered: null, uncertain: false, duplicate: false, retryable: false } as const;
  assert.equal(classifyBridgeResult(bridgeResultSchema.parse(accepted), "fixture"), "SENT");
  assert.equal(classifyBridgeResult({ ...accepted, messageId: "" }, "fixture"), "UNCERTAIN");
  assert.equal(classifyBridgeResult(accepted, "other"), "UNCERTAIN");
  assert.equal(classifyBridgeResult({ ...accepted, status: "blocked", accepted: false, retryable: true }, "fixture"), "PENDING");
  assert.equal(classifyBridgeResult({ ...accepted, status: "uncertain", accepted: false, uncertain: true }, "fixture"), "UNCERTAIN");
});

test("owner alerts share truthful money details without claiming pending cashback as earned", () => {
  const input = { id: "fixture", number: "TEST-123", totalCents: 1000, subtotalCents: 1200, deliveryFeeCents: 0,
    cashbackEarnedCents: 60, cashbackState: "PENDING", fulfillmentMethod: "PICKUP",
    items: [{ name: "Produto sintético", quantity: 2, unitPriceCents: 600, totalCents: 1200 }] };
  const result = formatCommerceOrder("payment", input);
  assert.match(result, /Subtotal: R\$\s*12,00/);
  assert.match(result, /Descontos: −R\$\s*2,00/);
  assert.match(result, /2 × Produto sintético.*R\$\s*12,00/);
  assert.match(result, /Cashback previsto/);
  assert.doesNotMatch(result, /ganhou|creditado|saldo disponível/i);
});

test("new order alerts show recorded EAN and procurement source without changing payment or cart messages", () => {
  const input = { id: "fixture", number: "TEST-123", totalCents: 1200, fulfillmentMethod: "PICKUP",
    items: [
      { name: "Produto distribuidor", quantity: 3, ean: "7890000000001", inventorySource: "DISTRIBUTOR", supplierCode: "PROFARMA" },
      { name: "Produto local", quantity: 2, ean: "7890000000002", inventorySource: "PHARMACY" },
      { name: "Produto histórico", quantity: 1 },
      { name: "Distribuidor sem identificação", quantity: 1, inventorySource: "DISTRIBUTOR" },
    ] };
  const result = formatCommerceOrder("order", input);
  assert.match(result, /3 × Produto distribuidor · EAN: 7890000000001 · Fornecedor: PROFARMA/);
  assert.match(result, /2 × Produto local · EAN: 7890000000002 · Estoque próprio/);
  assert.match(result, /\n1 × Produto histórico\n/);
  assert.match(result, /\n1 × Distribuidor sem identificação\n/);
  assert.match(result, /painel de pedidos/);
  assert.doesNotMatch(formatCommerceOrder("payment", input), /EAN:|Fornecedor:|Estoque próprio/);
  assert.doesNotMatch(formatCommerceItems(input.items), /EAN:|Fornecedor:|Estoque próprio/);
});

test("procurement details sanitize text, omit blank fields and keep the ten-item limit", () => {
  const input = { id: "fixture", number: "TEST-123", totalCents: 1200, fulfillmentMethod: "PICKUP",
    items: [
      { name: "Produto", quantity: 1, ean: "789\n*000*", inventorySource: "DISTRIBUTOR", supplierCode: "ANB\n*texto*" },
      { name: "Sem dados", quantity: 1, ean: " \n ", inventorySource: "DISTRIBUTOR", supplierCode: " \n " },
      ...Array.from({ length: 9 }, (_, index) => ({ name: `Extra ${index}`, quantity: 1 })),
    ] };
  const result = formatCommerceOrder("order", input);
  assert.match(result, /EAN: 789 000 · Fornecedor: ANB texto/);
  assert.match(result, /\n1 × Sem dados\n/);
  assert.match(result, /Mais 1 itens no painel/);
  assert.doesNotMatch(result, /\*|Extra 8/);
});
