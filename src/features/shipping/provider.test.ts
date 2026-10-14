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
