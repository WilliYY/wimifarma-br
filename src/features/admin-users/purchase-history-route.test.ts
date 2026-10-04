import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { Prisma } from "@/generated/prisma/client";

type Query = { sql: string; values: unknown[] };
type OrderQuery = {
  where: { customerId: string; NOT: { onlinePayment: { is: { environment: string } } }; createdAt?: { gte: Date; lt: Date } };
  orderBy?: { createdAt?: string; id?: string }[];
  take?: number;
  skip?: number;
};
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
const route = "src/app/api/admin/pessoas/[id]/compras/route.ts";
const sources = new Map<string, Promise<string>>();

function source(path: string) {
  if (!sources.has(path)) sources.set(path, build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{
    name: "isolated-purchase-history",
    setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|generated\/prisma\/client$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : "export const Prisma=globalThis.fixture.Prisma;" }));
    },
  }] }).then(result => result.outputFiles[0].text));
  return sources.get(path)!;
}

async function harness(role: string | null = "ADMIN", options: { missing?: boolean; fail?: boolean } = {}) {
  let reads = 0;
  let writes = 0;
  const orders: OrderQuery[] = [];
  const counts: OrderQuery[] = [];
  const sql: Query[] = [];
  const transactionOptions: unknown[] = [];
  const start = new Date("2026-10-01T03:00:00.000Z");
  const end = new Date("2026-11-01T03:00:00.000Z");
  const sample = { id: "synthetic-order", number: "WBR-TEST", totalCents: 1000, items: [{ productName: "Produto fictício", quantity: 1, totalCents: 1000 }] };
  const mutations = Object.fromEntries(["create", "createMany", "update", "updateMany", "delete", "deleteMany", "upsert"].map(method => [method, () => { writes++; throw new Error("Unexpected write"); }]));
  const tx = {
    customer: { ...mutations, findUnique: async () => { reads++; if (options.fail) throw new Error("private database password and details"); return options.missing ? null : { id: "synthetic-customer", name: "Cliente fictício" }; } },
    order: { ...mutations, findMany: async (query: OrderQuery) => { reads++; orders.push(query); return [sample]; }, count: async (query: OrderQuery) => { reads++; counts.push(query); return 41; } },
    $queryRaw: async (query: Query) => { reads++; sql.push(query); return [{ start, end }]; },
    $executeRaw: async () => { writes++; throw new Error("Unexpected SQL write"); },
  };
  const loaded = { exports: {} as Record<string, Handler> };
  vm.runInNewContext(await source(route), {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, Date,
    fixture: { Prisma, auth: async () => role ? { user: { id: "synthetic-admin", role } } : null,
      prisma: { $transaction: async (callback: (db: typeof tx) => unknown, settings: unknown) => { transactionOptions.push(settings); return callback(tx); } } },
  });
  return {
    run: (query = "", id = "synthetic-customer") => loaded.exports.GET(new Request(`https://example.com/api/admin/pessoas/${id}/compras${query}`), { params: Promise.resolve({ id }) }),
    reads: () => reads, writes: () => writes, orders, counts, sql, transactionOptions, start, end, sample,
  };
}

test("purchase history authorizes only ADMIN before database access or input validation", async () => {
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
    const fixture = await harness(role);
    assert.equal((await fixture.run("?month=invalid", "invalid/id")).status, 401);
    assert.equal(fixture.reads(), 0);
    assert.equal(fixture.transactionOptions.length, 0);
    assert.equal(fixture.writes(), 0);
  }
});

test("purchase history rejects invalid months, pages and customer IDs before querying", async () => {
  for (const query of ["?month=2026-00", "?month=2026-13", "?month=2026-1", "?month=2026-10-01", "?month=invalid", "?page=0", "?page=-1", "?page=1.5", "?page=10001", "?page=NaN"]) {
    const fixture = await harness();
    const response = await fixture.run(query);
    assert.equal(response.status, 422, query);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(fixture.reads(), 0);
  }
  for (const id of ["invalid/id", "", "a".repeat(101)]) {
    const fixture = await harness();
    assert.equal((await fixture.run("", id)).status, 422);
    assert.equal(fixture.reads(), 0);
  }
});

test("purchase history returns private 404 for absent customer without reading orders", async () => {
  const fixture = await harness("ADMIN", { missing: true });
  const response = await fixture.run();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(fixture.reads(), 1);
  assert.equal(fixture.orders.length, 0);
  assert.equal(fixture.writes(), 0);
});

test("purchase history hides database failures behind private 503", async () => {
  const fixture = await harness("ADMIN", { fail: true });
  const response = await fixture.run();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.text();
  assert.doesNotMatch(body, /private database|password|details/);
  assert.match(body, /Não foi possível consultar o histórico/);
  assert.equal(fixture.writes(), 0);
});

test("purchase history bounds pages to 20, orders deterministically and excludes gateway tests", async () => {
  const fixture = await harness();
  const response = await fixture.run("?page=3");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.page, 3);
  assert.equal(body.pageSize, 20);
  assert.equal(body.total, 41);
  assert.deepEqual(body.orders, [fixture.sample]);
  const query = fixture.orders[0];
  assert.equal(query.take, 20);
  assert.equal(query.skip, 40);
  assert.equal(JSON.stringify(query.orderBy), JSON.stringify([{ createdAt: "desc" }, { id: "desc" }]));
  assert.equal(query.where.customerId, "synthetic-customer");
  assert.equal(query.where.NOT.onlinePayment.is.environment, "test");
  assert.equal(JSON.stringify(fixture.counts[0].where), JSON.stringify(query.where));
  assert.equal(query.where.createdAt, undefined);
  assert.equal(fixture.sql.length, 0);
  assert.equal(JSON.stringify(fixture.transactionOptions[0]), JSON.stringify({ isolationLevel: "RepeatableRead" }));
  assert.equal(fixture.writes(), 0);
});

test("purchase history passes parameterized business month and half-open bounds to both queries", async () => {
  const fixture = await harness();
  assert.equal((await fixture.run("?month=2026-10&page=10000")).status, 200);
  assert.equal(fixture.sql.length, 1);
  assert.match(fixture.sql[0].sql, /America\/Sao_Paulo/);
  assert.match(fixture.sql[0].sql, /AT TIME ZONE 'UTC'/);
  assert.deepEqual(fixture.sql[0].values, ["2026-10-01", "2026-11-01"]);
  assert.equal(fixture.orders[0].where.createdAt?.gte, fixture.start);
  assert.equal(fixture.orders[0].where.createdAt?.lt, fixture.end);
  assert.equal(fixture.orders[0].skip, 199980);
  assert.equal(JSON.stringify(fixture.counts[0].where), JSON.stringify(fixture.orders[0].where));
  assert.equal(fixture.writes(), 0);
});

test("directory ranking counts only completed paid purchases, excluding test gateway payments", async () => {
  const queries: Query[] = [];
  const tx = { $queryRaw: async (query: Query) => {
    queries.push(query);
    if (queries.length === 1) return [];
    if (queries.length === 2) return [{ total: 0 }];
    return [{ total: 0, admins: 0, staff: 0, customers: 0, buyers: 0 }];
  } };
  type DirectoryHandler = (db: typeof tx, query: { q: string; role: string; status: string; sort: string; page: number; month: string }) => Promise<unknown>;
  const loaded = { exports: {} as Record<string, DirectoryHandler> };
  vm.runInNewContext(await source("src/features/admin-users/directory.ts"), { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Date, fixture: { Prisma } });
  await loaded.exports.getDirectory(tx, { q: "synthetic%query", role: "ALL", status: "ALL", sort: "spent", page: 2, month: "2026-10" });
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.match(query.sql, /"status" = 'COMPLETED' AND "paymentStatus" = 'PAID'/);
    assert.match(query.sql, /NOT EXISTS[\s\S]*"OnlinePayment"[\s\S]*environment = 'test'/);
    assert.match(query.sql, /"customerId" IS NOT NULL/);
    assert.match(query.sql, /America\/Sao_Paulo/);
    assert.ok(query.values.includes("2026-10-01"));
    assert.ok(query.values.includes("2026-11-01"));
    assert.doesNotMatch(query.sql, /\b(INSERT|UPDATE|DELETE|ALTER|DROP)\b/i);
    assert.doesNotMatch(query.sql, /synthetic%query/);
  }
  assert.match(queries[0].sql, /ORDER BY "spentCents" DESC, "orderCount" DESC, id LIMIT 20 OFFSET/);
  assert.equal(queries[0].values.at(-1), 20);
});
