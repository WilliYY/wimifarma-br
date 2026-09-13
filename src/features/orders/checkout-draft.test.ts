import assert from "node:assert/strict";
import test from "node:test";
import { allowedCheckoutStep, CHECKOUT_DRAFT_TTL, checkoutStepError, readCheckoutDraft, type CheckoutDraft } from "./checkout-draft";
import { lookupPostalCode } from "./postal-code";

const draft: CheckoutDraft = {
  customer: { name: "Cliente Teste", phone: "44999999999", email: "" },
  address: { postalCode: "87525-000", street: "Rua Teste", number: "10", complement: "", neighborhood: "Centro", city: "Ivaté", state: "PR" },
  fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", notes: "",
};

test("rascunho respeita conta, expiracao, formato e nao recupera consentimento", () => {
  const raw = JSON.stringify({ owner: "guest", savedAt: 1000, data: { ...draft, privacyConsent: true } });
  assert.deepEqual(readCheckoutDraft(raw, "guest", 1001), draft);
  assert.equal(readCheckoutDraft(raw, "other", 1001), null);
  assert.equal(readCheckoutDraft(raw, "guest", 1000 + CHECKOUT_DRAFT_TTL), null);
  assert.equal(readCheckoutDraft(raw, "guest", 999), null);
  for (const value of ["{", "[]", "null", "x".repeat(9000)]) assert.equal(readCheckoutDraft(value, "guest"), null);
});

test("historico do checkout impede pular dados obrigatorios e cobertura", () => {
  assert.equal(allowedCheckoutStep(3, draft), 3);
  assert.equal(allowedCheckoutStep(3, { ...draft, customer: { ...draft.customer, name: "" } }), 0);
  assert.equal(allowedCheckoutStep(3, { ...draft, address: { ...draft.address, number: "" } }), 1);
  const outside = { ...draft, address: { ...draft.address, postalCode: "87501-070", city: "Umuarama" } };
  assert.match(checkoutStepError(1, outside)!, /Ainda nao entregamos/);
  assert.equal(allowedCheckoutStep(3, { ...outside, fulfillmentMethod: "PICKUP" }), 3);
});

test("CEP aceita rua vazia, confere resposta e nunca consulta entrada invalida", async () => {
  let calls = 0;
  const fake = (async (url: string | URL | Request) => { calls++; assert.equal(url, "https://viacep.com.br/ws/87525000/json/"); return Response.json({ cep: "87525-000", logradouro: "", bairro: "", localidade: "Ivaté", uf: "PR" }); }) as typeof fetch;
  await assert.rejects(lookupPostalCode("https://other", fake), /8 numeros/);
  assert.equal(calls, 0);
  assert.deepEqual(await lookupPostalCode("87525000", fake), { postalCode: "87525000", street: "", neighborhood: "", city: "Ivaté", state: "PR" });
});

test("CEP distingue inexistente, timeout, HTML e resposta de outro CEP", async () => {
  for (const flag of [true, "true"]) await assert.rejects(lookupPostalCode("00000000", (async () => Response.json({ erro: flag })) as typeof fetch), /nao encontrado/);
  for (const response of [new Response("<html>"), new Response("", { status: 503 }), Response.json({ cep: "01001-000", logradouro: "Rua", bairro: "Centro", localidade: "Sao Paulo", uf: "SP" })]) await assert.rejects(lookupPostalCode("87525000", (async () => response) as typeof fetch), /indisponivel/);
  await assert.rejects(lookupPostalCode("87525000", (async () => { throw new Error("timeout"); }) as typeof fetch), /indisponivel/);
});
