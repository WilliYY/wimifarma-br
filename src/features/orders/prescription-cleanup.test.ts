import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { cleanupExpiredPrescriptions } from "./prescription-cleanup";

test("cleanup is dry-run by default, bounded and deletes only rechecked expired unlinked records", async () => {
  const now = new Date(); const deletes: unknown[] = [], audits: unknown[] = [], queries: string[] = [];
  let selection: unknown;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, id: string) => { queries.push(strings.join("?")); return id === "changed" ? [] : [{ id }]; },
    user: { findFirst: async () => ({ id: "admin" }) },
    prescriptionUpload: {
      findMany: async (args: unknown) => { selection = args; return [{ id: "expired" }, { id: "changed" }]; },
      deleteMany: async (args: unknown) => { deletes.push(args); return { count: 1 }; },
    },
    auditLog: { create: async (args: unknown) => { audits.push(args); } },
  } as unknown as Prisma.TransactionClient;
  assert.equal((await cleanupExpiredPrescriptions(tx, { actorId: "admin", apply: false, now })).deleted, 0);
  assert.equal(deletes.length, 0); assert.equal(audits.length, 0);
  assert.deepEqual(selection, { where: { orderId: null, expiresAt: { lte: now } }, select: { id: true }, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: 100 });
  assert.equal((await cleanupExpiredPrescriptions(tx, { actorId: "admin", apply: true, now })).deleted, 1);
  assert.deepEqual(deletes, [{ where: { id: "expired", orderId: null, expiresAt: { lte: now } } }]);
  assert.equal(audits.length, 1);
  assert.ok(queries.some(query => /"orderId" IS NULL.*FOR UPDATE SKIP LOCKED/.test(query)));
});

test("cleanup revalidates active ADMIN before selecting private records", async () => {
  const tx = { $queryRaw: async () => [], user: { findFirst: async () => null } } as unknown as Prisma.TransactionClient;
  await assert.rejects(cleanupExpiredPrescriptions(tx, { actorId: "revoked", apply: true }), /Active ADMIN required/);
});
