import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { defaultShippingSettings } from "./schema";

test("public carrier availability only reads configuration and fails closed", async () => {
  const result = await build({ entryPoints: ["src/features/shipping/integration.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-shipping-availability", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|lib\/secret-vault$|^\.\/provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>({shippingIntegration:{findUnique:globalThis.fixture.findUnique},$transaction:()=>{throw new Error('Mutation must not occur')}});"
      : args.path.endsWith("secret-vault")
        ? "export const decryptValue=()=>globalThis.fixture.decrypt(); export const encryptValue=()=>{throw new Error('Encryption must not occur')};"
        : "export const melhorEnvioRequest=()=>{throw new Error('Provider must not be called')}; export const tokenSchema={};" }));
  } }] });
  const settings = { ...defaultShippingSettings, enabled: true, serviceIds: [1, 2], contactEmail: "shipping@example.com" };
  const credentials = { clientId: "synthetic-client", clientSecret: "synthetic-secret", accessToken: "synthetic-access", refreshToken: "synthetic-refresh", expiresAt: 1 };
  const row = { settings, revision: 1, ciphertext: "synthetic-ciphertext", iv: "synthetic-iv", tag: "synthetic-tag" };
  let currentRow: unknown = row;
  let currentCredentials: unknown = credentials;
  let readFailure = false;
  let decryptionFailure = false;
  let reads = 0;
  const diagnostics: unknown[][] = [];
  const fixture = {
    findUnique: async () => { reads += 1; if (readFailure) throw new Error("Synthetic database failure"); return currentRow; },
    decrypt: () => { if (decryptionFailure) throw new Error("Synthetic decryption failure"); return JSON.stringify(currentCredentials); },
  };
  const loaded = { exports: {} as { publicCarrierShippingAvailable: () => Promise<boolean> } };
  const env = { FRENET_CHECKOUT_ENABLED: "false", FRENET_API_TOKEN: "", FRENET_PARTNER_TOKEN: "" };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), process: { env }, Buffer, Date, fixture, console: { error: (...args: unknown[]) => diagnostics.push(args) } });
  assert.equal(typeof loaded.exports.publicCarrierShippingAvailable, "function");
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), true, "expired tokens are not refreshed by a UI read");
  assert.equal(reads, 1);
  for (const change of [{ enabled: false }, { environment: "sandbox" }, { serviceIds: [] }]) {
    currentRow = { ...row, settings: { ...settings, ...change } };
    assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  }
  currentRow = null;
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  currentRow = { ...row, ciphertext: null };
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  currentRow = row;
  for (const change of [{ accessToken: undefined }, { refreshToken: undefined }, { accessToken: "" }, { refreshToken: "" }]) {
    currentCredentials = { ...credentials, ...change };
    assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  }
  currentCredentials = credentials;
  assert.deepEqual(diagnostics, [], "normal disabled or disconnected states are not operational errors");
  readFailure = true;
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  readFailure = false;
  decryptionFailure = true;
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  decryptionFailure = false;
  currentRow = { ...row, settings: { ...settings, originPostalCode: "invalid" } };
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  assert.deepEqual(diagnostics, Array.from({ length: 3 }, () => ["[melhor-envio] connection-unavailable"]), "operational failures are observable without error details or credentials");

  currentRow = { ...row, ciphertext: null };
  env.FRENET_API_TOKEN = "fixture-token";
  env.FRENET_PARTNER_TOKEN = "fixture-partner";
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false, "tokens alone keep Frenet off");
  env.FRENET_CHECKOUT_ENABLED = "true";
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), true, "Frenet is available from Ivaté without a Melhor Envio token");
  env.FRENET_PARTNER_TOKEN = "";
  assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  env.FRENET_PARTNER_TOKEN = "fixture-partner";
  for (const change of [{ originPostalCode: "87485000" }, { enabled: false }, { environment: "sandbox" }]) {
    currentRow = { ...row, ciphertext: null, settings: { ...settings, ...change } };
    assert.equal(await loaded.exports.publicCarrierShippingAvailable(), false);
  }
});
