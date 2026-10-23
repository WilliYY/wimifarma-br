import assert from "node:assert/strict";
import test from "node:test";
import { cmedImportManifestSchema, executeCmedImport, type CmedImportTarget, type CmedImportTransaction } from "./cmed-import";

const now = Date.parse("2026-10-23T12:00:00.000Z");
const reference = {
  version: 1 as const, eanNormalized: "07896004724577", product: "Medicamento sintético", presentation: "10 MG CT 30 COM",
  laboratory: "Laboratório sintético", registration: "1234567890123",
  sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file",
  sourceSha256: "5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3",
  publishedOn: "2026-10-09", observedAt: "2026-10-22T12:00:00.000Z", rates: [{ label: "PMC 20%", cents: 2500 }],
};
const row = { productId: "synthetic", expectedUpdatedAt: "2026-10-22T10:00:00.000Z", expectedName: "Medicamento sintético 10 mg", expectedBrand: "Marca sintética", cmedReference: reference };
function fixture(patch: Partial<CmedImportTarget> = {}, activeAdmin = true) {
  const updates: unknown[] = [], audits: unknown[] = [], locks: string[] = [];
  const current: CmedImportTarget = { id: row.productId, updatedAt: new Date(row.expectedUpdatedAt), name: row.expectedName, brand: row.expectedBrand,
    ean: "7896004724577", eanNormalized: reference.eanNormalized, status: "ACTIVE", deletedAt: null, isPopularPharmacy: false,
    catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false }, cmedReference: null, ...patch };
  const tx: CmedImportTransaction = {
    lockCatalog: async () => { locks.push("pg_advisory_xact_lock"); },
    $queryRaw: async (strings, ...values) => { locks.push(`${strings.join("?")}:${values.join(",")}`); return []; },
    user: { findFirst: async () => activeAdmin ? { id: "admin" } : null },
    product: { findUnique: async () => current, update: async input => { updates.push(input); } },
    auditLog: { create: async input => { audits.push(input); } },
  };
  return { tx, current, updates, audits, locks };
}
const manifest = () => cmedImportManifestSchema.parse({ version: 1, products: [row] });

test("CMED dry-run validates and locks without product or audit writes", async () => {
  const f = fixture();
  assert.equal((await executeCmedImport(f.tx, manifest(), "admin", false, now)).length, 1);
  assert.deepEqual(f.updates, []); assert.deepEqual(f.audits, []);
  assert.match(f.locks[0], /pg_advisory_xact_lock/); assert.match(f.locks[1], /User.*FOR SHARE/); assert.match(f.locks[2], /Product.*FOR UPDATE/);
});

test("CMED apply writes only cmedReference and creates an actor audit", async () => {
  const f = fixture();
  await executeCmedImport(f.tx, manifest(), "admin", true, now);
  assert.deepEqual(f.updates, [{ where: { id: row.productId }, data: { cmedReference: reference } }]);
  assert.equal(f.audits.length, 1);
  assert.equal((f.audits[0] as { data: { userId: string } }).data.userId, "admin");
});

test("CMED rejects changed target, EAN, identity, revision and ineligible products", async () => {
  for (const patch of [
    { id: "other" }, { ean: "7896004724578", eanNormalized: "07896004724578" }, { ean: "7896004724578" },
    { name: "Outro medicamento" }, { brand: null }, { updatedAt: new Date(now) }, { status: "DRAFT" },
    { deletedAt: new Date(now) }, { isPopularPharmacy: true }, { catalogClassification: { kind: "HYGIENE" } },
  ]) {
    const f = fixture(patch);
    await assert.rejects(executeCmedImport(f.tx, manifest(), "admin", true, now));
    assert.deepEqual(f.updates, []); assert.deepEqual(f.audits, []);
  }
});

test("CMED rejects inactive/non-ADMIN actors and newer stored references", async () => {
  await assert.rejects(executeCmedImport(fixture({}, false).tx, manifest(), "admin", true, now), /Active ADMIN/);
  for (const cmedReference of [{ ...reference, publishedOn: "2026-10-16" }, { ...reference, observedAt: "2026-10-23T11:00:00.000Z" }]) {
    const f = fixture({ cmedReference });
    await assert.rejects(executeCmedImport(f.tx, manifest(), "admin", true, now), /Newer CMED/);
    assert.deepEqual(f.updates, []);
  }
});

test("CMED manifest rejects unknown changes, duplicate IDs and oversized batches", () => {
  for (const value of [{ version: 1, products: [{ ...row, price: 1 }] }, { version: 1, products: [row, row] },
    { version: 1, products: Array.from({ length: 1001 }, (_, i) => ({ ...row, productId: String(i) })) }]) {
    assert.equal(cmedImportManifestSchema.safeParse(value).success, false);
  }
});

test("CMED validates official source, hash, edition, dates and reference EAN", async () => {
  for (const patch of [{ sourceSha256: "b".repeat(64) }, { sourceUrl: "https://example.com/file.xlsx" },
    { publishedOn: "2026-10-16" }, { observedAt: "2026-10-24T00:00:00.000Z" }, { eanNormalized: "07896004724578" }]) {
    const f = fixture();
    await assert.rejects(executeCmedImport(f.tx, cmedImportManifestSchema.parse({ version: 1, products: [{ ...row, cmedReference: { ...reference, ...patch } }] }), "admin", true, now));
    assert.deepEqual(f.updates, []);
  }
});

test("CMED locks products in ID order and validates the complete batch before writes", async () => {
  const f = fixture();
  const first = { ...row, productId: "a", cmedReference: { ...reference, eanNormalized: "07896004724584" } };
  const last = { ...row, productId: "z" };
  const targets = new Map([
    ["a", { ...f.current, id: "a", ean: "7896004724584", eanNormalized: "07896004724584" }],
    ["z", { ...f.current, id: "z", name: "Nome alterado" }],
  ]);
  f.tx.product.findUnique = async input => targets.get(input.where.id) ?? null;
  const batch = cmedImportManifestSchema.parse({ version: 1, products: [last, first] });
  await assert.rejects(executeCmedImport(f.tx, batch, "admin", true, now), /identity or revision/);
  assert.deepEqual(f.updates, []); assert.deepEqual(f.audits, []);
  assert.match(f.locks[2], /:a$/); assert.match(f.locks[3], /:z$/);
});
