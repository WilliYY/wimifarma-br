import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { build } from "esbuild";

const token = "$aact_hmlg_synthetic-sandbox-key";
const material = "synthetic-integration-vault";
const wallet = "131ca662-56c8-4479-b5b3-fd61a413fce7";
function encrypted(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(material).digest(), iv);
  return { ciphertext: Buffer.concat([cipher.update(value), cipher.final()]).toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
function plaintext(row: { ciphertext: string; iv: string; tag: string }) {
  const cipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(material).digest(), Buffer.from(row.iv, "base64"));
  cipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([cipher.update(Buffer.from(row.ciphertext, "base64")), cipher.final()]).toString();
}
const bundle = build({ entryPoints: ["src/features/payments/asaas-sandbox-integration.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "integration-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
type Row = { id: string; revision: number; environment: string; enabled: boolean; publicKey: string; accountId: string; ciphertext: string; iv: string; tag: string };
async function harness() {
  const rows = new Map<string, Row>();
  rows.set("mercado-pago", { id: "mercado-pago", revision: 17, environment: "production", enabled: true, publicKey: "mp", accountId: "merchant", ...encrypted("untouched MP") });
  rows.set("payment-fee-policy", { id: "payment-fee-policy", revision: 5, environment: "production", enabled: false, publicKey: "fees", accountId: "production", ...encrypted("untouched production Asaas") });
  const credentials = { id: "synthetic-credential", service: "Asaas", identifier: "sandbox", ...encrypted(token) };
  const calls = { reads: [] as string[], writes: [] as string[], counts: [] as unknown[], audit: [] as unknown[], requests: [] as { url: string; body?: Record<string, unknown> }[] };
  const controls = { active: 0, failPost: false, acceptUnknownPost: false, approved: true, wallet, activePix: true,
    ambiguousWallet: false, hasMoreHooks: false, beforeRequest: undefined as (() => Promise<void>) | undefined };
  const hooks: Record<string, unknown>[] = [];
  const env = { SECRET_VAULT_KEY: material, AUTH_URL: "https://wimifarma.com.br" };
  let transactionTail = Promise.resolve();
  const prisma = { secretCredential: { findUnique: async ({ where }: { where: { id: string } }) => where.id === credentials.id
    ? { id: credentials.id, service: credentials.service, identifier: credentials.identifier, secretCiphertext: credentials.ciphertext, secretIv: credentials.iv, secretTag: credentials.tag } : null },
  paymentIntegration: {
    findUnique: async ({ where }: { where: { id: string } }) => { calls.reads.push(where.id); return rows.get(where.id) ?? null; },
    create: async ({ data }: { data: Row }) => { calls.writes.push(data.id); rows.set(data.id, { ...data }); return rows.get(data.id); },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> & { revision: { increment: number } } }) => {
      calls.writes.push(where.id); const previous = rows.get(where.id)!;
      const next = { ...previous, ...data, revision: previous.revision + data.revision.increment }; rows.set(where.id, next); return next;
    },
  }, onlinePayment: { count: async (query: unknown) => { calls.counts.push(query); return controls.active; } }, auditLog: { create: async ({ data }: { data: unknown }) => calls.audit.push(data) },
  $executeRaw: async () => 1, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    const previous = transactionTail;
    let release!: () => void;
    transactionTail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await fn(prisma); } finally { release(); }
  } };
  const loaded = { exports: {} as { readAsaasSandboxIntegration: () => Promise<null | Row & { secrets: Record<string, unknown>; connection: { accessToken: string; environment: string } }>;
    prepareAsaasSandboxIntegration: (input: { credentialId: string; email: string; revision: number }, userId: string) => Promise<void> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Buffer, URL, Response, AbortSignal,
    process: { env }, fixture: { prisma },
    fetch: async (url: string, options: RequestInit) => {
      const body = options.body ? JSON.parse(String(options.body)) : undefined;
      calls.requests.push({ url, body });
      await controls.beforeRequest?.();
      if (url.endsWith("/myAccount/status/")) return Response.json({ general: controls.approved ? "APPROVED" : "PENDING" });
      if (url.endsWith("/wallets/")) return Response.json({ data: controls.ambiguousWallet ? [{ id: wallet }, { id: wallet }] : [{ id: controls.wallet }], hasMore: false });
      if (url.includes("/pix/addressKeys")) return Response.json({ data: controls.activePix ? [{ id: wallet, key: wallet, type: "EVP", status: "ACTIVE" }] : [], hasMore: false });
      if (url.includes("/webhooks") && !body) return Response.json({ data: hooks, hasMore: controls.hasMoreHooks });
      if (url.endsWith("/webhooks") && body) {
        const saved = rows.get("asaas-sandbox")!;
        assert.ok(saved, "Persist integration before POST");
        assert.equal(JSON.parse(plaintext(saved)).registrationAttempted, true, "Persist claim before POST");
        const hook = { ...body, id: wallet, hasAuthToken: true }; delete hook.authToken;
        if (!controls.failPost || controls.acceptUnknownPost) hooks.push(hook);
        if (controls.failPost) throw new Error(token);
        return Response.json(hook);
      }
      throw new Error("Unexpected real network is forbidden");
    },
  });
  return { service: loaded.exports, credentials, calls, rows, controls, hooks, env };
}
const input = (revision = 0) => ({ credentialId: "synthetic-credential", email: "responsavel@example.invalid", revision });
test("wrong credential, service, environment and production prefix stop before any request", async () => {
  for (const fault of ["id", "service", "identifier", "token"]) {
    const h = await harness();
    if (fault === "service") h.credentials.service = "Other";
    if (fault === "identifier") h.credentials.identifier = "production";
    if (fault === "token") Object.assign(h.credentials, encrypted("$aact_prod_synthetic"));
    await assert.rejects(h.service.prepareAsaasSandboxIntegration({ ...input(), credentialId: fault === "id" ? "arbitrary" : "synthetic-credential" }, "admin"));
    assert.equal(h.calls.requests.length, 0); assert.equal(h.calls.writes.length, 0);
  }
});
test("incompatible or ambiguous metadata never resets a known webhook or registers another one", async () => {
  for (const fault of ["hasAuthToken", "maskedToken", "enabled", "interrupted", "apiVersion", "events", "sendType", "url", "duplicates", "hasMore"]) {
    const h = await harness(); await h.service.prepareAsaasSandboxIntegration(input(), "admin");
    const before = JSON.stringify(h.rows.get("asaas-sandbox"));
    if (fault === "hasAuthToken") h.hooks[0].hasAuthToken = false;
    if (fault === "maskedToken") h.hooks[0].authToken = "********";
    if (fault === "enabled") h.hooks[0].enabled = false;
    if (fault === "interrupted") h.hooks[0].interrupted = true;
    if (fault === "apiVersion") h.hooks[0].apiVersion = 2;
    if (fault === "events") h.hooks[0].events = ["PAYMENT_RECEIVED"];
    if (fault === "sendType") h.hooks[0].sendType = "UNKNOWN_MODE";
    if (fault === "url") h.hooks[0].url = `https://wimifarma.com.br/api/pagamentos/asaas/sandbox/webhook?binding=${wallet}`;
    if (fault === "duplicates") h.hooks.push({ ...h.hooks[0] });
    if (fault === "hasMore") h.controls.hasMoreHooks = true;
    await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(2), "admin"));
    assert.equal(JSON.stringify(h.rows.get("asaas-sandbox")), before);
    assert.equal(h.calls.requests.filter(call => call.body).length, 1);
  }
});
test("credential or wallet rotation is blocked under the transaction lock while payments are linked", async () => {
  for (const fault of ["token", "wallet", "credential"]) {
    const h = await harness(); await h.service.prepareAsaasSandboxIntegration(input(), "admin");
    h.controls.active = 1;
    const before = JSON.stringify(h.rows.get("asaas-sandbox"));
    if (fault === "token") Object.assign(h.credentials, encrypted("$aact_hmlg_other-synthetic-key"));
    if (fault === "wallet") h.controls.wallet = "231ca662-56c8-4479-b5b3-fd61a413fce7";
    if (fault === "credential") h.credentials.id = "different-credential";
    await assert.rejects(h.service.prepareAsaasSandboxIntegration({ ...input(2), credentialId: h.credentials.id }, "admin"),
      (error: Error & { status?: number }) => error.status === 409);
    assert.equal(JSON.stringify(h.rows.get("asaas-sandbox")), before);
    assert.equal(h.calls.requests.filter(call => call.body).length, 1);
    const query = h.calls.counts[0] as { where: { provider: string; integrationId: string; status: { in: string[] } } };
    assert.equal(query.where.provider, "asaas"); assert.equal(query.where.integrationId, "asaas-sandbox");
    assert.deepEqual(Array.from(query.where.status.in), ["NEW", "SUBMITTING", "UNKNOWN", "PENDING", "REVIEW", "PAID", "PARTIALLY_REFUNDED"]);
  }
});
test("incorrect persisted environment or untrusted webhook URL fails closed without network", async () => {
  for (const fault of ["environment", "enabled", "url", "ciphertext"]) {
    const h = await harness(); await h.service.prepareAsaasSandboxIntegration(input(), "admin");
    const row = h.rows.get("asaas-sandbox")!;
    if (fault === "environment") row.environment = "production";
    if (fault === "enabled") row.enabled = true;
    if (fault === "ciphertext") row.tag = Buffer.alloc(16).toString("base64");
    if (fault === "url") Object.assign(row, encrypted(JSON.stringify({ ...JSON.parse(plaintext(row)), webhookUrl: "https://evil.example/webhook" })));
    const calls = h.calls.requests.length;
    await assert.rejects(h.service.readAsaasSandboxIntegration());
    assert.equal(h.calls.requests.length, calls);
  }
});
test("preparation stores only disabled Sandbox, correct wallet and actual encrypted secrets before POST", async () => {
  const h = await harness();
  const previous = JSON.stringify([...h.rows]);
  await h.service.prepareAsaasSandboxIntegration(input(), "synthetic-admin");
  const row = h.rows.get("asaas-sandbox")!;
  assert.equal(row.environment, "test"); assert.equal(row.enabled, false); assert.equal(row.publicKey, "");
  assert.equal(row.accountId, wallet); assert.equal(row.revision, 2);
  const secrets = JSON.parse(plaintext(row));
  assert.equal(secrets.accessToken, token); assert.equal(secrets.pixAddressKey, wallet);
  assert.equal(secrets.webhookSecret.length, 64); assert.equal(secrets.webhookId, wallet);
  assert.equal(secrets.registrationAttempted, true);
  assert.match(secrets.webhookUrl, /^https:\/\/wimifarma.com.br\/api\/pagamentos\/asaas\/sandbox\/webhook\?binding=[a-f0-9-]{36}$/);
  assert.equal(JSON.stringify([...h.rows].filter(([id]) => id !== "asaas-sandbox")), previous);
  assert.ok(h.calls.writes.every(id => id === "asaas-sandbox"));
  assert.ok(!JSON.stringify(h.calls.audit).includes(token));
  assert.ok(!JSON.stringify(h.calls.audit).includes(secrets.webhookSecret));
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
  assert.ok(h.calls.requests.every(call => call.url.startsWith("https://api-sandbox.asaas.com/v3/")));
});
test("a failed uncertain POST retains URL, secret and claim and never attempts another POST", async () => {
  const h = await harness(); h.controls.failPost = true;
  await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(), "admin"), (error: Error) => !error.message.includes(token));
  const retained = plaintext(h.rows.get("asaas-sandbox")!);
  await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(1), "admin"));
  assert.equal(plaintext(h.rows.get("asaas-sandbox")!), retained);
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("renewing credentials in the same wallet preserves the webhook and uses only GET without linked payments", async () => {
  const h = await harness();
  await h.service.prepareAsaasSandboxIntegration(input(), "admin");
  const before = JSON.parse(plaintext(h.rows.get("asaas-sandbox")!));
  const requestCount = h.calls.requests.length;
  const nextToken = "$aact_hmlg_synthetic-renewed-key";
  h.credentials.id = "renewed-credential";
  Object.assign(h.credentials, encrypted(nextToken));
  await h.service.prepareAsaasSandboxIntegration({ ...input(2), credentialId: h.credentials.id }, "admin");
  const after = JSON.parse(plaintext(h.rows.get("asaas-sandbox")!));
  assert.equal(after.accessToken, nextToken);
  assert.equal(after.credentialId, "renewed-credential");
  for (const field of ["webhookId", "webhookUrl", "webhookSecret", "registrationAttempted"]) assert.equal(after[field], before[field]);
  assert.equal(h.rows.get("asaas-sandbox")!.revision, 3);
  assert.ok(h.calls.requests.slice(requestCount).every(call => !call.body));
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("renewal while webhook registration is uncertain preserves the original claim and credentials", async () => {
  const h = await harness(); h.controls.failPost = true; h.controls.acceptUnknownPost = true;
  await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(), "admin"));
  const before = JSON.stringify(h.rows.get("asaas-sandbox"));
  Object.assign(h.credentials, encrypted("$aact_hmlg_synthetic-renewed-key"));
  await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(1), "admin"));
  assert.equal(JSON.stringify(h.rows.get("asaas-sandbox")), before);
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("uncertain accepted POST is recovered by compatible GET metadata without returning or changing the token", async () => {
  const h = await harness(); h.controls.failPost = true; h.controls.acceptUnknownPost = true;
  await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(), "admin"));
  const before = JSON.parse(plaintext(h.rows.get("asaas-sandbox")!));
  assert.ok(!("authToken" in h.hooks[0]));
  await h.service.prepareAsaasSandboxIntegration(input(1), "admin");
  const after = JSON.parse(plaintext(h.rows.get("asaas-sandbox")!));
  assert.equal(after.webhookSecret, before.webhookSecret); assert.equal(after.webhookUrl, before.webhookUrl);
  assert.equal(after.webhookId, wallet);
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("stale revision and concurrent prepares cannot overwrite configuration or send a second POST", async () => {
  const h = await harness();
  await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(99), "admin"));
  assert.equal(h.calls.requests.length, 0);
  const results = await Promise.allSettled([h.service.prepareAsaasSandboxIntegration(input(), "admin"), h.service.prepareAsaasSandboxIntegration(input(), "admin")]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(h.calls.requests.filter(call => call.body).length, 1);
});
test("missing approval, ambiguous wallet, inactive EVP and insecure site origin never persist or POST", async () => {
  for (const failure of ["approval", "wallet", "pix", "origin", "userinfo"]) {
    const h = await harness();
    if (failure === "approval") h.controls.approved = false;
    if (failure === "wallet") h.controls.ambiguousWallet = true;
    if (failure === "pix") h.controls.activePix = false;
    if (failure === "origin") h.env.AUTH_URL = "http://wimifarma.com.br";
    if (failure === "userinfo") h.env.AUTH_URL = "https://private:secret@wimifarma.com.br";
    await assert.rejects(h.service.prepareAsaasSandboxIntegration(input(), "admin"));
    assert.equal(h.calls.writes.length, 0); assert.equal(h.calls.requests.filter(call => call.body).length, 0);
  }
});
test("Sandbox integration read is server-only, uses real AES and never reads production integrations", async () => {
  const h = await harness();
  assert.equal(await h.service.readAsaasSandboxIntegration(), null);
  const secrets = { accessToken: token, webhookSecret: "a".repeat(64), pixAddressKey: wallet, webhookId: null,
    credentialId: "synthetic-credential", registrationAttempted: true,
    webhookUrl: `https://wimifarma.com.br/api/pagamentos/asaas/sandbox/webhook?binding=${wallet}` };
  h.rows.set("asaas-sandbox", { id: "asaas-sandbox", revision: 1, environment: "test", enabled: false, publicKey: "", accountId: wallet, ...encrypted(JSON.stringify(secrets)) });
  const read = await h.service.readAsaasSandboxIntegration();
  assert.equal(read!.secrets.accessToken, token);
  assert.equal(read!.connection.environment, "test");
  assert.ok(!h.rows.get("asaas-sandbox")!.ciphertext.includes(token));
  assert.ok(h.calls.reads.every(id => id === "asaas-sandbox"));
  assert.equal(h.calls.requests.length, 0);
});
