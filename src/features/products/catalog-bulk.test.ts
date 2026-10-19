import assert from "node:assert/strict";
import test from "node:test";
import { bulkProductUpdateSchema, visibleBulkSelection } from "./catalog-bulk";

test("seleção descarta itens ocultados por origem ou filtro e limita o lote", () => {
  const selected = ["physical", "distributor", "filtered"];
  const visible = [{ id: "physical" }];
  const next = visibleBulkSelection(selected, visible);
  assert.deepEqual(next, ["physical"]);
  assert.deepEqual(visibleBulkSelection(next, [{ id: "distributor" }]), []);
  const many = Array.from({ length: 60 }, (_, i) => ({ id: String(i) }));
  assert.equal(visibleBulkSelection(many.map(item => item.id), many).length, 50);
});
test("campos omitidos permanecem ausentes, zero de acréscimo e remoção explícita de categoria são válidos", () => {
  const input = { items: [{ id: "synthetic", expectedUpdatedAt: "2026-10-19T12:00:00.000Z" }], changes: { supplierMarkupBps: 0, category: null } };
  const parsed = bulkProductUpdateSchema.parse(input);
  assert.deepEqual(Object.keys(parsed.changes).sort(), ["category", "supplierMarkupBps"]);
  assert.equal(bulkProductUpdateSchema.safeParse({ ...input, inventorySource: "PHARMACY" }).success, false);
  assert.equal(bulkProductUpdateSchema.safeParse({ ...input, items: [{ ...input.items[0], expectedUpdatedAt: "invalid" }] }).success, false);
});
