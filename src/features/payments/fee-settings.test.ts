import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { build } from "esbuild";
import type { FeeRule } from "./fee-policy";

const key = "$aact_prod_synthetic-test-not-a-real-credential";
const vaultMaterial = "synthetic-fee-test-vault-material";
type Row = { id: string; revision: number; enabled: boolean; ciphertext: string; iv: string; tag: string; [field: string]: unknown };
type Config = { rules: FeeRule[]; apiKey?: string; environment: "production" | "sandbox"; zeroInterestInstallments: number; lastSyncAt: string | null };
const manual: FeeRule = { id: "manual-mp", provider: "mercado-pago", currency: "BRL", method: "card", fixedCents: 20,
  percentageBps: 299, minInstallments: 1, maxInstallments: 3, zeroInterestInstallments: 3, settlementDays: 30,
  checkedAt: new Date().toISOString(), validUntil: new Date(Date.now() + 86_400_000).toISOString(), source: "https://example.com/account-contract" };
const feePayload = { payment: { creditCard: { operationValue: 0.49, oneInstallmentPercentage: 2.99,
  upToSixInstallmentsPercentage: 3.49, upToTwelveInstallmentsPercentage: 3.99, daysToReceive: 32 } } };
function encrypt(config: Config) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(vaultMaterial).digest(), iv);
  return { ciphertext: Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]).toString("base64"),
    iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
function decrypt(row: Row): Config {
  const cipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(vaultMaterial).digest(), Buffer.from(row.iv, "base64"));
  cipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(row.ciphertext, "base64")), cipher.final()]).toString("utf8"));
}
const bundle = build({ entryPoints: ["src/features/payments/fee-settings.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-fee-settings", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
async function harness(config?: Config) {
  const rows = new Map<string, Row>();
  const untouchedMp = { id: "mercado-pago", revision: 17, enabled: true, ciphertext: "unrelated-mp-cipher", iv: "unrelated", tag: "unrelated" };
  rows.set("mercado-pago", untouchedMp);
  if (config) rows.set("payment-fee-policy", { id: "payment-fee-policy", revision: 3, enabled: false, ...encrypt(config) });
  const calls = { reads: [] as string[], writes: [] as string[], audit: [] as unknown[], requests: [] as { url: string; method: string; accessToken: string }[] };
  const controls = { fail: false, beforeResponse: undefined as (() => void | Promise<void>) | undefined };
  const prisma = { paymentIntegration: {
    findUnique: async ({ where }: { where: { id: string } }) => { calls.reads.push(where.id); return rows.get(where.id) ?? null; },
    create: async ({ data }: { data: Omit<Row, "revision"> }) => {
      calls.writes.push(data.id as string); const row = { revision: 1, ...data } as Row; rows.set(row.id, row); return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> & { revision: { increment: number } } }) => {
      calls.writes.push(where.id); const previous = rows.get(where.id)!;
      const row = { ...previous, ...data, revision: previous.revision + data.revision.increment }; rows.set(where.id, row); return row;
    },
  }, auditLog: { create: async ({ data }: { data: unknown }) => { calls.audit.push(data); } }, $executeRaw: async () => 1,
  $transaction: async (execute: (tx: unknown) => Promise<unknown>) => execute(prisma) };
  const loaded = { exports: {} as {
    feeSettingsView: () => Promise<{ rules: FeeRule[]; connected: boolean; chargesEnabled: false; revision: number }>;
    saveFeeSettings: (input: { revision: number; rules: FeeRule[]; environment: "production" | "sandbox"; zeroInterestInstallments: number; apiKey?: string }, userId: string) => Promise<void>;
    synchronizeFeeSettings: (userId?: string) => Promise<void>;
  } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(import.meta.url), Buffer, URL, Response, AbortSignal, console,
    process: { env: { SECRET_VAULT_KEY: vaultMaterial } }, fixture: { prisma },
    fetch: async (url: string, options: RequestInit) => {
      calls.requests.push({ url, method: options.method ?? "GET", accessToken: (options.headers as Record<string, string>).access_token });
      await controls.beforeResponse?.();
      const body = url.endsWith("/wallets/") ? { data: [{ id: "ba942666-0578-403a-9d32-cd4aa9682b0d" }], hasMore: false } : feePayload;
      return new Response(JSON.stringify(controls.fail ? { error: key } : body), { status: controls.fail ? 500 : 200 });
    },
  });
  return { service: loaded.exports, rows, calls, controls, untouchedMp };
}
const saved = (): Config => ({ rules: [manual], apiKey: key, environment: "production", zeroInterestInstallments: 3, lastSyncAt: null });
const input = (revision = 0) => ({ revision, rules: [manual], environment: "production" as const, zeroInterestInstallments: 3, apiKey: key });

test("fee credentials use the real encrypted vault and remain outside views, audit and Mercado Pago", async () => {
  const fixture = await harness();
  await fixture.service.saveFeeSettings(input(), "synthetic-admin");
  const row = fixture.rows.get("payment-fee-policy")!;
  assert.equal(row.enabled, false);
  assert.equal(row.publicKey, "fee-policy-v1");
  assert.equal(decrypt(row).apiKey, key);
  assert.ok(!JSON.stringify(row).includes(key));
  const view = await fixture.service.feeSettingsView();
  assert.equal(view.connected, true);
  assert.equal(view.chargesEnabled, false);
  assert.equal(view.rules.length, 4);
  assert.ok(!JSON.stringify(view).includes(key));
  assert.ok(!JSON.stringify(fixture.calls.audit).includes(key));
  assert.equal(fixture.rows.get("mercado-pago"), fixture.untouchedMp);
  assert.ok(fixture.calls.reads.every(id => id === "payment-fee-policy"));
  assert.ok(fixture.calls.writes.every(id => id === "payment-fee-policy"));
  assert.deepEqual(fixture.calls.requests, [{ url: "https://api.asaas.com/v3/myAccount/fees/", method: "GET", accessToken: key },
    { url: "https://api.asaas.com/v3/wallets/", method: "GET", accessToken: key }]);
  assert.ok(view.rules.filter(rule => rule.provider === "asaas").every(rule => rule.accountId === "ba942666-0578-403a-9d32-cd4aa9682b0d" && rule.processingMode === "hosted-card"));
});

test("a stale settings revision rejects before querying any provider or writing", async () => {
  const fixture = await harness(saved());
  await assert.rejects(fixture.service.saveFeeSettings(input(2), "synthetic-admin"), /As tarifas foram atualizadas/);
  assert.equal(fixture.calls.requests.length, 0);
  assert.equal(fixture.calls.writes.length, 0);
  assert.equal(fixture.calls.audit.length, 0);
});

test("a concurrent update during provider lookup cannot overwrite the newer revision", async () => {
  const fixture = await harness(saved());
  fixture.controls.beforeResponse = () => { fixture.rows.get("payment-fee-policy")!.revision = 4; };
  await assert.rejects(fixture.service.saveFeeSettings(input(3), "synthetic-admin"), /As tarifas foram atualizadas/);
  assert.equal(fixture.rows.get("payment-fee-policy")!.revision, 4);
  assert.equal(fixture.calls.writes.length, 0);
  assert.equal(fixture.calls.audit.length, 0);
});

test("sandbox fees never enter real purchase comparisons on save or refresh", async () => {
  const fixture = await harness();
  await fixture.service.saveFeeSettings({ ...input(), environment: "sandbox" }, "synthetic-admin");
  await fixture.service.synchronizeFeeSettings("synthetic-admin");
  const view = await fixture.service.feeSettingsView();
  assert.deepEqual(JSON.parse(JSON.stringify(view.rules)), [manual]);
  assert.ok(fixture.calls.requests.every(request => request.url === "https://api-sandbox.asaas.com/v3/myAccount/fees/"));
});

test("provider failures preserve the previous snapshot and never expose response secrets", async () => {
  const fixture = await harness(saved());
  const previous = JSON.stringify(fixture.rows.get("payment-fee-policy"));
  fixture.controls.fail = true;
  for (const operation of [() => fixture.service.saveFeeSettings(input(3), "synthetic-admin"),
    () => fixture.service.synchronizeFeeSettings("synthetic-admin")]) {
    await assert.rejects(operation(), (error: Error) => !error.message.includes(key) && /não confirmou acesso/.test(error.message));
    assert.equal(JSON.stringify(fixture.rows.get("payment-fee-policy")), previous);
  }
  assert.equal(fixture.calls.writes.length, 0);
  assert.equal(fixture.calls.audit.length, 0);
});

test("unconnected automatic refresh stays local and explicit refresh reports the missing account", async () => {
  const fixture = await harness();
  await fixture.service.synchronizeFeeSettings();
  await assert.rejects(fixture.service.synchronizeFeeSettings("synthetic-admin"), /Conecte a conta Asaas/);
  assert.equal(fixture.calls.requests.length, 0);
  assert.equal(fixture.calls.writes.length, 0);
});

test("changing provider environment without a new credential fails before lookup", async () => {
  const fixture = await harness(saved());
  await assert.rejects(fixture.service.saveFeeSettings({ ...input(3), apiKey: undefined, environment: "sandbox" }, "synthetic-admin"), /credencial do novo ambiente/);
  assert.equal(fixture.calls.requests.length, 0);
  assert.equal(fixture.calls.writes.length, 0);
});
