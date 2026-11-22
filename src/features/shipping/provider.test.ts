import assert from "node:assert/strict";
import test from "node:test";
import { melhorEnvioRequest } from "./provider";
import { defaultShippingSettings } from "./schema";

test("provider HTTP failures preserve safe status diagnostics without body or credentials", async (context) => {
  const diagnostics: unknown[][] = [];
  context.mock.method(console, "warn", (...args: unknown[]) => diagnostics.push(args));
  context.mock.method(globalThis, "fetch", async () => Response.json({ error: "synthetic-private-body" }, { status: 400 }));
  await assert.rejects(melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate", "synthetic-private-token", {}), { status: 502 });
  assert.deepEqual(diagnostics, [["[melhor-envio] request-failed", { operation: "calculate", status: 400 }]]);
  assert.doesNotMatch(JSON.stringify(diagnostics), /synthetic-private/);
});

test("a rejected calculation reports an invalid CEP only when the address lookup confirms it", async (context) => {
  context.mock.method(console, "warn", () => {});
  let postalCase: "missing" | "found" | "unavailable" = "missing";
  const fetcher = context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("melhorenvio.com.br")) {
      return Response.json({ error: "synthetic-private-body" }, { status: 422 });
    }
    assert.match(String(input), /^https:\/\/viacep\.com\.br\/ws\/40020000\/json\/$/);
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    if (postalCase === "missing") return Response.json({ erro: true });
    if (postalCase === "unavailable") return Response.json({}, { status: 503 });
    return Response.json({ cep: "40020-000", logradouro: "", bairro: "", localidade: "Salvador", uf: "BA" });
  });
  const quote = () => melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate", "synthetic-token", { to: { postal_code: "40020000" } });
  await assert.rejects(quote(), { status: 422, message: "CEP não encontrado. Confira os números e tente novamente." });
  for (const result of ["found", "unavailable"] as const) {
    postalCase = result;
    await assert.rejects(quote(), { status: 502, message: /não confirmou a cotação/ });
  }
  assert.equal(fetcher.mock.callCount(), 6);
  await assert.rejects(melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate",
    "synthetic-token", { to: { postal_code: "40020000" } }, { timeoutMs: 100 }), { status: 502 });
  assert.equal(fetcher.mock.callCount(), 7);
});

test("advisory timeout aborts the actual fetch signal", async context => {
  let aborted = false;
  context.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => { aborted = true; reject(new Error("synthetic abort")); }, { once: true });
  }));
  await assert.rejects(melhorEnvioRequest(defaultShippingSettings, "/api/v2/me/shipment/calculate", "synthetic", {}, { timeoutMs: 15 }), { status: 503 });
  assert.equal(aborted, true);
});
