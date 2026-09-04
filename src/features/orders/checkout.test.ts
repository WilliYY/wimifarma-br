import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionStatus,
  checkoutRequestSchema,
  createOrderNumber,
  orderStatusTransitions,
  prepareCheckoutOrder,
  type CheckoutProductRecord,
} from "./checkout";

const product: CheckoutProductRecord = {
  id: "product-1",
  name: "Dipirona 500 mg",
  slug: "dipirona-500-mg",
  imageUrl: "/uploads/produtos/dipirona.webp",
  price: "12.50",
  promotionalPrice: "9.99",
  status: "ACTIVE",
  stock: 5,
  requiresPrescription: false,
  isPopularPharmacy: false,
};

const baseRequest = {
  customer: { name: "Cliente Teste", phone: "(44) 99999-9999", email: "teste@example.com" },
  fulfillmentMethod: "PICKUP" as const,
  paymentMethod: "PIX" as const,
  privacyConsent: true as const,
  items: [{ productId: product.id, quantity: 2, expectedUnitPriceCents: 999 }],
};

test("aceita retirada e normaliza os dados de contato", () => {
  const parsed = checkoutRequestSchema.parse(baseRequest);
  assert.equal(parsed.customer.phone, "44999999999");
  assert.equal(parsed.address, undefined);
});

test("exige endereco de entrega em Ivate-PR", () => {
  const missing = checkoutRequestSchema.safeParse({ ...baseRequest, fulfillmentMethod: "DELIVERY" });
  assert.equal(missing.success, false);

  const outside = checkoutRequestSchema.safeParse({
    ...baseRequest,
    fulfillmentMethod: "DELIVERY",
    address: {
      postalCode: "87000-000",
      street: "Rua Teste",
      number: "10",
      neighborhood: "Centro",
      city: "Maringa",
      state: "PR",
    },
  });
  assert.equal(outside.success, false);
});

test("calcula o pedido com o preco promocional atual", () => {
  const result = prepareCheckoutOrder([product], baseRequest.items);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.items[0].unitPriceCents, 999);
  assert.equal(result.subtotalCents, 1998);
  assert.equal(result.totalCents, 1998);
});

test("recusa preco alterado, falta de estoque e produto restrito", () => {
  assert.deepEqual(prepareCheckoutOrder([product], [{ ...baseRequest.items[0], expectedUnitPriceCents: 998 }]), {
    ok: false,
    code: "PRICE_CHANGED",
    message: "O preco de Dipirona 500 mg mudou. Atualize o carrinho para continuar.",
  });

  const noStock = prepareCheckoutOrder([{ ...product, stock: 1 }], baseRequest.items);
  assert.equal(noStock.ok && true, false);
  if (!noStock.ok) assert.equal(noStock.code, "OUT_OF_STOCK");

  const restricted = prepareCheckoutOrder([{ ...product, requiresPrescription: true }], baseRequest.items);
  assert.equal(restricted.ok && true, false);
  if (!restricted.ok) assert.equal(restricted.code, "RESTRICTED");
});

test("gera numero de pedido curto e rastreavel", () => {
  assert.equal(
    createOrderNumber(new Date("2026-09-04T12:00:00.000Z"), "12345678-1234-1234-1234-123456789abc"),
    "WIM-20260904-12345678",
  );
});

test("impede saltos indevidos no andamento do pedido", () => {
  assert.equal(canTransitionStatus(orderStatusTransitions, "PENDING", "CONFIRMED"), true);
  assert.equal(canTransitionStatus(orderStatusTransitions, "PENDING", "COMPLETED"), false);
  assert.equal(canTransitionStatus(orderStatusTransitions, "COMPLETED", "CANCELED"), false);
});
