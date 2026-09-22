import assert from "node:assert/strict";
import test from "node:test";
import { productPurgeDate } from "./trash-policy";
import { moveProductToTrash, restoreTrashedProduct, purgeExpiredProducts } from "./trash-service";

test("retention is two calendar months, clamped at month end, without mutating input", () => {
  for (const [start, end] of [["2026-12-31T15:40:00.000Z", "2027-02-28T15:40:00.000Z"], ["2023-12-31T15:40:00.000Z", "2024-02-29T15:40:00.000Z"], ["2026-07-31T15:40:00.000Z", "2026-09-30T15:40:00.000Z"], ["2026-09-22T15:40:00.000Z", "2026-11-22T15:40:00.000Z"]]) {
    const date = new Date(start);
    assert.equal(productPurgeDate(date).toISOString(), end);
    assert.equal(date.toISOString(), start);
  }
});

function fixture(count = 1) {
  const calls: Array<{ method: string; args: unknown }> = [];
  const fn = (method: string, result: unknown) => async (args: unknown) => { calls.push({ method, args }); return result; };
  const tx = { $queryRaw: fn("lock", []), product: { updateMany: fn("update", { count }), findMany: fn("expired", [{ id: "expired" }]), deleteMany: fn("delete", { count: 1 }) }, offer: { updateMany: fn("offers", { count: 1 }) }, auditLog: { create: fn("audit", {}), createMany: fn("auditMany", {}) } };
  return { tx: tx as never, calls };
}

test("trash unpublishes product and offers with optimistic concurrency and audit", async () => {
  const { tx, calls } = fixture();
  const now = new Date("2026-09-22T15:00:00Z");
  await moveProductToTrash(tx, "product-A", now, "admin-A", now);
  const update = calls.find(call => call.method === "update")!.args as { where: Record<string, unknown>; data: Record<string, unknown> };
  assert.equal(update.where.deletedAt, null);
  assert.equal(update.where.updatedAt, now);
  assert.equal(update.data.status, "ARCHIVED");
  assert.equal(update.data.featuredPosition, null);
  assert.equal((update.data.purgeAt as Date).toISOString(), "2026-11-22T15:00:00.000Z");
  assert.equal(calls.filter(call => call.method === "offers").length, 1);
  assert.equal(calls.filter(call => call.method === "audit").length, 1);
  const conflict = fixture(0);
  await assert.rejects(() => moveProductToTrash(conflict.tx, "product-A", now, "admin-A", now));
  assert.equal(conflict.calls.some(call => call.method === "offers"), false);
});

test("restore requires an unexpired row and returns as draft without restoring showcases", async () => {
  const { tx, calls } = fixture(); const now = new Date();
  await restoreTrashedProduct(tx, "product-A", now, "admin-A", now);
  const update = calls.find(call => call.method === "update")!.args as { where: Record<string, unknown>; data: Record<string, unknown> };
  assert.deepEqual(update.where.purgeAt, { gt: now });
  assert.equal(update.data.status, "DRAFT");
  assert.equal(update.data.deletedAt, null);
  assert.equal(update.data.purgeAt, null);
  await assert.rejects(() => restoreTrashedProduct(fixture(0).tx, "expired", now, "admin-A", now));
});

test("purge deletes only expired archived IDs, bounded, with no order or financial writes", async () => {
  const { tx, calls } = fixture(); const now = new Date();
  assert.equal(await purgeExpiredProducts(tx, now), 1);
  const query = calls.find(call => call.method === "expired")!.args as { take: number; where: Record<string, unknown> };
  assert.equal(query.take, 100);
  assert.equal(query.where.status, "ARCHIVED");
  assert.deepEqual(query.where.purgeAt, { lte: now });
  const deletion = calls.find(call => call.method === "delete")!.args as { where: Record<string, unknown> };
  assert.deepEqual(deletion.where.id, { in: ["expired"] });
  assert.deepEqual(deletion.where.purgeAt, { lte: now });
  assert.equal(deletion.where.status, "ARCHIVED");
});
