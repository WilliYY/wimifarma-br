import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

const recipe = { version: 1, name: "Caixa sintética", compatibleGtins: [], innerSidesMm: null, outerSidesMm: null, containerTareGrams: null, protectionTareGrams: null, clearanceMm: null, protectionDescription: "", calibrated: false, calibratedAt: null, calibrationNote: "", allowedOrientations: [], unitSideOrder: null };
async function bundleRoute(path: string) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "packaging-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=async()=>globalThis.fixture.guard;" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
  return result.outputFiles[0].text;
}
function load(text: string, fixture: unknown) {
  type Handler = (request: Request, context?: unknown) => Promise<Response>;
  const loaded = { exports: {} as Record<string, Handler> };
  vm.runInNewContext(text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, TextDecoder, Uint8Array, console, process: { env: { AUTH_URL: "https://example.com" } }, Buffer, fixture });
  return loaded.exports;
}
function request(body: unknown, method = "PUT", origin = "https://example.com") {
  return new Request("https://example.com/api/admin/fretes/embalagens", { method, headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
}
test("recipe route supports incomplete drafts with CAS, audited writes, body/origin guard and bounded creation", async () => {
  const text = await bundleRoute("src/app/api/admin/fretes/embalagens/route.ts");
  for (const scenario of ["create", "update", "stale", "limit", "csrf", "unauthorized"] as const) {
    let writes = 0, audits = 0;
    const tx = { user: { findFirst: async () => ({ id: "admin" }) }, $queryRaw: async () => [], packagingRecipe: { count: async () => scenario === "limit" ? 100 : 0,
      create: async () => { writes++; return { id: "box" }; }, updateMany: async () => { writes++; return { count: scenario === "stale" ? 0 : 1 }; } }, auditLog: { create: async () => { audits++; } } };
    const fixture = { guard: scenario === "unauthorized" ? { response: new Response(null, { status: 403 }) } : { session: { user: { id: "admin" } } }, prisma: { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) } };
    const route = load(text, fixture);
    const result = await route.PUT(request({ recipe, revision: scenario === "update" || scenario === "stale" ? 1 : 0, ...(scenario === "update" || scenario === "stale" ? { id: "box" } : {}) }, "PUT", scenario === "csrf" ? "https://evil.invalid" : "https://example.com"));
    assert.equal(result.status, scenario === "unauthorized" || scenario === "csrf" ? 403 : scenario === "stale" ? 409 : scenario === "limit" ? 422 : 200, scenario);
    if (scenario === "create" || scenario === "update") { assert.equal(writes, 1); assert.equal(audits, 1); }
    else assert.equal(audits, 0);
  }
});
test("preview route is read-only, enforces current GTIN and eligibility and preserves existing protected profile", async () => {
  const text = await bundleRoute("src/app/api/admin/fretes/produtos/[id]/evidencias/route.ts");
  const gtin = "07890000000000";
  const evidence = { version: 1, gtin, observations: [{ id: "source", source: { url: "https://example.invalid/ficha", capturedAt: "2026-10-27T00:00:00Z", sha256: "a".repeat(64), gtin, excerpt: "Unidade comercial fechada: peso bruto 100 g, altura 10, largura 20, profundidade 30 mm." }, packagingLevel: "retail_unit", units: 1, identityConflict: false, weightGrams: 100, weightBasis: "gross_explicit", sidesMm: [10, 20, 30], sideOrder: ["altura", "largura", "profundidade"], dimensionsBasis: "labeled_axes", notes: "" }], review: { confirmed: true, note: "Conferido" } };
  const box = { ...recipe, compatibleGtins: [gtin], innerSidesMm: [50, 60, 70], outerSidesMm: [55, 65, 75], containerTareGrams: 20, protectionTareGrams: 5, clearanceMm: [5, 5, 5], protectionDescription: "Proteção sintética", calibrated: true, calibratedAt: "2026-10-27T00:00:00Z", calibrationNote: "Medição sintética", allowedOrientations: [[0, 1, 2]], unitSideOrder: ["altura", "largura", "profundidade"] };
  for (const scenario of ["preview", "gtin-changed", "legacy", "controlled", "unknown-cargo"] as const) {
    const product = { id: "fixture", eanNormalized: scenario === "gtin-changed" ? "07890000000017" : gtin, ean: gtin, logisticsEvidence: evidence, shippingProfile: scenario === "legacy" ? {} : null, category: "Higiene", requiresPrescription: scenario === "controlled", prescriptionType: scenario === "controlled" ? "CONTROLLED" : "UNREVIEWED", isPopularPharmacy: false };
    const fixture = { guard: { session: { user: { id: "admin" } } }, prisma: { product: { findFirst: async () => product }, packagingRecipe: { findUnique: async () => ({ id: "box", data: box }) } } };
    const route = load(text, fixture);
    const response = await route.POST(request({ recipeId: "box", cargoKinds: scenario === "unknown-cargo" ? [] : ["general"] }, "POST"), { params: Promise.resolve({ id: "fixture" }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.previewOnly, true);
    if (scenario === "preview") { assert.equal(result.data.draft.weightGrams, 125); assert.equal(result.data.draft.enabled, false); }
    else { assert.equal(result.data.draft, null); assert.ok(result.data.blockers.length); }
  }
});
