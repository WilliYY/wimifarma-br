import assert from "node:assert/strict";
import test from "node:test";
import { quoteFrenet } from "./frenet";

const input = {
  token: "synthetic-private-token",
  originPostalCode: "87525000",
  destinationPostalCode: "01001000",
  invoiceValueCents: 2_590,
  items: [{ weightGrams: 420, lengthCm: 25, heightCm: 10, widthCm: 15, quantity: 2 }],
};

const pac = {
  ServiceCode: "03298",
  ServiceDescription: "PAC",
  Carrier: "Correios",
  ShippingPrice: "19.90",
  DeliveryTime: "6",
  Error: false,
  AllowBuyLabel: true,
};

test("Frenet uses secure quote endpoint and preserves service codes and label availability", async context => {
  const mock = context.mock.method(globalThis, "fetch", async () => Response.json({
    ShippingSevicesArray: [
      pac,
      { ...pac, ServiceCode: "F_3", ServiceDescription: "Package", Carrier: "Jadlog", ShippingPrice: 27.4, DeliveryTime: 4, AllowBuyLabel: false },
    ],
  }));
  assert.deepEqual(await quoteFrenet({ ...input, partnerToken: "synthetic-partner-token" }), [
    { serviceId: "03298", service: "PAC", carrier: "Correios", priceCents: 1990, deliveryDays: 6, allowBuyLabel: true },
    { serviceId: "F_3", service: "Package", carrier: "Jadlog", priceCents: 2740, deliveryDays: 4, allowBuyLabel: false },
  ]);
  const [url, request] = mock.mock.calls[0]!.arguments as unknown as [string, RequestInit];
  assert.equal(url, "https://api.frenet.com.br/shipping/quote");
  assert.equal(request.method, "POST");
  assert.equal(request.redirect, "error");
  assert.equal(request.cache, "no-store");
  const headers = new Headers(request.headers);
  assert.equal(headers.get("token"), input.token);
  assert.equal(headers.get("x-partner-token"), "synthetic-partner-token");
  assert.deepEqual(JSON.parse(request.body as string), {
    SellerCEP: "87525000", RecipientCEP: "01001000", RecipientCountry: "BR",
    ShipmentInvoiceValue: 25.90,
    ShippingItemArray: [{ Weight: 0.42, Length: 25, Height: 10, Width: 15, Quantity: 2 }],
  });
});

test("Frenet discards unavailable or malformed options and ambiguous service codes", async context => {
  const mock = context.mock.method(globalThis, "fetch", async () => Response.json({
    ShippingSevicesArray: [
      pac,
      { ...pac, ServiceCode: "F_1", Error: true, Msg: "unavailable" },
      { ...pac, ServiceCode: "F_2", ShippingPrice: "" },
      { ...pac, ServiceCode: 3298 },
      { ...pac, ServiceCode: "F_3", DeliveryTime: "3-5" },
      { ...pac, ServiceCode: "F_4" },
      { ...pac, ServiceCode: "F_4", ShippingPrice: "9.99" },
    ],
  }));
  assert.deepEqual((await quoteFrenet(input)).map(quote => quote.serviceId), ["03298"]);
  const [, request] = mock.mock.calls[0]!.arguments as unknown as [string, RequestInit];
  assert.equal(new Headers(request.headers).get("x-partner-token"), null);
});

test("Frenet validates input before calling the provider", async context => {
  const fetch = context.mock.method(globalThis, "fetch", async () => Response.json({}));
  await assert.rejects(quoteFrenet({ ...input, originPostalCode: "00000000" }), { status: 422 });
  await assert.rejects(quoteFrenet({ ...input, items: [] }), { status: 422 });
  await assert.rejects(quoteFrenet({ ...input, token: " " }), { status: 503 });
  assert.equal(fetch.mock.callCount(), 0);
});

test("Frenet reports format drift when a nonempty response has no usable option", async context => {
  let rows: unknown[] = [{ ServiceCode: "03298", ShippingPrice: input.token }];
  context.mock.method(globalThis, "fetch", async () => Response.json({ ShippingSevicesArray: rows }));
  const invalidQuote = { status: 502, message: "A Frenet retornou uma cotação inválida." };

  await assert.rejects(quoteFrenet(input), invalidQuote);
  rows = [null, { Error: true }];
  await assert.rejects(quoteFrenet(input), invalidQuote);
  rows = [pac, { ...pac, ShippingPrice: "9.99" }];
  await assert.rejects(quoteFrenet(input), invalidQuote);

  rows = [{ Error: true, Msg: "unavailable" }, { Error: true }];
  assert.deepEqual(await quoteFrenet(input), []);
});

test("Frenet rejects invalid envelopes and safely classifies provider failures", async context => {
  let response = Response.json({ error: input.token }, { status: 401 });
  context.mock.method(globalThis, "fetch", async () => response);
  const safeError = (status: number) => (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal((error as Error & { status?: number }).status, status);
    assert.doesNotMatch(error.message, /synthetic-private-token/);
    return true;
  };
  await assert.rejects(quoteFrenet(input), safeError(503));
  response = Response.json({ error: input.token }, { status: 429 });
  await assert.rejects(quoteFrenet(input), safeError(503));
  response = Response.json({ error: input.token }, { status: 500 });
  await assert.rejects(quoteFrenet(input), safeError(502));
  response = Response.json({ unexpected: input.token });
  await assert.rejects(quoteFrenet(input), safeError(502));
  response = new Response("invalid JSON");
  await assert.rejects(quoteFrenet(input), safeError(502));
  response = Response.json({ ShippingSevicesArray: [] });
  assert.deepEqual(await quoteFrenet(input), []);
});

test("Frenet timeout aborts the fetch", async context => {
  let aborted = false;
  context.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new Error(input.token));
      }, { once: true });
    }));
  await assert.rejects(quoteFrenet(input, { timeoutMs: 15 }), {
    status: 503, message: "Não foi possível consultar a Frenet agora. Tente novamente em instantes.",
  });
  assert.equal(aborted, true);
});
