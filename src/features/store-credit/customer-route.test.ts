import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

async function harness(session: unknown, active = true, fail: "customer" | "credit" | null = null) {
  const calls: Array<{ customerId: string; sameTransaction: boolean }> = [];
  let customerQuery: unknown;
  let transactionOptions: unknown;
  let transactionCount = 0;
  const summary = { balanceCents: 1200, availableCents: 1000, reservedCents: 200, reviewRequired: false, transactions: [] };
  const transaction = { customer: { findFirst: async (query: unknown) => {
    customerQuery = query;
    if (fail === "customer") throw new Error("private database details: secret-credential");
    return active ? { id: "customer-A" } : null;
  } } };
  const result = await build({ entryPoints: ["src/app/api/minha-conta/creditos/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-store-credit", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|features\/store-credit\/service$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : "export const getCustomerStoreCredit=globalThis.fixture.credit;" }));
  } }] });
  const loaded = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, URLSearchParams, Request, Response, console, fixture: {
    auth: async () => session,
    prisma: { $transaction: async (callback: (tx: typeof transaction) => unknown, options: unknown) => {
      transactionCount += 1; transactionOptions = options; return callback(transaction);
    } },
    credit: async (tx: unknown, customerId: string) => {
      calls.push({ customerId, sameTransaction: tx === transaction });
      if (fail === "credit") throw new Error("private database details: secret-credential");
      return summary;
    },
  } });
  return {
    get: (query = "") => loaded.exports.GET(new Request(`https://example.com/api/minha-conta/creditos${query}`)),
    calls, summary, query: () => customerQuery, options: () => transactionOptions, transactionCount: () => transactionCount,
  };
}

function assertPrivate(response: Response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
}

test("store credit rejects anonymous, staff without customer link, and inactive customer", async () => {
  for (const session of [null, { user: { id: "staff", role: "STAFF" } }, { user: { id: "admin", role: "ADMIN" } }]) {
    const fixture = await harness(session);
    const response = await fixture.get();
    assert.equal(response.status, 401);
    assertPrivate(response);
    assert.equal(fixture.transactionCount(), 0);
    assert.equal(fixture.calls.length, 0);
  }
  const inactive = await harness({ user: { id: "customer-A", role: "CUSTOMER" } }, false);
  const response = await inactive.get();
  assert.equal(response.status, 401);
  assertPrivate(response);
  assert.equal(inactive.calls.length, 0);
});

test("store credit uses only session identity, active lookup and the same private transaction", async () => {
  for (const session of [
    { user: { id: "customer-A", role: "CUSTOMER" } },
    { user: { id: "admin", role: "ADMIN", customerId: "customer-A" } },
  ]) {
    const fixture = await harness(session);
    const response = await fixture.get("?customerId=customer-B&id=customer-B");
    assert.equal(response.status, 200);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { data: fixture.summary });
    assert.deepEqual(fixture.calls, [{ customerId: "customer-A", sameTransaction: true }]);
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.query())), { where: { id: "customer-A", status: "ACTIVE" }, select: { id: true } });
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.options())), { isolationLevel: "RepeatableRead" });
    assert.equal(fixture.transactionCount(), 1);
  }
});

test("store credit database errors return generic private 503 without secrets", async () => {
  for (const fail of ["customer", "credit"] as const) {
    const fixture = await harness({ user: { id: "customer-A", role: "CUSTOMER" } }, true, fail);
    const response = await fixture.get();
    assert.equal(response.status, 503);
    assertPrivate(response);
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), { error: "Não foi possível consultar seus créditos. Tente novamente." });
    assert.doesNotMatch(body, /private database details|secret-credential/);
  }
});
