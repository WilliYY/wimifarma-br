import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerMessage, type CustomerMessageData } from "./customer-messages";
import { renderCustomerEmail, renderSampleEmails } from "./customer-email";

const fixture: CustomerMessageData = {
  event: "ORDER_RECEIVED", firstName: '<script>alert("nome")</script>', orderNumber: "WBR-TEST",
  items: [{ name: "Produto privado fictício", quantity: 2, unitPriceCents: 1500, totalCents: 3000 }],
  subtotalCents: 3000, deliveryFeeCents: 500, discounts: [], totalCents: 3500,
  fulfillmentMethod: "DELIVERY", orderStatus: "PENDING", paymentStatus: "PENDING", environment: "TEST",
};

test("React Email renders the canonical message without adding private product details or a payment claim", async () => {
  const email = (await renderCustomerEmail(fixture))!;
  const canonical = buildCustomerMessage(fixture)!;
  assert.equal(email.subject, canonical.email.subject);
  assert.equal(email.text, canonical.email.text);
  assert.match(email.html, /<!DOCTYPE html/);
  assert.match(email.html, /lang="pt-BR"/);
  assert.match(email.html, /logo-wimifarma-email\.png/);
  assert.match(email.html, /alt="Wimifarma"/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script|onerror=|Produto privado fictício|Pagamento confirmado/);
  assert.match(email.html, /Isso ainda não confirma o pagamento/);
});

test("invalid financial states and unauthorized details remain blocked before rendering", async () => {
  assert.equal(await renderCustomerEmail({ ...fixture, event: "PAYMENT_CONFIRMED" }), null);
  assert.equal(await renderCustomerEmail({ ...fixture, paymentStatus: "REFUNDED" }), null);
  assert.equal(await renderCustomerEmail({ ...fixture, event: "PIX_CREATED" }), null);
  await assert.rejects(renderCustomerEmail(fixture, { includeItems: true }), /destinatário verificado/);
  await assert.rejects(renderCustomerEmail({ ...fixture, totalCents: 1 }), /Valores/);
});

test("all six preview emails render synthetic examples, with no provider call or real order", async () => {
  const samples = await renderSampleEmails();
  assert.equal(Object.keys(samples).length, 6);
  for (const html of Object.values(samples)) {
    assert.match(html, /TESTE/);
    assert.match(html, /sem compra real/);
    assert.doesNotMatch(html, /<script|<form|<iframe/);
    assert.match(html, /src="\/brand\/logo-wimifarma-email\.png"/);
    assert.doesNotMatch(html, /src="https:\/\/wimifarma/);
  }
  assert.match(samples.PAYMENT_CONFIRMED, /Pagamento confirmado/);
  assert.match(samples.POST_SALE, /Todas as notas são bem-vindas/);
  assert.match(samples.PIX_CREATED, /https:\/\/loja\.example\/checkout\/pagamento\/fixture-order/);
});
