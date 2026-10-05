import assert from "node:assert/strict";
import test from "node:test";
import { createCheckoutQuote } from "./checkout-quote";

const request = { postalCode: "01001000", items: [{ productId: "synthetic-product", quantity: 1, expectedUnitPriceCents: 2000 }] };
const option = { provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 1500, deliveryDays: 5, token: "synthetic-quote" };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("checkout quote waits 450 ms and replacement cart cancels the previous debounce", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  context.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    calls.push(String(init.body));
    return Response.json({ data: [option] });
  });
  const quote = createCheckoutQuote();
  quote.schedule(request, () => {});
  context.mock.timers.tick(449);
  assert.equal(calls.length, 0);
  const changed = { ...request, items: [{ ...request.items[0], quantity: 2 }] };
  quote.schedule(changed, () => {});
  context.mock.timers.tick(449);
  assert.equal(calls.length, 0);
  context.mock.timers.tick(1);
  await flush();
  assert.deepEqual(calls, [JSON.stringify(changed)]);
  quote.cancel();
});

test("obsolete responses cannot publish options or errors after replacement or cancellation", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const pending: { resolve: (response: Response) => void; signal: AbortSignal }[] = [];
  context.mock.method(globalThis, "fetch", (_url: unknown, init: RequestInit) => new Promise<Response>((resolve) => {
    pending.push({ resolve, signal: init.signal as AbortSignal });
  }));
  const states: { busy: boolean; message: string; options: unknown[] }[] = [];
  const quote = createCheckoutQuote();
  quote.schedule(request, (state) => states.push(state));
  context.mock.timers.tick(450);
  quote.schedule({ ...request, postalCode: "69005010" }, (state) => states.push(state));
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve(Response.json({ data: [option] }));
  await flush();
  assert.equal(states.length, 2);
  context.mock.timers.tick(450);
  quote.cancel();
  assert.equal(pending[1].signal.aborted, true);
  pending[1].resolve(Response.json({ error: "Obsolete error" }, { status: 422 }));
  await flush();
  assert.equal(states.length, 2);
});

test("failure permits explicit retry and options remain ordered by price", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return calls === 1 ? Response.json({ error: "Consulta indisponível." }, { status: 503 }) : Response.json({ data: [option, { ...option, serviceId: 2, priceCents: 1000 }] });
  });
  const states: { busy: boolean; message: string; options: { serviceId: number }[] }[] = [];
  const quote = createCheckoutQuote();
  quote.schedule(request, (state) => states.push(state));
  context.mock.timers.tick(450);
  await flush();
  assert.equal(states.at(-1)?.message, "Consulta indisponível.");
  assert.equal(calls, 1);
  quote.schedule(request, (state) => states.push(state), 0);
  assert.deepEqual(states.at(-1), { busy: true, message: "", options: [] });
  context.mock.timers.tick(0);
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(states.at(-1)?.options.map((item) => item.serviceId), [2, 1]);
  assert.equal(states.at(-1)?.busy, false);
  quote.cancel();
});

test("empty or incomplete requests never call the quote API and cancellation clears debounce", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => { calls += 1; return Response.json({ data: [] }); });
  const quote = createCheckoutQuote();
  quote.schedule(request, () => {});
  quote.cancel();
  context.mock.timers.tick(450);
  quote.schedule({ ...request, items: [] }, () => {});
  quote.schedule({ ...request, postalCode: "01001" }, () => {});
  context.mock.timers.tick(450);
  await flush();
  assert.equal(calls, 0);
});

test("invalid and empty provider responses clear busy state without fabricated options", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return Response.json({ data: calls === 1 ? [{ ...option, token: "" }] : [] });
  });
  const states: { busy: boolean; message: string; options: unknown[] }[] = [];
  const quote = createCheckoutQuote();
  quote.schedule(request, (state) => states.push(state));
  context.mock.timers.tick(450);
  await flush();
  assert.deepEqual(states.at(-1), { busy: false, message: "Não foi possível consultar o frete agora.", options: [] });
  quote.schedule(request, (state) => states.push(state), 0);
  context.mock.timers.tick(0);
  await flush();
  assert.equal(states.at(-1)?.busy, false);
  assert.deepEqual(states.at(-1)?.options, []);
  assert.match(states.at(-1)?.message ?? "", /Nenhuma transportadora disponível/);
  quote.cancel();
});

test("invalid item quantities show a correction message without requesting freight", (context) => {
  const fetch = context.mock.method(globalThis, "fetch", async () => Response.json({ data: [option] }));
  const states: { busy: boolean; message: string; options: unknown[] }[] = [];
  const quote = createCheckoutQuote();
  quote.schedule({ ...request, items: [{ ...request.items[0], quantity: 21 }] }, state => states.push(state));
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(states.at(-1)?.busy, false);
  assert.match(states.at(-1)?.message ?? "", /quantidade/);
  assert.deepEqual(states.at(-1)?.options, []);
  quote.cancel();
});
