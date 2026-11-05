import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogIdentity } from "./public-policy";
import { buildCatalogIdentityPlan, identitySha256 } from "./import-plan";

const now = new Date("2026-11-05T12:00:00Z");
const row = { ean: "7891234567895", name: "Sabonete sintético 90 g", categoryName: "Higiene", categorySlug: "higiene", sourceRecord: { laboratory: "Sintético", sourcePf: 500 } };
function reviewed() {
  const manifest = { version: 1 as const, sourceFileSha256: "a".repeat(64), rows: [row], reviews: [{ gtinCanonical: "0" + row.ean, identitySha256: identitySha256(row), regulatoryStatus: "NON_MEDICINE" as const, medicine: false as const, nbcal: false as const, evidence: "Synthetic manufacturer checked presentation", reviewedAt: now.toISOString(), reviewedBy: "admin-1" }] };
  return { ...buildCatalogIdentityPlan(manifest, [], new Set(), new Set(), now)[0].data, updatedAt: now };
}
test("second public boundary rejects inadequate evidence and invalid dates", () => {
  const record = reviewed();
  assert.ok(publicCatalogIdentity(record, now));
  assert.equal(publicCatalogIdentity({ ...record, reviewEvidence: "x" }, now), null);
  assert.equal(publicCatalogIdentity({ ...record, reviewedAt: new Date(NaN) }, now), null);
});
test("exact source review never exposes supplier fields and suppression cannot reopen", () => {
  const record = reviewed();
  const dto = publicCatalogIdentity(record, now)!;
  assert.equal(dto.id, "catalog:07891234567895");
  assert.equal(dto.href, "/catalogo/item/7891234567895");
  assert.deepEqual(Object.keys(dto).sort(), ["kind", "id", "gtinCanonical", "ean", "name", "categoryName", "categorySlug", "href"].sort());
  assert.equal(JSON.stringify(dto).includes("sourcePf"), false);
  const manifest = { version: 1 as const, sourceFileSha256: "a".repeat(64), rows: [row], reviews: [] };
  assert.equal(buildCatalogIdentityPlan(manifest, [{ ...record, publicState: "SUPPRESSED", suppressedAt: now }], new Set(), new Set(), now)[0].data.publicState, "SUPPRESSED");
  assert.equal(buildCatalogIdentityPlan({ ...manifest, rows: [{ ...row, sourceRecord: { ...row.sourceRecord, laboratory: "Outra apresentação" } }] }, [record], new Set(), new Set(), now)[0].data.publicState, "PRIVATE");
});
