import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { build } from "esbuild";

const wallet = "131ca662-56c8-4479-b5b3-fd61a413fce7";
const otherWallet = "231ca662-56c8-4479-b5b3-fd61a413fce7";
const token = "$aact_prod_synthetic-offline-token";
const material = "synthetic-production-integration-vault";
function encrypted(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(material).digest(), iv);
  return { ciphertext: Buffer.concat([cipher.update(value), cipher.final()]).toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
function plaintext(row: { ciphertext: string; iv: string; tag: string }) {
  const cipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(material).digest(), Buffer.from(row.iv, "base64"));
  cipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([cipher.update(Buffer.from(row.ciphertext, "base64")), cipher.final()]).toString();
}
type Row = { id: string; revision: number; environment: string; enabled: boolean; publicKey: string; accountId: string; ciphertext: string; iv: string; tag: string };
type Secrets = { accessToken: string; webhookSecret: string; pixAddressKey: string | null; webhookUrl: string; webhookId: string | null;
  registrationAttempted: boolean; methods: string[]; email: string };
type Query = { where: Record<string, unknown> };
const bundle = build({ entryPoints: ["src/features/payments/asaas-integration.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "production-integration-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|fee-settings$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>fixture.prisma;" : "export const productionAsaasToken=async()=>fixture.token();" }));
  } }] });
async function harness() {
  const rows = new Map<string, Row>();
  const hooks: Record<string, unknown>[] = [];
  const calls = { writes: [] as string[], requests: [] as { url: string; body?: Record<string, unknown> }[], proofs: [] as Query[], audits: [] as Record<string, unknown>[] };
  const controls = { approved: true, wallet, pix: true, failPost: false, hasMore: false, active: 0, cardProof: 1, pixProof: 0,
    raceOnSave: false, raceOnRegister: false, accessToken: token };
  let transactionTail = Promise.resolve();
  const prisma = { paymentIntegration: {
    findUnique: async ({ where }: { where: { id: string } }) => rows.has(where.id) ? { ...rows.get(where.id)! } : null,
    create: async ({ data }: { data: Row }) => { calls.writes.push(data.id); rows.set(data.id, { ...data }); return { ...data }; },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> & { revision: { increment: number } } }) => {
      const previous = rows.get(where.id)!; const row = { ...previous, ...data, revision: previous.revision + data.revision.increment };
      calls.writes.push(where.id); rows.set(where.id, row); return { ...row };
    },
    updateMany: async ({ where, data }: { where: { id: string; revision: number }; data: Partial<Row> & { revision: { increment: number } } }) => {
      const previous = rows.get(where.id);
      if (!previous || previous.revision !== where.revision || controls.raceOnSave) return { count: 0 };
      calls.writes.push(where.id); rows.set(where.id, { ...previous, ...data, revision: previous.revision + data.revision.increment }); return { count: 1 };
    },
  }, onlinePayment: { count: async (query: Query) => {
    if (query.where.integrationId !== "asaas-sandbox") return controls.active;
    calls.proofs.push(query); return query.where.method === "card" ? controls.cardProof : controls.pixProof;
  } }, auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => calls.audits.push(data) },
  asaasWebhookReceipt: { count: async () => 1 },
  $executeRaw: async () => 1, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    const previous = transactionTail; let release!: () => void;
    transactionTail = new Promise<void>(resolve => { release = resolve; }); await previous;
    try { return await fn(prisma); } finally { release(); }
  } };
  const loaded = { exports: {} as { prepareAsaasIntegration: (input: { revision: number; email: string }, userId: string) => Promise<void>;
    activateAsaasIntegration: (input: { revision: number; enabled: boolean; methods: string[] }, userId: string) => Promise<void>;
    readAsaasIntegration: () => Promise<(Row & { secrets: Secrets }) | null>; asaasIntegrationView: () => Promise<Record<string, unknown>> } };
  const env = { SECRET_VAULT_KEY: material, AUTH_URL: "https://example.com" };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    Buffer, URL, Response, AbortSignal, process: { env }, fixture: { prisma, token: () => controls.accessToken },
    fetch: async (url: string, options: RequestInit) => {
      const body = options.body ? JSON.parse(String(options.body)) : undefined; calls.requests.push({ url, body });
      assert.ok(url.startsWith("https://api.asaas.com/v3/"), "Only production provider requests may reach the offline fixture");
      if (url.endsWith("/myAccount/status/")) return Response.json({ general: controls.approved ? "APPROVED" : "PENDING" });
      if (url.endsWith("/wallets/")) return Response.json({ data: [{ id: controls.wallet }], hasMore: false });
      if (url.includes("/pix/addressKeys")) return Response.json({ data: controls.pix ? [{ id: wallet, key: wallet, type: "EVP", status: "ACTIVE" }] : [], hasMore: false });
      if (url.includes("/webhooks") && !body) return Response.json({ data: hooks, hasMore: controls.hasMore });
      if (url.endsWith("/webhooks") && body) {
        assert.ok(rows.has("asaas"), "Connection must be persisted before the remote POST");
        assert.equal(JSON.parse(plaintext(rows.get("asaas")!)).registrationAttempted, true, "Claim must survive uncertain delivery");
        if (controls.failPost) throw new Error("synthetic-uncertain-delivery");
        const hook = { ...body, id: wallet, hasAuthToken: true }; delete hook.authToken; hooks.push(hook);
        if (controls.raceOnRegister) rows.get("asaas")!.revision++;
        return Response.json(hook);
      }
      throw new Error("Unexpected network request is forbidden");
    } });
  const secrets = () => JSON.parse(plaintext(rows.get("asaas")!)) as Secrets;
  const changeSecrets = (data: Partial<Secrets>) => Object.assign(rows.get("asaas")!, encrypted(JSON.stringify({ ...secrets(), ...data })));
  return { service: loaded.exports, rows, hooks, calls, controls, env, secrets, changeSecrets };
}
const input = (revision = 0) => ({ revision, email: "owner@example.invalid" });
test("preparation encrypts credentials, persists nonce claim before POST and exposes only safe connection state", async () => {
  const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin");
  const row = h.rows.get("asaas")!; assert.equal(row.enabled, false); assert.equal(row.revision, 2); assert.equal(row.accountId, wallet);
  assert.doesNotMatch(JSON.stringify(row), /aact_prod/); assert.match(h.secrets().webhookUrl, /\/asaas\/webhook\?binding=[a-f0-9-]{36}$/);
  assert.equal(h.secrets().webhookId, wallet); assert.equal(h.calls.requests.filter(call => call.body).length, 1);
  assert.doesNotMatch(JSON.stringify(await h.service.asaasIntegrationView()), /accessToken|webhookSecret|binding|aact_prod/);
  assert.doesNotMatch(JSON.stringify(h.calls.audits), /aact_prod|webhookSecret/);
});
test("unapproved production account stops before persistence or webhook registration", async () => {
  const h = await harness(); h.controls.approved = false;
  await assert.rejects(h.service.prepareAsaasIntegration(input(), "admin")); assert.equal(h.calls.writes.length, 0);
  assert.equal(h.calls.requests.filter(call => call.body).length, 0);
});
test("Sandbox credential cannot be decoded as production integration", async () => {
  const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin"); h.changeSecrets({ accessToken: "$aact_hmlg_synthetic" });
  await assert.rejects(h.service.readAsaasIntegration(), (error: Error) => !error.message.includes("aact_hmlg"));
});
test("integration refuses wrong environment, wallet and webhook nonce or origin", async () => {
  for (const fault of ["environment", "wallet", "nonce", "origin", "extra-query"]) {
    const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin");
    if (fault === "environment") h.rows.get("asaas")!.environment = "test";
    if (fault === "wallet") h.rows.get("asaas")!.accountId = "invalid";
    if (fault === "nonce") h.changeSecrets({ webhookUrl: "https://example.com/api/pagamentos/asaas/webhook?binding=invalid" });
    if (fault === "origin") h.changeSecrets({ webhookUrl: `https://evil.invalid/api/pagamentos/asaas/webhook?binding=${wallet}` });
    if (fault === "extra-query") h.changeSecrets({ webhookUrl: h.secrets().webhookUrl + "&extra=1" });
    await assert.rejects(h.service.readAsaasIntegration());
  }
});
test("incompatible or ambiguous webhook never replaces a known binding or issues another POST", async () => {
  for (const fault of ["hasAuthToken", "authToken", "interrupted", "events", "duplicate", "nonce", "pagination"]) {
    const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin"); const before = plaintext(h.rows.get("asaas")!);
    if (fault === "hasAuthToken") h.hooks[0].hasAuthToken = false;
    if (fault === "authToken") h.hooks[0].authToken = "masked-or-different";
    if (fault === "interrupted") h.hooks[0].interrupted = true;
    if (fault === "events") h.hooks[0].events = ["PAYMENT_RECEIVED"];
    if (fault === "duplicate") h.hooks.push({ ...h.hooks[0] });
    if (fault === "nonce") h.hooks[0].url = `https://example.com/api/pagamentos/asaas/webhook?binding=${otherWallet}`;
    if (fault === "pagination") h.controls.hasMore = true;
    await assert.rejects(h.service.prepareAsaasIntegration(input(2), "admin")); assert.equal(plaintext(h.rows.get("asaas")!), before);
    assert.equal(h.calls.requests.filter(call => call.body).length, 1);
  }
});
test("uncertain webhook registration retains claim and refuses a second POST on retry", async () => {
  const h = await harness(); h.controls.failPost = true;
  await assert.rejects(h.service.prepareAsaasIntegration(input(), "admin")); const before = plaintext(h.rows.get("asaas")!);
  h.controls.failPost = false; await assert.rejects(h.service.prepareAsaasIntegration(input(1), "admin"));
  assert.equal(plaintext(h.rows.get("asaas")!), before); assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("renewing production credential in the same wallet preserves active payment bindings and webhook", async () => {
  const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin");
  await h.service.activateAsaasIntegration({ revision: 2, enabled: true, methods: ["card"] }, "admin");
  const before = h.secrets(); h.controls.active = 2; h.controls.accessToken = "$aact_prod_synthetic-renewed";
  await h.service.prepareAsaasIntegration(input(3), "admin"); const after = h.secrets();
  assert.equal(after.accessToken, h.controls.accessToken); assert.equal(h.rows.get("asaas")!.enabled, true);
  for (const field of ["webhookSecret", "webhookId", "webhookUrl"] as const) assert.equal(after[field], before[field]);
  assert.deepEqual(after.methods, ["card"]); assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("concurrent initial preparations permit only one registration POST", async () => {
  const h = await harness(); const results = await Promise.allSettled([
    h.service.prepareAsaasIntegration(input(), "admin"), h.service.prepareAsaasIntegration(input(), "admin")]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("registration revision race does not overwrite a concurrently changed integration", async () => {
  const h = await harness(); h.controls.raceOnRegister = true;
  await assert.rejects(h.service.prepareAsaasIntegration(input(), "admin")); assert.equal(h.rows.get("asaas")!.revision, 2);
  assert.equal(h.secrets().webhookId, null); assert.equal(h.calls.writes.length, 1);
});
test("activation requires paid Sandbox evidence separately for card and Pix", async () => {
  for (const method of ["card", "pix"]) {
    const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin"); h.controls.cardProof = 0; h.controls.pixProof = 0;
    await assert.rejects(h.service.activateAsaasIntegration({ revision: 2, enabled: true, methods: [method] }, "admin"));
    assert.equal(h.rows.get("asaas")!.enabled, false); assert.equal(h.rows.get("asaas")!.revision, 2);
    const where = h.calls.proofs[0].where;
    assert.equal(where.provider, "asaas"); assert.equal(where.integrationId, "asaas-sandbox"); assert.equal(where.environment, "test");
    assert.equal(where.method, method); assert.equal(where.status, "PAID"); assert.equal((where.providerOrderId as { not: null }).not, null);
    if (method === "card") assert.equal(where.installments, 1);
  }
});
test("paid card proof cannot silently enable unproven Pix", async () => {
  const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin");
  await assert.rejects(h.service.activateAsaasIntegration({ revision: 2, enabled: true, methods: ["card", "pix"] }, "admin"));
  assert.equal(h.rows.get("asaas")!.enabled, false); assert.equal(h.rows.get("asaas")!.revision, 2);
});
test("activation requires registered webhook, approved matching wallet, methods and active Pix key", async () => {
  for (const fault of ["hook", "approval", "wallet", "methods", "pix-key"]) {
    const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin"); h.controls.pixProof = 1;
    if (fault === "hook") h.changeSecrets({ webhookId: null });
    if (fault === "approval") h.controls.approved = false;
    if (fault === "wallet") h.controls.wallet = otherWallet;
    if (fault === "pix-key") h.changeSecrets({ pixAddressKey: null });
    await assert.rejects(h.service.activateAsaasIntegration({ revision: 2, enabled: true, methods: fault === "methods" ? [] : ["pix"] }, "admin"));
    assert.equal(h.rows.get("asaas")!.revision, 2); assert.equal(h.rows.get("asaas")!.enabled, false);
  }
});
test("card-only activation records method and actor without enabling Pix", async () => {
  const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin");
  await h.service.activateAsaasIntegration({ revision: 2, enabled: true, methods: ["card"] }, "synthetic-admin");
  assert.equal(h.rows.get("asaas")!.enabled, true); assert.deepEqual(h.secrets().methods, ["card"]);
  assert.equal(h.calls.audits.at(-1)!.userId, "synthetic-admin"); assert.equal(h.calls.audits.at(-1)!.action, "ASAAS_PRODUCTION_ACTIVATION");
});
test("activation rejects stale revision and concurrent CAS failure without success audit", async () => {
  for (const fault of ["stale", "cas"]) {
    const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin"); h.controls.raceOnSave = fault === "cas";
    await assert.rejects(h.service.activateAsaasIntegration({ revision: fault === "stale" ? 1 : 2, enabled: true, methods: ["card"] }, "admin"));
    assert.equal(h.rows.get("asaas")!.enabled, false); assert.equal(h.calls.audits.some(audit => audit.action === "ASAAS_PRODUCTION_ACTIVATION"), false);
  }
});
test("deactivation remains possible when provider approval fails without another provider request", async () => {
  const h = await harness(); await h.service.prepareAsaasIntegration(input(), "admin");
  await h.service.activateAsaasIntegration({ revision: 2, enabled: true, methods: ["card"] }, "admin"); h.controls.approved = false;
  const requests = h.calls.requests.length;
  await h.service.activateAsaasIntegration({ revision: 3, enabled: false, methods: [] }, "admin");
  assert.equal(h.rows.get("asaas")!.enabled, false); assert.equal(h.calls.requests.length, requests);
});
