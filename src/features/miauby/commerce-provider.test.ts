import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { createRequire } from "node:module";

const bundle = build({ entryPoints: ["src/features/miauby/commerce-provider.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
async function fixture(status: unknown = { configured: true, enabled: true, connected: true, customerStatus: true }) {
  const calls: { url: string; body: Record<string, unknown> | null }[] = [];
  const loaded = { exports: {} as typeof import("./commerce-provider") };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Buffer, AbortSignal,
    process: { env: { MIAUBY_COMMERCE_URL: "http://127.0.0.1:3130/commerce", MIAUBY_COMMERCE_TOKEN: "synthetic-private-token-xxxxxxxxxxxxxxxx" } },
    fetch: async (url: string, options: RequestInit) => {
      assert.equal(options.redirect, "error");
      const body = options.body ? JSON.parse(String(options.body)) : null;
      calls.push({ url, body });
      return Response.json(body ? { ok: true, eventId: body.eventId, status: "accepted", messageId: "synthetic", accepted: true, delivered: null, uncertain: false, duplicate: false, retryable: false } : status);
    },
  });
  return { ...loaded.exports, calls };
}
test("avisos de cliente têm endpoint e destinatário separados do canal da loja", async () => {
  const f = await fixture();
  await f.sendCommerceEvent({ id: "customer-event", type: "order_status", recipient: "5511999990000", text: "Etapa sintética" });
  await f.sendCommerceEvent({ id: "owner-event", type: "order", recipient: "5511999990000", text: "Resumo sintético" });
  assert.ok(f.calls[0].url.endsWith("/customer-status"));
  assert.equal(f.calls[0].body!.recipient, "5511999990000");
  assert.ok(f.calls[1].url.endsWith("/alerts"));
  assert.equal(Object.hasOwn(f.calls[1].body!, "recipient"), false);
});
test("destino inválido ou ausente bloqueia antes de invocar transporte, sem fallback à loja", async () => {
  const f = await fixture();
  for (const recipient of [null, "", "+5511999990000", "5511999990000@g.us", "1123456789"]) {
    const result = await f.sendCommerceEvent({ id: "invalid", type: "order_status", recipient, text: "Etapa sintética" });
    assert.equal(result.status, "blocked"); assert.equal(result.retryable, false);
  }
  assert.equal(f.calls.length, 0);
});
test("ativação exige capacidade nova e conexão confirmada", async () => {
  assert.equal(await (await fixture()).commerceCustomerStatusReady(), true);
  for (const status of [{ configured: true, enabled: true, connected: true }, { configured: true, enabled: true, connected: null, customerStatus: true }, { configured: true, enabled: false, connected: true, customerStatus: true }]) assert.equal(await (await fixture(status)).commerceCustomerStatusReady(), false);
});
