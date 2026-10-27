import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { logisticsEvidenceSchema } from "./logistics-evidence";

test("evidence route restricts ADMIN, Origin, GTIN and CAS; persists evidence only with transactional audit", async () => {
  const bundle = await build({ entryPoints: ["src/app/api/admin/fretes/produtos/[id]/evidencias/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "logistics-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=async()=>globalThis.fixture.guard;" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
  const updatedAt = "2026-10-27T00:00:00.000Z";
  for (const scenario of ["save", "unauthorized", "csrf", "gtin", "stale", "unknown-field", "unknown-decision", "inactive-admin"] as const) {
    const writes: { data: object }[] = [], audits: unknown[] = [];
    const product = { id: "fixture", ean: "7890000000000", eanNormalized: "07890000000000", updatedAt: new Date(updatedAt), logisticsEvidence: null, deletedAt: null };
    const tx = { user: { findFirst: async () => scenario === "inactive-admin" ? null : ({ id: "admin" }) }, product: { findFirst: async () => product, updateMany: async (query: { data: object }) => { writes.push(query); return { count: scenario === "stale" ? 0 : 1 }; } }, auditLog: { create: async (query: unknown) => { audits.push(query); } } };
    const fixture = { guard: scenario === "unauthorized" ? { response: new Response(null, { status: 403 }) } : { session: { user: { id: "admin" } } }, prisma: { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) } };
    const loaded = { exports: {} as { PUT: (request: Request, context: unknown) => Promise<Response> } };
    vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, TextDecoder, Uint8Array, console, process: { env: { AUTH_URL: "https://example.com" } }, Buffer, fixture });
    const evidence = { version: 1, gtin: scenario === "gtin" ? "07890000000017" : product.eanNormalized, observations: [], sourceDecisions: scenario === "unknown-decision" ? [{ observationId: "absent", state: "rejected", reason: "Fonte não pertence ao produto" }] : [], review: { confirmed: false, note: "" }, ...(scenario === "unknown-field" ? { shippingProfile: { enabled: true } } : {}) };
    const response = await loaded.exports.PUT(new Request("https://example.com/evidence", { method: "PUT", headers: { "Content-Type": "application/json", origin: scenario === "csrf" ? "https://evil.invalid" : "https://example.com" }, body: JSON.stringify({ evidence, updatedAt }) }), { params: Promise.resolve({ id: product.id }) });
    assert.equal(response.status, scenario === "unauthorized" || scenario === "csrf" || scenario === "inactive-admin" ? 403 : scenario === "stale" ? 409 : scenario === "gtin" || scenario === "unknown-field" || scenario === "unknown-decision" ? 422 : 200, scenario);
    if (scenario === "save") { assert.deepEqual(Object.keys(writes[0].data), ["logisticsEvidence"]); assert.equal(audits.length, 1); }
    else assert.equal(audits.length, 0);
  }
  const gtin = "07890000000000";
  let history = logisticsEvidenceSchema.parse({ version: 1, gtin, observations: [{ id: "historic", source: { url: "https://example.invalid/ficha", capturedAt: updatedAt, sha256: "a".repeat(64), gtin, excerpt: "Ficha histórica; natureza do peso não declarada." }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 100, weightBasis: "unspecified", sidesMm: null, sideOrder: ["altura", "largura", "profundidade"], dimensionsBasis: "labeled_axes", notes: "" }], review: { confirmed: true, note: "Conferido" } });
  const decisions = [{ observationId: "historic", state: "superseded", reason: "Ficha histórica substituída após conferência." }];
  const lifecycleAudits: { data: { metadata: { sourceDecisionsBefore: unknown[]; sourceDecisionsAfter: unknown[]; decisionReason: string } } }[] = [];
  const tx = { user: { findFirst: async () => ({ id: "admin" }) }, product: {
    findFirst: async () => ({ id: "fixture", ean: gtin, eanNormalized: gtin, deletedAt: null, updatedAt: new Date(updatedAt), logisticsEvidence: history }),
    updateMany: async (query: { data: { logisticsEvidence: unknown } }) => { history = logisticsEvidenceSchema.parse(query.data.logisticsEvidence); return { count: 1 }; },
  }, auditLog: { create: async (query: typeof lifecycleAudits[number]) => { lifecycleAudits.push(query); } } };
  const fixture = { guard: { session: { user: { id: "admin" } } }, prisma: { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) } };
  const loaded = { exports: {} as { PUT: (request: Request, context: unknown) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, TextDecoder, Uint8Array, console, process: { env: { AUTH_URL: "https://example.com" } }, Buffer, fixture });
  const save = (sourceDecisions: unknown[], decisionReason?: string) => loaded.exports.PUT(new Request("https://example.com/evidence", { method: "PUT", headers: { "Content-Type": "application/json", origin: "https://example.com" }, body: JSON.stringify({ evidence: { version: 1, gtin, observations: [], sourceDecisions, review: { confirmed: true, note: "Conferido" } }, updatedAt, ...(decisionReason ? { decisionReason } : {}) }) }), { params: Promise.resolve({ id: "fixture" }) });
  assert.equal((await save(decisions, "Desconsiderar ficha antiga após conferência")).status, 200);
  assert.equal(history.observations.length, 1); assert.equal(history.review.confirmed, false);
  assert.equal(lifecycleAudits[0].data.metadata.sourceDecisionsBefore.length, 0);
  assert.equal(lifecycleAudits[0].data.metadata.sourceDecisionsAfter.length, 1);
  assert.equal((await save(decisions)).status, 200); assert.equal(history.review.confirmed, true);
  assert.equal((await save([])).status, 422); assert.equal(history.review.confirmed, true);
  assert.equal((await save([], "Reativar fonte após nova conferência documental")).status, 200);
  assert.equal(history.observations.length, 1); assert.equal(history.review.confirmed, false);
  assert.equal(lifecycleAudits.at(-1)!.data.metadata.sourceDecisionsBefore.length, 1);
  assert.equal(lifecycleAudits.at(-1)!.data.metadata.sourceDecisionsAfter.length, 0);
  assert.equal(lifecycleAudits.at(-1)!.data.metadata.decisionReason, "Reativar fonte após nova conferência documental");
});
