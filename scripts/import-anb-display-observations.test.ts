import assert from "node:assert/strict";
import test from "node:test";
import { parseAnbDisplayEvidence, planAnbDisplayObservation, confirmAnbProductIdentity, sanitizeAnbDisplayError, anbDisplayReviewReason } from "./import-anb-display-observations";
import { PaymentError } from "../src/features/payments/schema";

const account = "a".repeat(64);
const ean = "7896004708539", canonicalGtin = "07896004708539";
const now = Date.parse("2026-11-27T15:00:00Z");
const time = (seconds: number) => new Date(now - seconds * 1000).toISOString();
const report = () => ({ identity: { schemaVersion: 2, manifestHash: account, sourceHash: account, codeHash: account,
  accounts: [{ supplier: "ANB", fingerprint: account }], limit: 1 }, createdAt: time(300), completedAt: time(100),
  products: [{ productId: `identity:${ean}`, ean, canonicalGtin, name: "Produto sintético", brand: "Marca sintética" }],
  tasks: [{ supplier: "ANB", productIndex: 0, status: "completed", completedAt: time(150), offers: [{
    sourceUrl: "https://pedido.anbfarma.com.br", priceSourceLabel: "Unit c/ST", priceSourceConfirmed: true,
    currency: "BRL", supplierProductName: "DESCRIÇÃO SINTÉTICA", observedEan: null, candidateEan: ean,
    observedPriceCents: 1234, price: 12.34, capturedAt: time(180), identityConfirmed: false,
    storeEligible: false, presentationCostCents: null }] }] });
const network = () => {
  const metadata = { capturedAt: time(200), hostname: "pedidoapi.anbfarma.com.br", status: 200,
    resourceType: "XHR", sourceUrl: `https://pedidoapi.anbfarma.com.br/epedido/produto/produtos/pesquisa/${ean}` };
  return { readOnly: true, identityConfirmed: false, startedAt: time(350), truncated: false,
    truncation: { requestsSkipped: 0, responsesSkipped: 0, responseBufferSkipped: 0, oversizedBodiesSkipped: 0,
      busyBodiesSkipped: 0, recordLimitedResponsesSkipped: 0, recordBranchesSkipped: 0, depthBranchesSkipped: 0,
      nodeBranchesSkipped: 0, arrayItemsSkipped: 0, fieldsSkipped: 0 }, diagnosticCodes: [] as string[],
    responses: [{ ...metadata }], records: [{ ...metadata, method: "GET", fields: { cod_produto: 123, descricao: "DESCRIÇÃO SINTÉTICA", valorUnitSt: "12,34" },
      eanFields: [{ field: "cod_barra", type: "string", value: ean, canonicalGtin }] }] };
};
const plan = (rawReport = report(), rawNetwork = network(), at = now) => {
  const parsed = parseAnbDisplayEvidence(rawReport, rawNetwork, { ANB: account });
  return planAnbDisplayObservation(parsed.report, parsed.network, 0, at);
};

test("double exact evidence creates only historical display data even when commerce is blocked", () => {
  assert.deepEqual(plan(), { eanNormalized: canonicalGtin, observedAt: time(180), displayPriceCents: 1234 });
  assert.equal("unitCostCents" in plan(), false);
  const r = report(); delete (r.products[0] as { productId?: string }).productId;
  assert.equal(plan(r).displayPriceCents, 1234);
});
test("account, original bounded part, canonical GTIN and complete task matrix are mandatory", () => {
  assert.throws(() => parseAnbDisplayEvidence(report(), network(), { ANB: "b".repeat(64) }));
  for (const patch of [{ schemaVersion: 1 }, { limit: 51 }, { limit: 2 }]) {
    const r = report(); Object.assign(r.identity, patch); assert.throws(() => plan(r));
  }
  for (const changed of ["00000000000000", "17896004708539", "07896004708538"]) {
    const r = report(); r.products[0].canonicalGtin = changed; assert.throws(() => plan(r));
  }
  const r = report(); r.products.push({ ...r.products[0] }); assert.throws(() => plan(r));
  const t = report(); t.tasks.push({ ...t.tasks[0] }); assert.throws(() => plan(t));
});
test("truncation, diagnostics, HTTP failures and missing response cannot establish evidence", () => {
  const truncated = network(); truncated.truncated = true; assert.throws(() => plan(report(), truncated));
  const skipped = network(); skipped.truncation.fieldsSkipped = 1; assert.throws(() => plan(report(), skipped));
  const missingCounter = network(); delete (missingCounter.truncation as Partial<typeof missingCounter.truncation>).fieldsSkipped;
  assert.throws(() => plan(report(), missingCounter));
  const diagnostics = network(); diagnostics.diagnosticCodes.push("RESPONSE_UNAVAILABLE_OR_INVALID"); assert.throws(() => plan(report(), diagnostics));
  const failed = network(); failed.records[0].status = 429; assert.throws(() => plan(report(), failed));
  const missing = network(); missing.responses = []; assert.throws(() => plan(report(), missing));
});
test("duplicate GTIN objects and reused observed codes remain ambiguous", () => {
  const n = network(); n.records.push(structuredClone(n.records[0])); assert.throws(() => plan(report(), n));
  const reused = network(); reused.records.push({ ...structuredClone(reused.records[0]),
    eanFields: [{ field: "cod_barra", type: "string", value: "7891234567895", canonicalGtin: "07891234567895" }] });
  assert.throws(() => plan(report(), reused));
  const inconsistent = network(); inconsistent.records[0].eanFields[0].value = "7891234567895";
  assert.throws(() => plan(report(), inconsistent));
});
test("description, Unit c/ST, cents, official URL and barcode must match exactly", () => {
  for (const patch of [{ supplierProductName: "DESCRIÇÃO SINTÉTICA " }, { priceSourceLabel: "Preço" },
    { priceSourceConfirmed: false }, { observedPriceCents: 1233 }, { price: 12.33 }, { currency: "USD" },
    { sourceUrl: "https://evil.invalid" }, { observedEan: "7891234567895" }, { candidateEan: "7891234567895" }]) {
    const r = report(); Object.assign(r.tasks[0].offers[0], patch); assert.throws(() => plan(r));
  }
  for (const value of ["12.34", "12,345", "0,00", "1.234,00", "NaN", "-12,34"]) {
    const n = network(); n.records[0].fields.valorUnitSt = value; assert.throws(() => plan(report(), n));
  }
  for (const patch of [{ sourceUrl: "https://evil.invalid/product" }, { hostname: "pedido.anbfarma.com.br" },
    { sourceUrl: network().records[0].sourceUrl + "?token=private" }]) {
    const n = network(); Object.assign(n.records[0], patch); assert.throws(() => plan(report(), n));
  }
});
test("window is ordered, timezone-aware, completed, not future and within current Brazil day", () => {
  assert.throws(() => plan(report(), network(), now + 24 * 60 * 60 * 1000));
  assert.throws(() => plan(report(), network(), now - 500 * 1000));
  const r = report(); r.tasks[0].offers[0].capturedAt = time(250); assert.throws(() => plan(r));
  const noZone = report(); noZone.tasks[0].offers[0].capturedAt = "2026-11-27T11:00:00"; assert.throws(() => plan(noZone));
  const earlyBrazilDay = Date.parse("2026-11-28T01:00:00Z");
  assert.equal(plan(report(), network(), earlyBrazilDay).displayPriceCents, 1234);
  assert.throws(() => plan(report(), network(), Date.parse("2026-11-28T03:00:00Z")));
});
test("identity aliases do not bypass exact existing Product, name, brand or deletion checks", () => {
  const product = report().products[0];
  const target = { id: "real-synthetic-product", eanNormalized: canonicalGtin, ean, inventorySource: "DISTRIBUTOR",
    name: product.name, brand: product.brand, deletedAt: null };
  assert.equal(confirmAnbProductIdentity(product, target), target.id);
  assert.equal(confirmAnbProductIdentity({ ...product, productId: undefined }, target), target.id);
  for (const patch of [{ eanNormalized: "07891234567895" }, { ean: "7891234567895" }, { inventorySource: "PHARMACY" },
    { name: "Outro" }, { brand: "Outro" }, { deletedAt: new Date() }]) {
    assert.throws(() => confirmAnbProductIdentity(product, { ...target, ...patch }));
  }
  assert.throws(() => confirmAnbProductIdentity({ ...product, productId: "identity:other" }, target));
  assert.throws(() => confirmAnbProductIdentity(product, null));
});
test("errors never expose raw input, credentials or database details", () => {
  for (const error of [new Error("postgres://private:secret@host"), new SyntaxError("private token"), { code: "secret" }]) {
    assert.doesNotMatch(sanitizeAnbDisplayError(error), /postgres|private token|secret/);
  }
  assert.equal(sanitizeAnbDisplayError({ code: "P2002", message: "private token" }), "Database operation failed (P2002).");
});
test("only controlled evidence and 409/422 policy failures become REVIEW; operational failures abort", () => {
  assert.equal(anbDisplayReviewReason(new Error("Existing exact Product identity required.")), "Existing exact Product identity required.");
  const message = "Já existe uma observação diferente nesse horário para esta apresentação.";
  assert.equal(anbDisplayReviewReason(new PaymentError(message, 409)), message);
  assert.equal(anbDisplayReviewReason(new PaymentError(message, 422)), message);
  for (const error of [new Error("programming failure"), { code: "P2002", message: "private diagnostics" },
    new PaymentError(message, 500), new PaymentError("private diagnostics", 422), new TypeError("undefined")]) {
    assert.equal(anbDisplayReviewReason(error), null);
  }
});
