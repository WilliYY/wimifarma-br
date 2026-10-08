import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { build } from "esbuild";

const sandboxKey = "$aact_hmlg_synthetic-not-a-real-credential";
const vaultMaterial = "synthetic-sandbox-vault";
function encrypt(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(vaultMaterial).digest(), iv);
  return { secretCiphertext: Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]).toString("base64"),
    secretIv: iv.toString("base64"), secretTag: cipher.getAuthTag().toString("base64") };
}
const bundle = build({ entryPoints: ["src/app/api/admin/pagamentos/asaas-sandbox/route.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-sandbox", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
      ? "export const auth=async()=>globalThis.fixture.session;" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
async function harness(role: string | null = "ADMIN") {
  const row = { id: "synthetic-id", title: "Asaas Sandbox", service: "Asaas", identifier: "sandbox",
    updatedAt: new Date("2026-10-08T12:00:00Z"), ...encrypt(sandboxKey) };
  const calls = { reads: 0, requests: [] as { url: string; options: RequestInit }[], audit: [] as unknown[] };
  const controls = { failNetwork: false, failDatabase: false, responseStatus: 200, failAudit: false };
  const prisma = { secretCredential: {
    findMany: async ({ where, select }: { where: unknown; select: Record<string, boolean> }) => {
      calls.reads++;
      assert.deepEqual(JSON.parse(JSON.stringify(where)), { service: { equals: "Asaas", mode: "insensitive" }, identifier: { equals: "sandbox", mode: "insensitive" } });
      return [Object.fromEntries(Object.entries(row).filter(([key]) => select[key]))];
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      calls.reads++;
      if (controls.failDatabase) throw new Error(sandboxKey);
      return where.id === row.id ? row : null;
    },
  }, auditLog: { create: async ({ data }: { data: unknown }) => {
    if (controls.failAudit) throw new Error(sandboxKey);
    calls.audit.push(data);
  } } };
  const loaded = { exports: {} as Record<"GET" | "POST", (request: Request) => Promise<Response>> };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(import.meta.url), URL, Request, Response, Buffer, console, AbortSignal,
    process: { env: { AUTH_URL: "https://example.com", SECRET_VAULT_KEY: vaultMaterial } },
    fixture: { prisma, session: role ? { user: { id: "synthetic-admin", role } } : null },
    fetch: async (url: string, options: RequestInit) => {
      calls.requests.push({ url, options });
      if (controls.failNetwork) throw new Error(sandboxKey);
      return new Response(JSON.stringify(controls.responseStatus === 200 ? { payment: { creditCard: {
        operationValue: 0.49, oneInstallmentPercentage: 2.99, upToSixInstallmentsPercentage: 3.49,
        upToTwelveInstallmentsPercentage: 3.99, daysToReceive: 32 } }, account: sandboxKey } : { error: sandboxKey }), { status: controls.responseStatus });
    },
  });
  const request = (method: "GET" | "POST", body = JSON.stringify({ credentialId: row.id }),
    origin: string | null = "https://example.com", contentType = "application/json") => {
    const headers: Record<string, string> = { "content-type": contentType };
    if (origin) headers.origin = origin;
    return loaded.exports[method](new Request("https://example.com/api/admin/pagamentos/asaas-sandbox", {
      method, headers, ...(method === "GET" ? {} : { body }),
    }));
  };
  return { row, request, calls, controls };
}

test("Sandbox routes deny anonymous, CUSTOMER and collaborators before vault or network access", async () => {
  for (const role of [null, "CUSTOMER", "MANAGER", "STAFF"]) {
    const fixture = await harness(role);
    for (const method of ["GET", "POST"] as const) assert.equal((await fixture.request(method)).status, 401);
    assert.equal(fixture.calls.reads, 0);
    assert.equal(fixture.calls.requests.length, 0);
  }
});
test("Sandbox credential list exposes only explicit ID, title and update time", async () => {
  const fixture = await harness();
  const response = await fixture.request("GET");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { data: [{ id: fixture.row.id, title: fixture.row.title, updatedAt: fixture.row.updatedAt.toISOString() }] });
  assert.equal(fixture.calls.requests.length, 0);
});
test("Sandbox check enforces origin, JSON, strict input and bounded body before vault access", async () => {
  for (const [body, origin, contentType, status] of [
    ["{}", null, "application/json", 403], ["{}", "https://untrusted.example", "application/json", 403],
    ["{}", "https://example.com", "text/plain", 415], ["broken", "https://example.com", "application/json", 400],
    [JSON.stringify({ credentialId: "x".repeat(2049) }), "https://example.com", "application/json", 413],
    [JSON.stringify({ credentialId: "synthetic-id", environment: "production" }), "https://example.com", "application/json", 422],
  ] as const) {
    const fixture = await harness();
    assert.equal((await fixture.request("POST", body, origin, contentType)).status, status);
    assert.equal(fixture.calls.reads, 0);
    assert.equal(fixture.calls.requests.length, 0);
  }
});
test("arbitrary ID, production metadata, wrong service and production keys never reach the provider", async () => {
  for (const mutation of ["id", "identifier", "service", "key", "legacy-key", "whitespace"] as const) {
    const fixture = await harness();
    if (mutation === "identifier") fixture.row.identifier = "production";
    if (mutation === "service") fixture.row.service = "Other";
    if (mutation === "key") Object.assign(fixture.row, encrypt("$aact_prod_synthetic-production"));
    if (mutation === "legacy-key") Object.assign(fixture.row, encrypt("synthetic-unclassified-key"));
    if (mutation === "whitespace") Object.assign(fixture.row, encrypt(`${sandboxKey}\n`));
    const response = await fixture.request("POST", JSON.stringify({ credentialId: mutation === "id" ? "arbitrary-id" : fixture.row.id }));
    assert.equal(response.status, 422);
    assert.equal(fixture.calls.requests.length, 0);
    assert.equal(fixture.calls.audit.length, 0);
  }
});
test("tampered vault ciphertext fails without provider access or credential disclosure", async () => {
  const fixture = await harness();
  fixture.row.secretTag = Buffer.alloc(16).toString("base64");
  const response = await fixture.request("POST");
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes(sandboxKey));
  assert.equal(fixture.calls.requests.length, 0);
  assert.equal(fixture.calls.audit.length, 0);
});
test("Sandbox check uses real vault decryption and fixed read-only host; output and audit contain no secrets", async () => {
  const fixture = await harness();
  const response = await fixture.request("POST");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload.data).sort(), ["checkedAt", "feeRuleCount", "validated"]);
  assert.equal(payload.data.validated, true);
  assert.equal(payload.data.feeRuleCount, 3);
  assert.ok(Number.isFinite(Date.parse(payload.data.checkedAt)));
  assert.equal(fixture.calls.requests.length, 1);
  const { url, options } = fixture.calls.requests[0];
  assert.equal(url, "https://api-sandbox.asaas.com/v3/myAccount/fees/");
  assert.equal(options.method ?? "GET", "GET");
  assert.equal(options.redirect, "error");
  assert.equal(options.cache, "no-store");
  assert.equal((options.headers as Record<string, string>).access_token, sandboxKey);
  assert.equal(fixture.calls.audit.length, 1);
  const audit = fixture.calls.audit[0] as { entityId: string; userId: string };
  assert.equal(audit.entityId, fixture.row.id);
  assert.equal(audit.userId, "synthetic-admin");
  assert.ok(!JSON.stringify([payload, fixture.calls.audit]).includes(sandboxKey));
});
test("provider, database and audit failures never echo secrets or claim successful validation", async () => {
  for (const failure of ["failNetwork", "failDatabase", "failAudit", "responseStatus"] as const) {
    const fixture = await harness();
    if (failure === "responseStatus") fixture.controls.responseStatus = 401;
    else fixture.controls[failure] = true;
    const response = await fixture.request("POST");
    assert.ok(response.status >= 500);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const text = await response.text();
    assert.ok(!text.includes(sandboxKey));
    assert.ok(!text.includes('"validated":true'));
  }
});
test("Sandbox checks are rate limited before further provider access", async () => {
  const fixture = await harness();
  for (let index = 0; index < 5; index++) assert.equal((await fixture.request("POST")).status, 200);
  assert.equal((await fixture.request("POST")).status, 429);
  assert.equal(fixture.calls.requests.length, 5);
});
