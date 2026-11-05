import assert from "node:assert/strict";
import test from "node:test";
import { catalogIdentityManifestSchema } from "./schema";
import { buildCatalogIdentityPlan, catalogIdentityPlanSha256, identitySha256 } from "./import-plan";
import { publicCatalogIdentity } from "./public-policy";
import { normalizeGtin } from "../products/gtin";

const row = { ean: "7891234567895", name: "Sabonete teste 90 g", categoryName: "Higiene", categorySlug: "higiene", sourceRecord: { pf: 1234, desconto: 20 } };
const manifest = () => ({ version: 1 as const, sourceFileSha256: "a".repeat(64), rows: [row], reviews: [] });
const now = new Date("2026-11-05T12:00:00Z");
test("validates GTIN and rejects canonical duplicates and supplier fields at public identity level", () => {
  assert.equal(catalogIdentityManifestSchema.safeParse(manifest()).success, true);
  assert.equal(catalogIdentityManifestSchema.safeParse({ ...manifest(), rows: [row, { ...row, ean: "0" + row.ean }] }).success, false);
  assert.equal(catalogIdentityManifestSchema.safeParse({ ...manifest(), rows: [{ ...row, ean: "7891234567890" }] }).success, false);
  assert.equal(catalogIdentityManifestSchema.safeParse({ ...manifest(), rows: [{ ...row, price: 1 }] }).success, false);
});
test("imports private by default, suppresses all existing Product states and persistent tombstones", () => {
  const input = catalogIdentityManifestSchema.parse(manifest());
  const first = buildCatalogIdentityPlan(input, [], new Set(), new Set(), now)[0];
  assert.equal(first.data.publicState, "PRIVATE");
  for (const blockers of [[new Set([first.data.gtinCanonical]), new Set<string>()], [new Set<string>(), new Set([first.data.gtinCanonical])]]) {
    assert.equal(buildCatalogIdentityPlan(input, [], blockers[0], blockers[1], now)[0].data.publicState, "SUPPRESSED");
  }
  assert.equal(buildCatalogIdentityPlan(input, [{ ...first.data, updatedAt: now }], new Set(), new Set(), now)[0].action, "UNCHANGED");
});
test("normalization preserves the nonzero packaging indicator and accepts equivalent lengths", () => {
  assert.equal(normalizeGtin("1234567890128"), "01234567890128");
  assert.equal(normalizeGtin("12345678901231"), "12345678901231");
  assert.notEqual(normalizeGtin("12345678901231"), normalizeGtin("1234567890128"));
  assert.equal(normalizeGtin("96385074"), "00000096385074");
  assert.equal(normalizeGtin("036000291452"), "00036000291452");
});
test("source presentation changes invalidate reviews; JSON object key ordering does not change identity", () => {
  const a = { ...row, sourceRecord: { laboratory: "Synthetic A", presentation: "90 g" } };
  const b = { ...row, sourceRecord: { presentation: "90 g", laboratory: "Synthetic A" } };
  assert.equal(identitySha256(a), identitySha256(b));
  assert.notEqual(identitySha256(a), identitySha256({ ...a, sourceRecord: { ...a.sourceRecord, laboratory: "Synthetic B" } }));
});
test("historical snapshot suppression remains effective before identity creation and is plan-bound", () => {
  const input = catalogIdentityManifestSchema.parse({ ...manifest(), suppressionSnapshot: { sourceFileSha256: "c".repeat(64), observedAt: "2026-11-04T12:00:00Z", gtins: [row.ean] } });
  const plan = buildCatalogIdentityPlan(input, [], new Set(), new Set(), now);
  assert.equal(plan[0].data.publicState, "SUPPRESSED");
  assert.notEqual(catalogIdentityPlanSha256(plan), catalogIdentityPlanSha256(plan, input.suppressionSnapshot));
});
test("only an exact explicit non-medicine review publishes and DTO excludes private source", () => {
  const input = catalogIdentityManifestSchema.parse({ ...manifest(), reviews: [{ gtinCanonical: "0" + row.ean, identitySha256: identitySha256(row), regulatoryStatus: "NON_MEDICINE", medicine: false, nbcal: false, evidence: "Manufacturer presentation checked https://example.org/item", reviewedAt: now.toISOString(), reviewedBy: "admin-1" }] });
  const record = { ...buildCatalogIdentityPlan(input, [], new Set(), new Set(), now)[0].data, updatedAt: now };
  const dto = publicCatalogIdentity(record, now);
  assert.ok(dto);
  assert.deepEqual(Object.keys(dto).sort(), ["kind", "id", "gtinCanonical", "ean", "name", "categoryName", "categorySlug", "href"].sort());
  assert.equal(JSON.stringify(dto).includes("desconto"), false);
  for (const overrides of [{ publicState: "PRIVATE" }, { publicState: "SUPPRESSED" }, { regulatoryStatus: "UNKNOWN" }, { reviewedAt: null }, { reviewedAt: new Date(now.getTime() + 1) }, { reviewIdentitySha256: "b".repeat(64) }, { reviewEvidence: null }, { suppressedAt: now }]) {
    assert.equal(publicCatalogIdentity({ ...record, ...overrides } as typeof record, now), null);
  }
  const changed = catalogIdentityManifestSchema.parse({ ...manifest(), rows: [{ ...row, name: "Sabonete outra apresentação 180 g" }] });
  assert.equal(buildCatalogIdentityPlan(changed, [record], new Set(), new Set(), now)[0].data.publicState, "PRIVATE");
  const suppressed = { ...record, publicState: "SUPPRESSED" as const, suppressedAt: now };
  assert.equal(buildCatalogIdentityPlan(input, [suppressed], new Set(), new Set(), now)[0].data.publicState, "SUPPRESSED");
});
