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
  assert.match(checkoutStepError(1, outside)!, /Calcule e escolha o frete/);
  assert.equal(allowedCheckoutStep(3, { ...outside, fulfillmentMethod: "PICKUP" }), 3);
});

test("CEP aceita rua vazia, confere resposta e nunca consulta entrada invalida", async () => {
  let calls = 0;
  const fake = (async (url: string | URL | Request) => { calls++; assert.equal(url, "https://viacep.com.br/ws/87525000/json/"); return Response.json({ cep: "87525-000", logradouro: "", bairro: "", localidade: "Ivaté", uf: "PR" }); }) as typeof fetch;
  await assert.rejects(lookupPostalCode("https://other", fake), /8 numeros/);
  assert.equal(calls, 0);
  assert.deepEqual(await lookupPostalCode("87525000", fake), { postalCode: "87525000", street: "", neighborhood: "", city: "Ivaté", state: "PR" });
});

test("CEP válido é encontrado na BrasilAPI mesmo sem resultado no ViaCEP", async () => {
  const calls: string[] = [];
  const fake: typeof fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options?.redirect, "error");
    assert.ok(options?.signal);
    return calls.length === 1
      ? Response.json({ erro: "true" })
      : Response.json({ cep: "40020000", street: "Rua Chile", neighborhood: "Centro", city: "Salvador", state: "BA" });
  };
  assert.deepEqual(await lookupPostalCode("40020000", fake), {
    postalCode: "40020000", street: "Rua Chile", neighborhood: "Centro", city: "Salvador", state: "BA",
  });
  assert.deepEqual(calls, ["https://viacep.com.br/ws/40020000/json/", "https://brasilapi.com.br/api/cep/v2/40020000"]);
});

test("a segunda base aceita CEP geral do município se o ViaCEP estiver indisponível", async () => {
  const fake: typeof fetch = async url => {
    if (String(url).includes("viacep.com.br")) throw new Error("timeout");
    return Response.json({ cep: "87485000", street: null, neighborhood: null, city: "Douradina", state: "PR" });
  };
  assert.deepEqual(await lookupPostalCode("87485000", fake), {
    postalCode: "87485000", street: "", neighborhood: "", city: "Douradina", state: "PR",
  });
});

test("CEP distingue ausência nas duas bases de indisponibilidade parcial", async () => {
  for (const flag of [true, "true"]) {
    const missing: typeof fetch = async url => String(url).includes("viacep.com.br")
      ? Response.json({ erro: flag }) : new Response("", { status: 404 });
    await assert.rejects(lookupPostalCode("99999999", missing), { status: 404, message: /preencha o endereço/ });
  }
  const offline: typeof fetch = async url => String(url).includes("viacep.com.br")
    ? Response.json({ erro: true }) : new Response("", { status: 503 });
  await assert.rejects(lookupPostalCode("87525000", offline), { status: 503 });
});

test("CEP rejeita HTML e dados de outro CEP", async () => {
  const wrongStreet: typeof fetch = async url => String(url).includes("viacep.com.br")
    ? new Response("<html>") : Response.json({ cep: "01001000", street: "Praça da Sé", city: "São Paulo", state: "SP" });
  await assert.rejects(lookupPostalCode("87525000", wrongStreet), { status: 503 });
});
