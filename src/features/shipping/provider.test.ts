import assert from "node:assert/strict";
import test from "node:test";
import { melhorEnvioRequest } from "./provider";
import { defaultShippingSettings } from "./schema";
import { compareCorreios } from "./correios-checkout";

test("provider HTTP failures preserve safe status diagnostics without body or credentials", async (context) => {
  const diagnostics: unknown[][] = [];
  context.mock.method(console, "warn", (...args: unknown[]) => diagnostics.push(args));
  context.mock.method(globalThis, "fetch", async () => Response.json({ error: "synthetic-private-body" }, { status: 400 }));
  await assert.rejects(melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate", "synthetic-private-token", {}), { status: 502 });
  assert.deepEqual(diagnostics, [["[melhor-envio] request-failed", { operation: "calculate", status: 400 }]]);
  assert.doesNotMatch(JSON.stringify(diagnostics), /synthetic-private/);
});

test("a rejected calculation cannot establish an invalid CEP or suppress an independent quote", async (context) => {
  context.mock.method(console, "warn", () => {});
  const fetcher = context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (String(input).includes("melhorenvio.com.br")) return Response.json({ error: "synthetic-private-body" }, { status: 422 });
    return Response.json({ erro: true });
  });
  const quote = () => melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate", "synthetic-token", { to: { postal_code: "40020000" } });
  await assert.rejects(quote(), { status: 502, message: /não confirmou a cotação/ });
  assert.equal(fetcher.mock.callCount(), 1, "shipment rejection does not query a postal directory or repeat calculation");
  const direct = [{ provider: "correios" as const, serviceId: 3298, serviceCode: "03298" as const, carrier: "Correios", service: "PAC", priceCents: 1000, deliveryDays: 4 }];
  assert.deepEqual(await compareCorreios(quote().then(() => []), Promise.resolve(direct)), { primaryOptions: [], correiosOptions: direct });
  await assert.rejects(compareCorreios(quote().then(() => []), Promise.resolve([])), { status: 502, message: /não confirmou a cotação/ });
  await assert.rejects(melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate",
    "synthetic-token", { to: { postal_code: "40020000" } }, { timeoutMs: 100 }), { status: 502 });
  assert.equal(fetcher.mock.callCount(), 4);
});

test("advisory timeout aborts the actual fetch signal", async context => {
  let aborted = false;
  context.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => { aborted = true; reject(new Error("synthetic abort")); }, { once: true });
  }));
  await assert.rejects(melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate", "synthetic", {}, { timeoutMs: 15 }), { status: 503 });
  assert.equal(aborted, true);
});
