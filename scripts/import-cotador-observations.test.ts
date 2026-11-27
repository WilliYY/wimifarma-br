import assert from "node:assert/strict";
import test from "node:test";
import { parseCotadorReport, planCotadorObservation, planCotadorAbsence, sanitizeCotadorError, lockCotadorBatch } from "./import-cotador-observations";
import { PaymentError } from "../src/features/payments/schema";

const now = Date.parse("2026-11-26T12:00:00Z");
const account = "a".repeat(64);
const row = () => ({ observedEan: "7896004708539", identityConfirmed: true, candidateEan: null,
  supplierProductName: "Produto sintético", availability: "available", stockQuantity: 10,
  stockQuantityStatus: "valid", commercialEvidenceVersion: 2, legacyEvidenceRetained: false,
  capturedAt: new Date(now - 60_000).toISOString(), auditStatus: "OK", storeEligible: true, storeEligibilityReasons: [],
  commercialReviewReasons: [], presentationCostCents: 1000, observedPriceCents: 1000, price: 10,
  priceSourceConfirmed: true, priceSourceLabel: "Unit c/ST", priceUnit: "PURCHASE_PRESENTATION",
  priceUnitConfirmed: true, currency: "BRL", stKnown: true, stAmountCents: 0, stStatus: "ST_ISENTO",
  commercialCondition: "", commercialConditionConfirmed: true, minimumQuantity: 1,
  minimumQuantityConfirmed: true, sourceUrl: "https://pedido.anbfarma.com.br" });
const report = () => ({ identity: { schemaVersion: 2, manifestHash: account, sourceHash: account,
  codeHash: account, accounts: [{ supplier: "ANB", fingerprint: account }], limit: 1 },
  products: [{ productId: "synthetic", ean: "7896004708539", canonicalGtin: "07896004708539", name: "Produto sintético", brand: "Marca", requestedQuantity: 1 }],
  tasks: [{ supplier: "ANB", productIndex: 0, status: "completed", offers: [row()] }] });
const target = { id: "synthetic", name: "Produto sintético", brand: "Marca", inventorySource: "DISTRIBUTOR", deletedAt: null,
  eanNormalized: "07896004708539", supplierOffers: [{ supplier: "ANB", externalCode: "approved-sku", eanNormalized: "07896004708539",
    retailCeilingCents: null, allocationQuantity: 2, commercialCondition: null, observedAt: new Date(now - 120_000) }] };
const plan = (patch = {}) => planCotadorObservation(parseCotadorReport(report(), { ANB: account }), 0, { ...row(), ...patch }, target, now);

test("accepts only exact current evidence and preserves approved commercial identifiers", () => {
  const result = plan();
  assert.equal(result.externalCode, "approved-sku");
  assert.equal(result.allocationQuantity, 2);
  assert.equal(result.unitCostCents, 1000);
  assert.equal(result.validUntil, new Date(now + 240_000).toISOString());
  assert.equal("replenishAllocation" in result, false);
});
test("rejects unavailable, stale, future, inferred and commercially uncertain evidence", () => {
  for (const patch of [{ availability: "unavailable" }, { capturedAt: new Date(now - 300_001).toISOString() },
    { capturedAt: new Date(now + 1).toISOString() }, { observedEan: "7896004708538" }, { candidateEan: "7896004708539" },
    { priceUnitConfirmed: false }, { auditStatus: "BLOQUEADO" }, { auditStatus: "ATENCAO" }, { stKnown: false }, { presentationCostCents: 999 }, { commercialCondition: "PIX" },
    { minimumQuantity: 2 }, { storeEligibilityReasons: ["REVIEW"] }, { sourceUrl: "https://evil.invalid" },
    { sourceUrl: "https://pedido.anbfarma.com.br?token=private" }]) assert.throws(() => plan(patch));
});
test("rejects unapproved accounts, duplicate EANs, task aliases, summaries and multiple offers", () => {
  assert.throws(() => parseCotadorReport(report(), { ANB: "b".repeat(64) }));
  assert.throws(() => parseCotadorReport({ identity: { schemaVersion: 1 } }, { ANB: account }));
  const duplicate = report(); duplicate.products.push(duplicate.products[0]);
  assert.throws(() => parseCotadorReport(duplicate, { ANB: account }));
  const tasks = report(); tasks.tasks.push(tasks.tasks[0]);
  assert.throws(() => parseCotadorReport(tasks, { ANB: account }));
  const offers = report(); offers.tasks[0].offers.push(row());
  assert.throws(() => parseCotadorReport(offers, { ANB: account }));
});
test("preserves pharmacy products and refuses divergent or unknown supplier identity", () => {
  const parsed = parseCotadorReport(report(), { ANB: account });
  for (const patch of [{ inventorySource: "PHARMACY" }, { name: "Outro" }, { supplierOffers: [] }, { deletedAt: new Date() }]) {
    assert.throws(() => planCotadorObservation(parsed, 0, row(), { ...target, ...patch }, now));
  }
});
test("absence requires explicit fresh exact EAN evidence and carries no commercial mutation", () => {
  const parsed = parseCotadorReport(report(), { ANB: account });
  const absence = { ...row(), availability: "unavailable", presentationCostCents: null };
  const input = planCotadorAbsence(parsed, 0, absence, target, now);
  assert.equal(input.supplier, "ANB");
  assert.equal("unitCostCents" in input, false);
  assert.equal("stockQuantity" in input, false);
  for (const patch of [{ availability: "unknown" }, { identityConfirmed: false }, { observedEan: "7896004708538" },
    { capturedAt: new Date(now - 300_000).toISOString() }, { sourceUrl: "https://evil.invalid" }]) {
    assert.throws(() => planCotadorAbsence(parsed, 0, { ...absence, ...patch }, target, now));
  }
});
test("locks every product first, then all supplier offers in one globally sorted parameterized query", async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  const tx = { $queryRaw: async (sql: TemplateStringsArray | { sql: string; values: unknown[] }, ...values: unknown[]) => {
    calls.push(Array.isArray(sql) ? { sql: sql.join("?"), values } : sql as { sql: string; values: unknown[] });
    return [];
  } };
  await lockCotadorBatch(tx as unknown as Parameters<typeof lockCotadorBatch>[0], ["b", "a", "b"]);
  assert.equal(calls.length, 3);
  assert.match(calls[0].sql, /FROM "Product"/);
  assert.deepEqual(calls[0].values, ["a"]);
  assert.deepEqual(calls[1].values, ["b"]);
  assert.match(calls[2].sql, /FROM "SupplierCatalogOffer".*IN.*ORDER BY id COLLATE "C" FOR UPDATE/);
  assert.deepEqual(calls[2].values, ["a", "b"]);
  assert.doesNotMatch(calls[2].sql, /'a'|'b'/);
});
test("diagnostics retain controlled errors while removing secrets and raw Prisma details", () => {
  assert.equal(sanitizeCotadorError(new Error("Report SHA-256 mismatch.")), "Report SHA-256 mismatch.");
  assert.equal(sanitizeCotadorError({ code: "P2002", message: "private password" }), "Database operation failed (P2002).");
  assert.match(sanitizeCotadorError(new PaymentError("Observe novamente a disponibilidade no fornecedor.", 422)), /HTTP 422.*Observe novamente/);
  for (const error of [new Error("postgres://private:password@host"), new PaymentError("secret=private", 500),
    { code: "secret", message: "private" }, new SyntaxError("private token")]) {
    assert.doesNotMatch(sanitizeCotadorError(error), /password|secret=|private token|postgres:/);
  }
});
test("not_found has no original offer evidence and cannot be imported as confirmed absence", () => {
  const missing = report();
  missing.tasks[0].status = "not_found";
  missing.tasks[0].offers = [];
  const parsed = parseCotadorReport(missing, { ANB: account });
  assert.throws(() => planCotadorAbsence(parsed, 0, { ...row(), availability: "unavailable" }, target, now));
  missing.tasks[0].offers = [row()];
  assert.throws(() => parseCotadorReport(missing, { ANB: account }));
});
