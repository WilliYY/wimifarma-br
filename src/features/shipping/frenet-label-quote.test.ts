import assert from "node:assert/strict";
import test from "node:test";
import { quoteFrenetLabel } from "./frenet-label-quote";

const input = {
  token: "fixture-client-token",
  partnerToken: "fixture-partner-token",
  destinationPostalCode: "01001000",
  invoiceValueCents: 1595,
  parcel: { weightGrams: 880, lengthCm: 24, widthCm: 15, heightCm: 10 },
};

const pac = {
  carrier: "Correios", carrierCode: "COR", shippingServiceCode: 3298,
  shippingServiceName: "PAC", shippingPrice: 19.28, shippingCompetitorPrice: 25, deliveryTime: 4,
};
const sedex = { ...pac, shippingServiceCode: "03220", shippingServiceName: "SEDEX", shippingPrice: 24.07, deliveryTime: 1 };

test("cota um único pacote de Ivaté na API de etiqueta e preserva códigos e preço do contrato", async () => {
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://whitelabel.frenet.com.br/v1/quotes");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.credentials, "omit");
    assert.ok(init?.signal);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("token"), input.token);
    assert.equal(headers.get("x-partner-token"), input.partnerToken);
    assert.equal(headers.get("cookie"), null);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, {
      SenderZipCode: "87525000", RecipientZipCode: "01001000", RecipientCountry: "BR", ShipmentItemValue: 15.95,
      Services: { DeclaredValue: false, ReceiptNotification: false, OwnHand: false },
      Volumes: [{ Weight: 0.88, Length: 24, Width: 15, Height: 10 }],
    });
    return Response.json({
      sessionId: "fixture-session",
      quotations: [pac, sedex, { ...pac, shippingServiceCode: "04227" }, { ...pac, carrierCode: "JAD", shippingServiceCode: "03220" }],
    });
  };
  assert.deepEqual(await quoteFrenetLabel(input, { request }), [
    { serviceId: "03298", carrier: "Correios", service: "PAC", priceCents: 1928, deliveryDays: 4, allowBuyLabel: false },
    { serviceId: "03220", carrier: "Correios", service: "SEDEX", priceCents: 2407, deliveryDays: 1, allowBuyLabel: false },
  ]);
});

test("descarta serviços com erro, de outro contrato ou com preço ambíguo", async () => {
  const request: typeof fetch = async () => Response.json({
    sessionId: "fixture-session",
    quotations: [
      pac, { ...pac, shippingServiceCode: "03298", shippingPrice: 9.99 },
      { ...sedex, error: true }, { ...pac, shippingServiceCode: "04510" },
    ],
  });
  assert.deepEqual(await quoteFrenetLabel(input, { request }), []);
});

test("também lê a grafia do OpenAPI e rejeita preço inválido do serviço", async () => {
  const request: typeof fetch = async () => Response.json({
    SessionId: "fixture-session",
    Quotations: [
      { CarrierCode: "COR", ShippingServiceCode: "03298", ShippingPrice: 20.53, DeliveryTime: 9, Error: false },
      { CarrierCode: "COR", ShippingServiceCode: 3220, ShippingPrice: -1, DeliveryTime: 4 },
    ],
  });
  const quotes = await quoteFrenetLabel(input, { request });
  assert.deepEqual(quotes.map(({ serviceId, priceCents }) => ({ serviceId, priceCents })), [{ serviceId: "03298", priceCents: 2053 }]);
});

test("valida credenciais e os limites físicos antes de consultar", async () => {
  const request: typeof fetch = async () => assert.fail("não deve consultar a Frenet");
  await assert.rejects(quoteFrenetLabel({ ...input, partnerToken: "fixture\npartner" }, { request }), { status: 503 });
  await assert.rejects(quoteFrenetLabel({ ...input, parcel: { ...input.parcel, weightGrams: 30001 } }, { request }), { status: 422 });
  await assert.rejects(quoteFrenetLabel({
    ...input, parcel: { ...input.parcel, lengthCm: 100, heightCm: 70, widthCm: 31 },
  }, { request }), { status: 422 });
});

test("retorna erro sanitizado em falhas HTTP e rejeita resposta inválida", async () => {
  for (const status of [401, 403, 429, 500]) {
    const request: typeof fetch = async () => Response.json({ Message: input.token }, { status });
    await assert.rejects(quoteFrenetLabel(input, { request }), (error: Error & { status?: number }) =>
      error.status === (status === 500 ? 502 : 503) && !error.message.includes(input.token));
  }
  const request: typeof fetch = async () => Response.json({ quotations: "not an array" });
  await assert.rejects(quoteFrenetLabel(input, { request }), { status: 502 });
});
