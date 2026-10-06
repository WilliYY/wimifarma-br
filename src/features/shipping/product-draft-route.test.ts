import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { shippingAdminProfileSchema } from "./product-draft";

test("freight admin accepts partial drafts but approval requires explicit review and complete measurements", () => {
  const draft = { enabled: false, transportReviewed: false, weightGrams: null, widthCm: 20.8, lengthCm: 20.8, heightCm: 21.6 };
  assert.equal(shippingAdminProfileSchema.safeParse(draft).success, true);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...draft, widthCm: null, heightCm: null, lengthCm: null }).success, true);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...draft, enabled: true }).success, false);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...draft, transportReviewed: true }).success, false);
  const complete = { ...draft, weightGrams: 350, enabled: true, transportReviewed: true };
  assert.equal(shippingAdminProfileSchema.safeParse(complete).success, true);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...complete, enabled: false }).success, true);
  assert.equal(shippingAdminProfileSchema.parse(draft).measurementBasis, "measured");
  assert.equal(shippingAdminProfileSchema.safeParse({ ...draft, measurementBasis: "estimated" }).success, true);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...complete, measurementBasis: "estimated" }).success, true);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...complete, measurementBasis: "estimated", weightGrams: null }).success, false);
  assert.equal(shippingAdminProfileSchema.safeParse({ ...complete, measurementBasis: "estimated", transportReviewed: false }).success, false);
  for (const transportReviewed of [false, "true", undefined]) {
    assert.equal(shippingAdminProfileSchema.safeParse({ ...complete, transportReviewed }).success, false);
  }
});

test("freight admin persists partial drafts and retains authorization, version checking and audit", async () => {
  const bundle = await build({ entryPoints: ["src/app/api/admin/fretes/produtos/[id]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-freight-product", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=async()=>globalThis.fixture.guard;" : "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
  const draft = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: null, widthCm: 20.8, lengthCm: 20.8, heightCm: 21.6 };
  const updatedAt = "2026-10-01T00:00:00.000Z";
  for (const scenario of ["draft", "approved", "prescriptionDraft", "prescriptionApproval", "unreviewed", "incomplete", "stale", "unauthorized"] as const) {
    const writes: { where: Record<string, unknown>; data: { shippingProfile: unknown } }[] = [];
    const audits: { data: { userId: string; metadata: unknown } }[] = [];
    let transactions = 0;
    const tx = {
      product: { findFirst: async () => ({ id: "synthetic-product", deletedAt: null, category: "Higiene", requiresPrescription: scenario.startsWith("prescription"), isPopularPharmacy: false }), updateMany: async (value: typeof writes[number]) => { writes.push(value); return { count: scenario === "stale" ? 0 : 1 }; } },
      auditLog: { create: async (value: typeof audits[number]) => { audits.push(value); } },
    };
    const fixture = { guard: scenario === "unauthorized" ? { response: new Response(null, { status: 401 }) } : { session: { user: { id: "synthetic-admin" } } }, prisma: { $transaction: async (callback: (value: typeof tx) => Promise<void>) => { transactions++; await callback(tx); } } };
    const loaded = { exports: {} as { PUT: (request: Request, context: unknown) => Promise<Response> } };
    vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process: { env: { AUTH_URL: "https://example.com" } }, Buffer, fixture });
    const profile = scenario === "approved" || scenario === "prescriptionApproval" ? { ...draft, enabled: true, transportReviewed: true, weightGrams: 500 } : scenario === "unreviewed" ? { ...draft, enabled: true } : scenario === "incomplete" ? { ...draft, enabled: true, transportReviewed: true } : draft;
    const response = await loaded.exports.PUT(new Request("https://example.com/api/admin/fretes/produtos/synthetic-product", { method: "PUT", headers: { "Content-Type": "application/json", origin: "https://example.com" }, body: JSON.stringify({ profile, updatedAt }) }), { params: Promise.resolve({ id: "synthetic-product" }) });
    assert.equal(response.status, scenario === "unauthorized" ? 401 : scenario === "stale" ? 409 : scenario === "unreviewed" || scenario === "incomplete" || scenario === "prescriptionApproval" ? 422 : 200, scenario);
    if (scenario === "unauthorized" || scenario === "unreviewed" || scenario === "incomplete") { assert.equal(transactions, 0); continue; }
    if (scenario === "prescriptionApproval") { assert.equal(transactions, 1); assert.equal(writes.length, 0); assert.equal(audits.length, 0); continue; }
    assert.equal(writes.length, 1);
    assert.equal((writes[0].where.updatedAt as Date).toISOString(), updatedAt);
    assert.deepEqual(writes[0].data.shippingProfile, scenario === "approved" ? profile : { ...profile, reference: null });
    if (scenario === "stale") { assert.equal(audits.length, 0); continue; }
    assert.equal(audits[0].data.userId, "synthetic-admin");
    assert.deepEqual(audits[0].data.metadata, writes[0].data.shippingProfile);
  }
});

test("catalog endpoints reject non-admin shipping writes and self-approved drafts before database access", async () => {
  const profile = { enabled: false, transportReviewed: false, weightGrams: 50, widthCm: 4, lengthCm: 10, heightCm: 2 };
  for (const [path, method] of [["src/app/api/produtos/route.ts", "POST"], ["src/app/api/produtos/[id]/route.ts", "PATCH"]]) {
    const result = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-catalog-shipping", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" : "export const getPrisma=()=>{throw new Error('Database must not be accessed')};" }));
    } }] });
    for (const role of [null, "CUSTOMER", "STAFF", "MANAGER", "ADMIN"]) {
      type Handler = (request: Request, context: unknown) => Promise<Response>;
      const loaded = { exports: {} as Record<string, Handler> };
      vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, console, process, Buffer, fixture: { auth: async () => role ? { user: { id: "synthetic-user", role } } : null } });
      const shippingProfile = role === "ADMIN" ? { ...profile, enabled: true, transportReviewed: true } : profile;
      const response = await loaded.exports[method](new Request("https://example.com/api/produtos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Produto sintético", price: 10, shippingProfile, expectedUpdatedAt: "2026-10-01T00:00:00.000Z" }) }), { params: Promise.resolve({ id: "synthetic-product" }) });
      assert.equal(response.status, role === "ADMIN" ? 422 : role === "MANAGER" ? 403 : 401, `${method} ${role}`);
    }
  }
});
