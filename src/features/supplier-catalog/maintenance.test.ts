import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

// No database, gateway, customer data or timers. Rows are synthetic in-memory state.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
const now = new Date("2026-10-17T18:00:00.000Z");
const cutoff = new Date(now.getTime() - 86_400_000);
const bundle = build({ entryPoints: ["src/features/supplier-catalog/maintenance.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "supplier-maintenance-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|cashback\/redemption$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>fixture.prisma;" : "export const settleOrderBenefits=fixture.settle;" }));
  } }] });

function matches(row: Data, where: Data): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object") {
      if ("lt" in value) return row[key] < value.lt;
      if ("not" in value) return row[key] !== value.not;
      if ("some" in value) return row[key].some((item: Data) => matches(item, value.some));
      if ("is" in value) return row[key] !== null && matches(row[key], value.is);
      return matches(row[key], value);
    }
    return row[key] === value;
  });
}

async function harness() {
  const rows: Data[] = [];
  const calls = { events: [] as string[], settled: [] as string[], updated: [] as string[], audits: [] as string[],
    cashbackUpdates: [] as Data[], cashbackAudits: [] as Data[] };
  let afterLock: ((row: Data) => void) | undefined;
  const tx = {
    $queryRaw: async (_query: unknown, id: string) => { calls.events.push(`lock:${id}`); const row = rows.find(row => row.id === id); if (row) afterLock?.(row); return []; },
    order: {
      findUnique: async ({ where }: Data) => { calls.events.push(`read:${where.id}`); return rows.find(row => row.id === where.id) ?? null; },
      findUniqueOrThrow: async ({ where }: Data) => {
        const row = rows.find(row => row.id === where.id);
        assert.ok(row, "cashback reads an existing synthetic order");
        return { ...row };
      },
      update: async ({ where, data }: Data) => {
        if (data.cashbackState) calls.cashbackUpdates.push({ id: where.id, ...data });
        else { calls.events.push(`update:${where.id}`); calls.updated.push(where.id); }
        Object.assign(rows.find(row => row.id === where.id)!, data);
        return {};
      },
    },
    auditLog: { create: async ({ data }: Data) => {
      if (data.action.startsWith("CASHBACK_")) calls.cashbackAudits.push(data);
      else calls.audits.push(data.entityId);
      return {};
    } },
  };
  const fixture = { prisma: {
    order: { findMany: async ({ where, take }: Data) => rows.filter(row => matches(row, where)).slice(0, take).map(row => ({ id: row.id })) },
    $transaction: async (callback: (db: typeof tx) => unknown) => callback(tx),
  }, settle: async (receivedTx: unknown, id: string) => { assert.equal(receivedTx, tx); calls.settled.push(id); calls.events.push(`settle:${id}`); } };
  const loaded = { exports: {} as { expireSupplierOrders(db: unknown, at: Date): Promise<void> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(import.meta.url), fixture, Date, console });
  return { rows, calls, afterLock: (callback: (row: Data) => void) => { afterLock = callback; },
    run: () => loaded.exports.expireSupplierOrders(fixture.prisma, now),
    add: (id: string, extra: Data = {}) => rows.push({ id, number: `synthetic-${id}`, customerId: "synthetic-customer",
      cashbackEarnedCents: 200, cashbackState: "PENDING", status: "PENDING", paymentStatus: "PENDING", paymentMethod: "PIX",
      createdAt: new Date(cutoff.getTime() - 1), items: [{ inventorySource: "DISTRIBUTOR", supplierReservation: { status: "ACTIVE" } }], ...extra }),
  };
}

test("supplier maintenance expires only unconfirmed unpaid manual reservations older than 24 hours", async () => {
  const f = await harness();
  f.add("old-manual");
  for (const status of ["CONFIRMED", "PREPARING", "COMPLETED", "CANCELED"]) f.add(status, { status });
  for (const paymentStatus of ["PAID", "REVIEW", "CANCELED"]) f.add(paymentStatus, { paymentStatus });
  f.add("online", { paymentMethod: "ONLINE" });
  f.add("recent", { createdAt: now });
  f.add("exactly-24-hours", { createdAt: cutoff });
  f.add("pharmacy", { items: [{ inventorySource: "PHARMACY", supplierReservation: { status: "ACTIVE" } }] });
  f.add("released", { items: [{ inventorySource: "DISTRIBUTOR", supplierReservation: { status: "RELEASED" } }] });
  await f.run();
  assert.deepEqual(f.calls.updated, ["old-manual"]);
  assert.deepEqual(f.calls.settled, ["old-manual"]);
  assert.deepEqual(f.calls.audits, ["old-manual"]);
  assert.equal(f.rows[0].status, "CANCELED");
  assert.equal(f.rows[0].paymentStatus, "CANCELED");
  assert.equal(f.rows[0].cashbackState, "VOIDED");
  assert.equal(f.calls.cashbackUpdates.length, 1);
  assert.deepEqual(f.calls.events, ["lock:old-manual", "read:old-manual", "update:old-manual", "settle:old-manual"]);
});

test("supplier maintenance rereads after lock and preserves newly confirmed, paid, online or recent orders", async () => {
  for (const patch of [{ status: "CONFIRMED" }, { paymentStatus: "PAID" }, { paymentStatus: "REVIEW" },
    { paymentMethod: "ONLINE" }, { createdAt: cutoff }]) {
    const f = await harness();
    f.add("changed-after-selection");
    f.afterLock(row => Object.assign(row, patch));
    await f.run();
    assert.deepEqual(f.calls.events, ["lock:changed-after-selection", "read:changed-after-selection"]);
    assert.equal(f.calls.updated.length, 0);
    assert.equal(f.calls.settled.length, 0);
    assert.equal(f.calls.audits.length, 0);
    assert.equal(f.calls.cashbackUpdates.length, 0);
  }
});

test("supplier maintenance settles benefits once per updated order and repeated runs do not settle again", async () => {
  const f = await harness();
  f.add("first"); f.add("second");
  await f.run();
  await f.run();
  assert.deepEqual(f.calls.updated, ["first", "second"]);
  assert.deepEqual(f.calls.settled, ["first", "second"]);
  assert.deepEqual(f.calls.audits, ["first", "second"]);
  assert.deepEqual(f.calls.cashbackUpdates, [{ id: "first", cashbackState: "VOIDED" }, { id: "second", cashbackState: "VOIDED" }]);
  assert.equal(f.calls.cashbackAudits.length, 2);
  for (const audit of f.calls.cashbackAudits) {
    assert.equal(audit.action, "CASHBACK_VOIDED");
    assert.equal(audit.metadata.from, "PENDING");
    assert.equal(audit.metadata.to, "VOIDED");
    assert.equal(audit.metadata.amountCents, 200);
  }
  assert.equal(f.rows.filter(row => row.cashbackState === "PENDING").length, 0);
});
