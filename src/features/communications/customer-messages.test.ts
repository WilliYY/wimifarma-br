import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerMessage, type CustomerMessageData } from "./customer-messages";

const fixture: CustomerMessageData = {
  event: "ORDER_RECEIVED", firstName: "Cliente Teste", orderNumber: "WBR-TEST",
  items: [{ name: "Sabonete fictício", quantity: 2, unitPriceCents: 1500, totalCents: 3000 }],
  subtotalCents: 3000, deliveryFeeCents: 500,
  discounts: [{ label: "Cupom", amountCents: 200 }, { label: "Cashback utilizado", amountCents: 300 }],
  totalCents: 3000, fulfillmentMethod: "DELIVERY", orderStatus: "PENDING", paymentStatus: "PENDING",
  cashback: { pendingCents: 50 },
};
const authorized = { recipientVerified: true, includeItems: true } as const;

test("one canonical view gives WhatsApp and email the same truthful order and money details", () => {
  const result = buildCustomerMessage(fixture, authorized)!;
  assert.equal(result.whatsappText, result.email.text);
  assert.match(result.whatsappText, /2 × Sabonete fictício/);
  assert.match(result.whatsappText, /Subtotal: R\$\s30,00/);
  assert.match(result.whatsappText, /Cupom: −R\$\s2,00/);
  assert.match(result.whatsappText, /Total: R\$\s30,00/);
  assert.match(result.whatsappText, /pagamento pendente/i);
  assert.doesNotMatch(result.whatsappText, /pagamento confirmado|cashback creditado|saldo disponível/i);
});

test("privacy defaults hide products and recipient data cannot inject lines or HTML", () => {
  const result = buildCustomerMessage({ ...fixture, firstName: '<img src=x onerror="alert(1)">\nPago!', items: [{ ...fixture.items[0], name: "<script>fake()</script>" }] })!;
  assert.doesNotMatch(result.whatsappText, /script|Sabonete/);
  assert.doesNotMatch(result.email.html, /<img|<script/);
  assert.match(result.email.html, /&lt;img/);
  assert.doesNotMatch(result.email.subject, /img|script|Sabonete/);
  const detailed = buildCustomerMessage({ ...fixture, items: [{ ...fixture.items[0], name: "<script>fake()</script>" }] }, authorized)!;
  assert.match(detailed.email.html, /&lt;script&gt;fake\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(detailed.email.html, /<script/);
  assert.throws(() => buildCustomerMessage(fixture, { includeItems: true }), /destinatário verificado/);
});

test("refuses inconsistent cent values, item totals, quantity and aggregate totals", () => {
  for (const change of [{ totalCents: 3001 }, { subtotalCents: 2999 }, { deliveryFeeCents: -1 }, { totalCents: 30.01 }, { totalCents: Number.MAX_SAFE_INTEGER + 1 }, { items: [{ ...fixture.items[0], quantity: 0 }] }]) {
    assert.throws(() => buildCustomerMessage({ ...fixture, ...change }), /Valores|quantidade/);
  }
});

test("payment receipt requires PAID; canceled, refunded and expired reminders stop", () => {
  assert.equal(buildCustomerMessage({ ...fixture, event: "PAYMENT_CONFIRMED" }), null);
  assert.match(buildCustomerMessage({ ...fixture, event: "PAYMENT_CONFIRMED", paymentStatus: "PAID" })!.whatsappText, /Pagamento confirmado/);
  for (const change of [{ paymentStatus: "PAID" as const }, { paymentStatus: "CANCELED" as const }, { paymentStatus: "REFUNDED" as const }, { orderStatus: "CANCELED" as const }, { paymentExpired: true }]) {
    assert.equal(buildCustomerMessage({ ...fixture, event: "PAYMENT_REMINDER", ...change }), null);
    assert.equal(buildCustomerMessage({ ...fixture, event: "PIX_CREATED", ...change }, authorized), null);
  }
});

test("Pix requires an authorized authenticated page and never generates a QR or a payment claim", () => {
  assert.equal(buildCustomerMessage({ ...fixture, event: "PIX_CREATED" }, authorized), null);
  const data = { ...fixture, event: "PIX_CREATED" as const, paymentPage: { url: "https://loja.example/checkout/pagamento/fixture-order", orderId: "fixture-order", authorizedForRecipient: true as const } };
  const result = buildCustomerMessage(data, { ...authorized, trustedOrigin: "https://loja.example" })!;
  assert.match(result.whatsappText, /QR Code na página segura/);
  assert.doesNotMatch(result.whatsappText, /pagamento confirmado/i);
  assert.equal(buildCustomerMessage(data, { ...authorized, trustedOrigin: "https://other.example" }), null);
  assert.equal(buildCustomerMessage({ ...data, paymentPage: { ...data.paymentPage, orderId: "another-order" } }, { ...authorized, trustedOrigin: "https://loja.example" }), null);
  assert.equal(buildCustomerMessage({ ...data, paymentPage: { ...data.paymentPage, url: "javascript:alert(1)" } }, { ...authorized, trustedOrigin: "https://loja.example" }), null);
  for (const url of ["https://loja.example/minha-conta/pedidos/WBR-TEST?token=secret", "https://loja.example/minha-conta/pedidos/WBR-TEST#secret", "https://loja.example/admin/pedidos", "http://loja.example/minha-conta/pedidos", "https://user:password@loja.example/minha-conta/pedidos"]) {
    assert.equal(buildCustomerMessage({ ...data, paymentPage: { ...data.paymentPage, url } }, { ...authorized, trustedOrigin: "https://loja.example" }), null);
  }
  assert.equal(buildCustomerMessage(data, { trustedOrigin: "https://loja.example" }), null);
  assert.equal(buildCustomerMessage({ ...data, paymentPage: { ...data.paymentPage, authorizedForRecipient: false } }, { ...authorized, trustedOrigin: "https://loja.example" }), null);
});

test("cashback needs completed and paid and uses supplied ledger amounts without inventing a balance", () => {
  const cashback = { pendingCents: 50, earnedCents: 50 };
  assert.doesNotMatch(buildCustomerMessage({ ...fixture, paymentStatus: "PAID", cashback })!.whatsappText, /Cashback creditado/);
  const result = buildCustomerMessage({ ...fixture, orderStatus: "COMPLETED", paymentStatus: "PAID", cashback })!;
  assert.match(result.whatsappText, /Cashback creditado: R\$\s0,50/);
  assert.doesNotMatch(result.whatsappText, /Saldo disponível|Cashback previsto/);
  assert.match(buildCustomerMessage({ ...fixture, cashback: { balanceCents: -100 } })!.whatsappText, /Saldo disponível: -R\$\s1,00/);
});

test("post-sale invites genuine ratings, only after completed paid purchase, and never credits a reward", () => {
  assert.equal(buildCustomerMessage({ ...fixture, event: "POST_SALE" }), null);
  assert.equal(buildCustomerMessage({ ...fixture, event: "POST_SALE", paymentStatus: "PAID" }), null);
  assert.equal(buildCustomerMessage({ ...fixture, event: "POST_SALE", orderStatus: "COMPLETED" }), null);
  const result = buildCustomerMessage({ ...fixture, event: "POST_SALE", orderStatus: "COMPLETED", paymentStatus: "PAID" })!;
  assert.match(result.whatsappText, /opinião sincera/);
  assert.match(result.whatsappText, /independentemente da nota/);
  assert.match(result.whatsappText, /produtos elegíveis/);
  assert.doesNotMatch(result.whatsappText, /5 estrelas|Wimicoins|bônus creditado/i);
});

test("empty and converted carts are blocked; test environment is clearly marked", () => {
  assert.equal(buildCustomerMessage({ ...fixture, event: "CART_ABANDONED", items: [], subtotalCents: 0, deliveryFeeCents: 0, discounts: [], totalCents: 0 }), null);
  assert.equal(buildCustomerMessage({ ...fixture, event: "CART_ABANDONED", cartConverted: true }), null);
  assert.match(buildCustomerMessage({ ...fixture, environment: "TEST" })!.whatsappText, /TESTE — sem compra real/);
});
