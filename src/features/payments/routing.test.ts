import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

type Row = { id: string; accountId: string; enabled: boolean; environment: string; revision: number; ciphertext: string };
const mp: Row = { id: "mercado-pago", accountId: "mp-account", enabled: true, environment: "production", revision: 4, ciphertext: "synthetic-ciphertext" };
const asaas: Row = { ...mp, id: "asaas", accountId: "asaas-account" };
const input = { amountCents: 10000, method: "card" as const, installments: 1 };
const bundle = build({ entryPoints: ["src/features/payments/routing.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "routing-fixture", setup(builder) {
    builder.onResolve({ filter: /asaas-integration$|lib\/prisma$|lib\/secret-vault$|asaas-fees$|asaas-provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
      args.path.endsWith("asaas-integration") ? "export const decodeAsaasIntegration=(row)=>fixture.decode(row);"
        : args.path.endsWith("prisma") ? "export const getPrisma=()=>{throw new Error('global Prisma forbidden')};"
          : args.path.endsWith("secret-vault") ? "export const decryptValue=(row)=>row.ciphertext; export const encryptValue=()=>{throw new Error('write forbidden')};"
            : args.path.endsWith("asaas-fees") ? "export const retrieveAsaasFees=()=>{throw new Error('network forbidden')};"
              : "export const retrieveAsaasWalletId=()=>{throw new Error('network forbidden')};" }));
  } }] });
const rule = (provider: "asaas" | "mercado-pago", percentageBps: number) => ({ id: provider, provider,
  accountId: provider === "asaas" ? asaas.accountId : mp.accountId, processingMode: provider === "asaas" ? "hosted-card" : "orders",
  method: "card", currency: "BRL", fixedCents: 0, percentageBps, minInstallments: 1, maxInstallments: 1,
  zeroInterestInstallments: 1, settlementDays: 30, checkedAt: new Date(Date.now() - 1000).toISOString(),
  validUntil: new Date(Date.now() + 60_000).toISOString(), source: "https://example.com/contract" });
async function harness(rows = [mp, asaas], options: { invalid?: boolean; webhook?: boolean; rules?: unknown[] } = {}) {
  const calls = { decode: 0, feeReads: 0 };
  const tx = { paymentIntegration: {
    findMany: async () => rows,
    findUnique: async ({ where }: { where: { id: string } }) => {
      assert.equal(where.id, "payment-fee-policy");
      calls.feeReads++;
      return { ciphertext: JSON.stringify({ rules: options.rules ?? [] }) };
    },
  } };
  const loaded = { exports: {} };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    fixture: { decode: () => {
      calls.decode++;
      if (options.invalid) throw new Error("synthetic-private-token synthetic-email@example.com decrypted-secret");
      return { methods: ["pix", "card"], webhookId: options.webhook === false ? null : "synthetic-webhook" };
    } }, console, URL });
  return { routing: loaded.exports as typeof import("./routing"), tx: tx as unknown as Parameters<typeof import("./routing").checkoutPaymentConnections>[0], calls };
}
function json(value: unknown) { return JSON.parse(JSON.stringify(value)); }

test("configuração Asaas inválida conserva Mercado Pago com motivo e diagnóstico seguro auditáveis", async () => {
  const { routing, tx, calls } = await harness([mp, asaas], { invalid: true });
  const connections = await routing.checkoutPaymentConnections(tx, false);
  const selected = await routing.resolveCheckoutPayment(connections, input, tx);
  assert.equal(selected.integration.id, "mercado-pago");
  assert.deepEqual(json(selected.route), { provider: "mercado-pago", reason: "invalid-provider-configuration",
    diagnostics: [{ provider: "asaas", category: "invalid-configuration" }] });
  const metadata = JSON.stringify({ ...selected.route, integrationRevision: selected.integration.revision, ...input });
  for (const secret of ["synthetic-private-token", "synthetic-email@example.com", "decrypted-secret", "synthetic-ciphertext"]) assert.ok(!metadata.includes(secret));
  assert.equal(calls.feeReads, 1);
});

test("Asaas desativado não é decodificado nem confundido com configuração inválida", async () => {
  const { routing, tx, calls } = await harness([mp, { ...asaas, enabled: false }], { invalid: true });
  const selected = await routing.resolveCheckoutPayment(await routing.checkoutPaymentConnections(tx, false), input, tx);
  assert.deepEqual(json(selected.route), { provider: "mercado-pago", reason: "only-available" });
  assert.equal(calls.decode, 0);
});

test("webhook ausente em Asaas habilitado produz diagnóstico explícito e fallback seguro", async () => {
  const { routing, tx } = await harness([mp, asaas], { webhook: false });
  const selected = await routing.resolveCheckoutPayment(await routing.checkoutPaymentConnections(tx, false), input, tx);
  assert.deepEqual(json(selected.route), { provider: "mercado-pago", reason: "invalid-provider-configuration",
    diagnostics: [{ provider: "asaas", category: "missing-webhook" }] });
});

test("tarifas são lidas na mesma transação e mantêm seleção pelo menor custo confirmado", async () => {
  const { routing, tx, calls } = await harness([mp, asaas], { rules: [rule("mercado-pago", 499), rule("asaas", 299)] });
  const selected = await routing.resolveCheckoutPayment(await routing.checkoutPaymentConnections(tx, false), input, tx);
  assert.deepEqual(json(selected.route), { provider: "asaas", reason: "confirmed-fees", ruleId: "asaas", feeCents: 299 });
  assert.equal(selected.integration, asaas);
  assert.equal(calls.feeReads, 1);
});

test("Asaas inválido sem outro gateway falha com mensagem pública sem erro bruto", async () => {
  const { routing, tx } = await harness([asaas], { invalid: true });
  await assert.rejects(routing.checkoutPaymentConnections(tx, false), { message: "Pagamento online indisponível. Escolha outra forma de pagamento.", status: 503 });
});

test("teste ADMIN permanece isolado de Asaas e das tarifas produtivas", async () => {
  const { routing, tx, calls } = await harness([{ ...mp, environment: "test" }, asaas], { invalid: true });
  const selected = await routing.resolveCheckoutPayment(await routing.checkoutPaymentConnections(tx, true), input, tx);
  assert.deepEqual(json(selected.route), { provider: "mercado-pago", reason: "test-only" });
  assert.equal(calls.decode, 0);
  assert.equal(calls.feeReads, 0);
});
