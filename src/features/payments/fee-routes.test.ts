import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/admin/pagamentos/taxas/route.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-fee-route", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
      ? "export const auth=async()=>globalThis.fixture.session;" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
async function harness(role: string | null = "ADMIN") {
  const calls = { reads: 0, writes: 0, network: 0, audit: 0 };
  const controls = { failRead: false };
  let row: unknown = null;
  const prisma = { paymentIntegration: {
    findUnique: async () => { calls.reads++; if (controls.failRead) throw new Error("private synthetic credential details"); return row; },
    create: async ({ data }: { data: object }) => { calls.writes++; row = { ...data, revision: 1 }; return row; },
  }, auditLog: { create: async () => { calls.audit++; } }, $executeRaw: async () => 1,
  $transaction: async (execute: (tx: unknown) => Promise<unknown>) => execute(prisma) };
  const loaded = { exports: {} as Record<"GET" | "PUT" | "POST", (request: Request) => Promise<Response>> };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(import.meta.url), URL, Request, Response, Buffer, console, AbortSignal,
    process: { env: { AUTH_URL: "https://example.com", SECRET_VAULT_KEY: "synthetic-route-vault" } },
    fixture: { prisma, session: role ? { user: { id: "synthetic-user", role } } : null },
    fetch: async () => { calls.network++; throw new Error("Real network is forbidden in fee route tests"); },
  });
  const request = (method: "GET" | "PUT" | "POST", body = "{}", origin: string | null = "https://example.com", contentType = "application/json") => {
    const headers: Record<string, string> = { "content-type": contentType };
    if (origin) headers.origin = origin;
    return loaded.exports[method](new Request("https://example.com/api/admin/pagamentos/taxas", {
      method, headers, ...(method === "GET" ? {} : { body }),
    }));
  };
  return { request, calls, controls };
}
const validSettings = JSON.stringify({ revision: 0, rules: [], environment: "production", zeroInterestInstallments: 3 });

test("maximum manual tariff capacity fits its dedicated body budget", async () => {
  const fixture = await harness();
  const checkedAt = new Date().toISOString();
  const validUntil = new Date(Date.now() + 86_400_000).toISOString();
  const rules = Array.from({ length: 45 }, (_, index) => ({ id: `manual-${index}`.padEnd(100, "x"),
    provider: "mercado-pago", currency: "BRL", method: "card", fixedCents: 1_000_000, percentageBps: 10_000,
    minInstallments: 1, maxInstallments: 12, zeroInterestInstallments: 12, settlementDays: 365,
    checkedAt, validUntil, source: "https://example.com/contract/".padEnd(2000, "a") }));
  const payload = JSON.stringify({ revision: 0, rules, environment: "production", zeroInterestInstallments: 3 });
  assert.ok(Buffer.byteLength(payload) > 16_000 && Buffer.byteLength(payload) < 128_000);
  assert.equal((await fixture.request("PUT", payload)).status, 200);
  assert.equal(fixture.calls.writes, 1);
  assert.equal(fixture.calls.network, 0);
});

test("fee routes reject anonymous, CUSTOMER, STAFF and MANAGER before DB or provider access", async () => {
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
    const fixture = await harness(role);
    for (const method of ["GET", "PUT", "POST"] as const) assert.equal((await fixture.request(method)).status, 401);
    assert.deepEqual(fixture.calls, { reads: 0, writes: 0, network: 0, audit: 0 });
  }
});

test("mutating fee routes require same-origin JSON and enforce the body limit before DB access", async () => {
  for (const method of ["PUT", "POST"] as const) {
    const fixture = await harness();
    assert.equal((await fixture.request(method, validSettings, null)).status, 403);
    assert.equal((await fixture.request(method, validSettings, "https://untrusted.example")).status, 403);
    assert.equal((await fixture.request(method, validSettings, "https://example.com", "text/plain")).status, 415);
    assert.equal((await fixture.request(method, "not JSON")).status, 400);
    assert.equal((await fixture.request(method, JSON.stringify({ padding: "x".repeat(method === "PUT" ? 128001 : 16001) }))).status, 413);
    assert.deepEqual(fixture.calls, { reads: 0, writes: 0, network: 0, audit: 0 });
  }
});

test("ADMIN can view and save the isolated fee settings with private no-store responses", async () => {
  const fixture = await harness();
  const initial = await fixture.request("GET");
  assert.equal(initial.status, 200);
  assert.equal(initial.headers.get("cache-control"), "private, no-store");
  const before = await initial.json();
  assert.equal(before.data.connected, false);
  assert.equal(before.data.chargesEnabled, false);
  assert.ok(!("apiKey" in before.data));
  const response = await fixture.request("PUT", validSettings);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(fixture.calls.writes, 1);
  assert.equal(fixture.calls.audit, 1);
  assert.equal(fixture.calls.network, 0);
});

test("invalid settings are rejected with 422 before any DB or provider calls", async () => {
  const fixture = await harness();
  const response = await fixture.request("PUT", JSON.stringify({ revision: 0, rules: [], environment: "production", zeroInterestInstallments: 99 }));
  assert.equal(response.status, 422);
  assert.deepEqual(fixture.calls, { reads: 0, writes: 0, network: 0, audit: 0 });
});

test("failed fee reads sanitize errors and never echo database or credential details", async () => {
  const fixture = await harness();
  fixture.controls.failRead = true;
  const response = await fixture.request("GET");
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.ok(!(await response.text()).includes("private synthetic credential details"));
  assert.equal(fixture.calls.network, 0);
});

test("ADMIN explicit refresh without an account returns 422 without network or writes", async () => {
  const fixture = await harness();
  const response = await fixture.request("POST");
  assert.equal(response.status, 422);
  assert.equal(fixture.calls.network, 0);
  assert.equal(fixture.calls.writes, 0);
});
