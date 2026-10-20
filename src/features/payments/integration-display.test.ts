import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/features/payments/integration.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "payment-display-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|lib\/secret-vault$|\/provider$|asaas-integration$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
      args.path.endsWith("prisma") ? "export const getPrisma=()=>fixture.prisma;" :
      args.path.endsWith("secret-vault") ? "export const decryptValue=()=>JSON.stringify(fixture.secrets); export const encryptValue=()=>({});" :
      args.path.endsWith("provider") ? "export const mercadoPagoRequest=(...args)=>fixture.request(...args);" :
      "export const readAsaasIntegration=async()=>fixture.asaas;" }));
  } }] });

async function harness() {
  const state = {
    row: { publicKey: "synthetic-public-key", environment: "production", enabled: true, accountId: "account", revision: 1 },
    asaas: null as null | { enabled: boolean; secrets: { webhookId: string | null; methods: string[] } },
    methods: [{ id: "visa", name: "Visa", status: "active", payment_type_id: "credit_card" }],
    calls: 0, fail: false,
  };
  const loaded = { exports: {} as { publicPaymentConfiguration: (isAdmin?: boolean) => Promise<null | { publicKey: string; environment: string; brands: { id: string; name: string; image: string | null }[] }> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(import.meta.url), URL, Date, console: { error() {}, warn() {} }, fixture: {
      prisma: { paymentIntegration: { findUnique: async () => state.row } },
      secrets: { accessToken: "synthetic-private-access-token", webhookSecret: "synthetic-private-webhook-secret" },
      get asaas() { return state.asaas; },
      request: async () => { state.calls++; if (state.fail) throw new Error("synthetic-private-provider-error"); return state.methods; },
    } });
  return { state, configuration: loaded.exports.publicPaymentConfiguration };
}

test("public configuration preserves ADMIN test access and disabled Asaas/null fallback", async () => {
  const { state, configuration } = await harness();
  state.row.environment = "test";
  assert.equal(await configuration(false), null);
  assert.equal(state.calls, 0);
  assert.equal((await configuration(true))?.brands.length, 1);
  state.row.enabled = false;
  assert.equal(await configuration(false), null);
  state.asaas = { enabled: true, secrets: { webhookId: "synthetic-hook", methods: ["pix"] } };
  assert.equal(JSON.stringify(await configuration(false)), JSON.stringify({ publicKey: "", environment: "production", brands: [] }));
  state.asaas.secrets.webhookId = null;
  assert.equal(await configuration(false), null);
});

test("display configuration exposes only public fields and safely tolerates provider failure", async () => {
  const { state, configuration } = await harness();
  const result = await configuration(false);
  assert.deepEqual(Object.keys(result!).sort(), ["brands", "environment", "publicKey"]);
  assert.doesNotMatch(JSON.stringify(result), /private|accessToken|webhookSecret|accountId|revision/);
  assert.equal(result?.brands[0].image, null);
  state.row.revision++;
  state.fail = true;
  assert.equal((await configuration(false))?.brands.length, 0);
  assert.equal((await configuration(false))?.brands.length, 0);
  assert.equal(state.calls, 2, "provider failure enters cooldown rather than creating a request burst");
});
