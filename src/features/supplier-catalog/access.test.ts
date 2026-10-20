import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

// Synthetic fixtures only. Authentication and persistence cannot reach live services.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
const bundle = build({ entryPoints: ["src/app/api/admin/fornecedores/ofertas/route.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", plugins: [{ name: "supplier-access-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
      ? "export const auth=fixture.auth;" : "export const getPrisma=()=>fixture.prisma;" }));
  } }] });

function input(extra: Data = {}) {
  const observedAt = new Date(Date.now() - 60_000);
  return { supplier: "ANB", productId: "synthetic-product", externalCode: "synthetic-sku", eanNormalized: "7891234567895",
    unitCostCents: 200, available: true, allocationQuantity: 5, observedAt: observedAt.toISOString(),
    validUntil: new Date(observedAt.getTime() + 86_400_000).toISOString(), ...extra };
}

async function harness(options: { role?: string | null; actor?: boolean; product?: Data | null; previous?: Data | null; openOrder?: boolean; fail?: boolean } = {}) {
  const calls = { database: 0, writes: [] as Data[], audits: [] as Data[], events: [] as string[] };
  const touch = () => { calls.database++; if (options.fail) throw new Error("private database credentials and supplier costs"); };
  const tx = {
    $queryRaw: async () => { touch(); calls.events.push("lock"); return []; },
    user: { findFirst: async () => { calls.events.push("actor"); return options.actor === false ? null : { id: "synthetic-admin" }; } },
    product: { findUnique: async () => { calls.events.push("product"); return options.product === undefined
      ? { id: "synthetic-product", ean: "7891234567895", inventorySource: "DISTRIBUTOR" } : options.product; } },
    orderItem: { findFirst: async () => options.openOrder ? { id: "synthetic-item" } : null },
    supplierCatalogOffer: {
      findUnique: async () => options.previous ?? null,
      upsert: async (args: Data) => { calls.writes.push(args); return { id: "synthetic-offer", revision: 2, ...args.create }; },
    },
    auditLog: { create: async (args: Data) => { calls.audits.push(args); return {}; } },
  };
  const fixture = {
    auth: async () => options.role === null ? null : { user: { id: "synthetic-admin", role: options.role ?? "ADMIN" } },
    prisma: { $transaction: async (callback: (db: typeof tx) => unknown) => { touch(); return callback(tx); },
      supplierCatalogOffer: { findMany: async () => { touch(); return [{ id: "synthetic-offer", unitCostCents: 200 }]; } } },
  };
  const loaded = { exports: {} as Record<string, (request: Request) => Promise<Response>> };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports,
    require: createRequire(import.meta.url), fixture, URL, Request, Response, Date, Buffer, TextDecoder, Uint8Array,
    process: { env: { AUTH_URL: "https://example.com" } }, console });
  return { calls, run: (method: "GET" | "POST", body: unknown = input(), extra: { raw?: string; headers?: Record<string, string>; query?: string } = {}) => {
    const headers = { origin: "https://example.com", "content-type": "application/json", ...extra.headers };
    return loaded.exports[method](new Request(`https://example.com/api/admin/fornecedores/ofertas${extra.query ?? "?productId=synthetic-product"}`,
      { method, headers, ...(method === "POST" ? { body: extra.raw ?? JSON.stringify(body) } : {}) }));
  } };
}

test("supplier offers deny anonymous, CUSTOMER, STAFF and MANAGER before database access", async () => {
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) for (const method of ["GET", "POST"] as const) {
    const f = await harness({ role });
    assert.equal((await f.run(method)).status, 401);
    assert.equal(f.calls.database, 0);
  }
});

test("ADMIN offer reads are private, validate product and sanitize database failures", async () => {
  const f = await harness();
  for (const query of ["", "?productId=", `?productId=${"x".repeat(101)}`]) assert.equal((await f.run("GET", undefined, { query })).status, 422);
  assert.equal(f.calls.database, 0);
  const response = await f.run("GET");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal((await response.json()).data[0].unitCostCents, 200);
  const failure = await (await harness({ fail: true })).run("GET");
  assert.equal(failure.status, 503);
  assert.match(failure.headers.get("cache-control") ?? "", /private, no-store/);
  assert.doesNotMatch(await failure.text(), /private database|credentials|supplier costs/);
});

test("offer POST rejects cross-origin, missing origin, non-JSON, malformed and oversized bodies before persistence", async () => {
  for (const [extra, status] of [
    [{ headers: { origin: "https://attacker.example" } }, 403], [{ headers: { origin: "" } }, 403],
    [{ headers: { "content-type": "text/plain" } }, 415], [{ raw: "{" }, 400], [{ raw: " ".repeat(8193) }, 413],
  ] as const) {
    const f = await harness();
    assert.equal((await f.run("POST", input(), extra)).status, status);
    assert.equal(f.calls.database, 0);
  }
});

test("offer POST requires a valid GTIN, integer positive cost and observed validity within 24 hours", async () => {
  const now = Date.now();
  for (const patch of [
    { eanNormalized: "7891234567890" }, { eanNormalized: "invalid" }, { unitCostCents: 0 }, { unitCostCents: 2.5 },
    { allocationQuantity: 6 }, { observedAt: new Date(now + 60_000).toISOString() },
    { observedAt: new Date(now - 2000).toISOString(), validUntil: new Date(now - 1000).toISOString() },
    { observedAt: new Date(now - 1000).toISOString(), validUntil: new Date(now + 86_400_000).toISOString() },
  ]) {
    const f = await harness();
    assert.equal((await f.run("POST", input(patch))).status, 422, JSON.stringify(patch));
    assert.equal(f.calls.database, 0);
  }
});

test("offer POST rechecks actor after lock and refuses a revoked ADMIN without writes", async () => {
  const f = await harness({ actor: false });
  assert.equal((await f.run("POST")).status, 403);
  assert.deepEqual(f.calls.events, ["lock", "actor"]);
  assert.equal(f.calls.writes.length, 0);
  assert.equal(f.calls.audits.length, 0);
});

test("ADMIN can persist only the three approved commercial pilot suppliers", async () => {
  for (const supplier of ["ANB", "PROFARMA", "DM"]) {
    const f = await harness();
    assert.equal((await f.run("POST", input({ supplier }))).status, 200, supplier);
    assert.equal(f.calls.writes[0].create.supplier, supplier);
    assert.equal(f.calls.writes[0].create.eanNormalized, "07891234567895");
    assert.equal(f.calls.writes[0].where.productId_supplier.supplier, supplier);
    assert.equal(f.calls.audits[0].data.metadata.supplier, supplier);
  }
});

test("reference-only supplier codes and non-ADMIN writes never reach persistence", async () => {
  for (const supplier of ["GAM", "SANTA_CRUZ", "OTHER", "gam", "", "GAM "]) {
    const f = await harness();
    assert.equal((await f.run("POST", input({ supplier }))).status, 422, supplier);
    assert.equal(f.calls.database, 0);
  }
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER"]) {
    const f = await harness({ role });
    assert.equal((await f.run("POST", input({ supplier: "ANB" }))).status, 401);
    assert.equal(f.calls.database, 0);
  }
});

test("offer POST requires an existing distributor product with the same GTIN", async () => {
  for (const product of [null, { id: "synthetic-product", inventorySource: "PHARMACY", ean: "7891234567895" },
    { id: "synthetic-product", inventorySource: "DISTRIBUTOR", ean: "4006381333931" }]) {
    const f = await harness({ product });
    assert.equal((await f.run("POST")).status, 422);
    assert.equal(f.calls.writes.length, 0);
    assert.equal(f.calls.audits.length, 0);
  }
});

test("offer POST persists 200 cents and canonical GTIN with an audit and no implicit allocation reset", async () => {
  const f = await harness();
  const response = await f.run("POST");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal(f.calls.writes.length, 1);
  const saved = f.calls.writes[0];
  assert.equal(saved.create.unitCostCents, 200);
  assert.equal(saved.create.eanNormalized, "07891234567895");
  assert.equal(saved.update.committedQuantity, undefined);
  assert.equal(f.calls.audits.length, 1);
  assert.equal(f.calls.audits[0].data.userId, "synthetic-admin");
});

test("offer POST refuses stale observations and supplier identity changes with open orders", async () => {
  const previous = { id: "synthetic-offer", eanNormalized: "07891234567895", externalCode: "synthetic-sku", observedAt: new Date(Date.now() - 30_000), committedQuantity: 1 };
  const stale = await harness({ previous });
  assert.equal((await stale.run("POST")).status, 409);
  assert.equal(stale.calls.writes.length, 0);
  const identity = await harness({ previous: { ...previous, observedAt: new Date(Date.now() - 120_000) }, openOrder: true });
  assert.equal((await identity.run("POST", input({ externalCode: "changed-sku" }))).status, 409);
  assert.equal(identity.calls.writes.length, 0);
  assert.equal(identity.calls.audits.length, 0);
});
