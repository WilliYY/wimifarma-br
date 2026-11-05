import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { executeCatalogIdentityImport } from "./import-service";
import { identitySha256 } from "./import-plan";
import type { CatalogIdentityRecord } from "./types";

const now = new Date("2026-11-05T12:00:00Z");
const row = { ean: "7891234567895", name: "Sabonete sintético 90 g", categoryName: "Higiene", categorySlug: "higiene", sourceRecord: { privatePf: 321, laboratory: "Sintético" } };
const manifest = () => ({ version: 1, sourceFileSha256: "a".repeat(64), rows: [row], reviews: [] });
function fixture() {
  const rows = new Map<string, CatalogIdentityRecord>();
  const suppressed = new Set<string>();
  const products: { ean: string | null; eanNormalized: string | null; status?: string; deletedAt?: Date }[] = [];
  const writes: number[] = [];
  const readBatches: number[] = [];
  const audits: unknown[] = [];
  const locks: string[] = [];
  let admin = true;
  let stale = false;
  const tx = {
    $queryRaw: async (query: TemplateStringsArray | { strings: string[] }) => {
      const text = Array.from("strings" in query ? query.strings : query).join("");
      locks.push(text);
      return text.includes("count(*)") ? [{ count: 7 }] : [];
    },
    user: { findFirst: async () => admin ? { id: "admin-1" } : null },
    product: { findMany: async () => products },
    catalogIdentity: {
      findMany: async ({ where }: { where: { gtinCanonical: { in: string[] } } }) => { readBatches.push(where.gtinCanonical.in.length); return where.gtinCanonical.in.flatMap(gtin => rows.has(gtin) ? [rows.get(gtin)!] : []); },
      createMany: async ({ data }: { data: CatalogIdentityRecord[] }) => { writes.push(data.length); data.forEach(item => rows.set(item.gtinCanonical, { ...item, updatedAt: now })); return { count: data.length }; },
      updateMany: async ({ where, data }: { where: { gtinCanonical: string | { in: string[] }; updatedAt?: Date }; data: Partial<CatalogIdentityRecord> }) => {
        if (typeof where.gtinCanonical !== "string") return { count: 0 };
        const old = rows.get(where.gtinCanonical);
        if (!old || stale || old.updatedAt.getTime() !== where.updatedAt?.getTime()) return { count: 0 };
        writes.push(1); rows.set(old.gtinCanonical, { ...old, ...data, updatedAt: now }); return { count: 1 };
      },
    },
    catalogIdentitySuppression: {
      findMany: async ({ where }: { where: { gtinCanonical: { in: string[] } } }) => where.gtinCanonical.in.filter(gtin => suppressed.has(gtin)).map(gtinCanonical => ({ gtinCanonical })),
      createMany: async ({ data }: { data: { gtinCanonical: string }[] }) => { let count = 0; for (const item of data) if (!suppressed.has(item.gtinCanonical)) { suppressed.add(item.gtinCanonical); count++; } return { count }; },
    },
    auditLog: { createMany: async ({ data }: { data: unknown[] }) => { audits.push(...data); return { count: data.length }; }, create: async ({ data }: { data: unknown }) => { audits.push(data); return data; } },
  } as unknown as Prisma.TransactionClient;
  return { tx, rows, products, suppressed, writes, readBatches, audits, locks, revoke: () => { admin = false; }, stale: () => { stale = true; } };
}
test("dry-run locks catalog before ADMIN/identity, has no writes and reports historical coverage gaps", async () => {
  const f = fixture();
  const result = await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now });
  assert.equal(result.applied, false);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.audits, []);
  assert.match(f.locks[0], /pg_advisory_xact_lock/);
  assert.match(f.locks[1], /User.*FOR SHARE/);
  assert.match(f.locks[2], /CatalogIdentity.*FOR UPDATE/);
  assert.equal(result.coverageGap.legacyPurgeAuditsWithoutGtin, 7);
});
test("apply requires exact dry-run hash and live ADMIN; repeated fresh import is idempotent", async () => {
  const f = fixture();
  await assert.rejects(executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { apply: true, now }), /fresh dry-run/);
  assert.deepEqual(f.writes, []);
  const dryRun = await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now });
  await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { apply: true, expectedPlanSha256: dryRun.planSha256, now });
  assert.deepEqual(f.writes, [1]);
  assert.equal(f.audits.length, 1);
  assert.equal(JSON.stringify(f.audits).includes("privatePf"), false);
  const repeated = await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now });
  assert.equal(repeated.counts.unchanged, 1);
  await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { apply: true, expectedPlanSha256: repeated.planSha256, now });
  assert.deepEqual(f.writes, [1]);
  assert.equal(f.audits.length, 1);
  f.revoke();
  await assert.rejects(executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now }), /Active ADMIN/);
});
test("all Product states reserve identity and a forged review actor is rejected", async () => {
  for (const status of ["ACTIVE", "DRAFT", "ARCHIVED"]) {
    const f = fixture(); f.products.push({ ean: row.ean, eanNormalized: null, status, deletedAt: now });
    const result = await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now });
    assert.equal(result.counts.suppressed, 1);
  }
  const f = fixture();
  await assert.rejects(executeCatalogIdentityImport(f.tx, { ...manifest(), reviews: [{ gtinCanonical: "0" + row.ean, identitySha256: identitySha256(row), regulatoryStatus: "NON_MEDICINE", medicine: false, nbcal: false, evidence: "Synthetic manufacturer evidence", reviewedAt: now.toISOString(), reviewedBy: "other-admin" }] }, "admin-1", { now }), /Review actor/);
  assert.deepEqual(f.writes, []);
});
test("CAS mismatch aborts an update before audit", async () => {
  const f = fixture();
  const first = await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now });
  await executeCatalogIdentityImport(f.tx, manifest(), "admin-1", { now, apply: true, expectedPlanSha256: first.planSha256 });
  const changed = { ...manifest(), rows: [{ ...row, name: "Sabonete sintético outra apresentação 180 g" }] };
  const dryRun = await executeCatalogIdentityImport(f.tx, changed, "admin-1", { now });
  f.stale();
  await assert.rejects(executeCatalogIdentityImport(f.tx, changed, "admin-1", { now, apply: true, expectedPlanSha256: dryRun.planSha256 }), /revision changed/);
  assert.equal(f.audits.length, 1);
});
test("more than 500 rows uses bounded reads and creates", async () => {
  const f = fixture();
  const sourceRows = Array.from({ length: 501 }, (_, index) => {
    const body = String(900000000000 + index);
    const sum = [...body].reverse().reduce((value, digit, position) => value + Number(digit) * (position % 2 ? 1 : 3), 0);
    return { ...row, ean: body + String((10 - sum % 10) % 10), name: `Item sintético ${index}` };
  });
  const input = { ...manifest(), rows: sourceRows };
  const dryRun = await executeCatalogIdentityImport(f.tx, input, "admin-1", { now });
  await executeCatalogIdentityImport(f.tx, input, "admin-1", { now, apply: true, expectedPlanSha256: dryRun.planSha256 });
  assert.deepEqual(f.writes, [500, 1]);
  assert.equal(f.readBatches.every(length => length <= 500), true);
  assert.equal(f.audits.length, 501);
});
