import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { createRequire } from "node:module";

const version = "2026-10-19T12:00:00.000Z";
const bundles = Promise.all(["src/app/api/produtos/route.ts", "src/app/api/produtos/[id]/route.ts"].map(entry =>
  build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "photo-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=fixture.auth;" : "export const getPrisma=()=>fixture.db;" }));
  } }] })));

async function harness(existing: boolean, withPhoto = false, status = "ACTIVE", role = "ADMIN", identity: { inventorySource?: string; ean?: string } = {}) {
  const product = { id: "synthetic-product", name: "Produto sintético", brand: "Teste", ean: identity.ean ?? "7896181915638", status,
    inventorySource: identity.inventorySource ?? "DISTRIBUTOR", requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false,
    catalogClassification: { kind: "UNCLASSIFIED", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
    imageUrl: withPhoto ? "/uploads/products/photo.webp" : null, imageAssetId: withPhoto ? "asset" : null, imageUrls: [],
    price: "10.00", promotionalPrice: null, supplierMarkupBps: 6000, supplierOffers: [], createdAt: new Date(version), updatedAt: new Date(version), shippingProfile: null };
  const writes: Record<string, unknown>[] = [], audits: unknown[] = [];
  const save = ({ data }: { data: Record<string, unknown> }) => { writes.push(data); Object.assign(product, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))); return product; };
  const tx = { $queryRaw: async () => [],
    product: { findFirst: async () => null, findUnique: async () => existing ? product : null,
      create: async (input: { data: Record<string, unknown> }) => save(input), updateMany: async (input: { data: Record<string, unknown> }) => { save(input); return { count: 1 }; }, findUniqueOrThrow: async () => product },
    productImage: { findUnique: async () => ({ id: "asset", url: "/uploads/products/photo.webp" }), findFirst: async () => ({ id: "asset" }),
      findMany: async () => [{ id: "asset", url: "/uploads/products/photo.webp" }, { id: "other", url: "/uploads/products/other.webp" }] },
    auditLog: { findFirst: async () => null, create: async (input: unknown) => { audits.push(input); } },
    orderItem: { findFirst: async () => null },
  };
  const loaded = { exports: {} as { POST(request: Request): Promise<Response>; PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> } };
  vm.runInNewContext((await bundles)[existing ? 1 : 0].outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console,
    TextDecoder, Uint8Array, setTimeout, clearTimeout, fixture: { auth: async () => ({ user: { id: "synthetic-admin", role } }),
      db: { ...tx, $transaction: async (run: (db: typeof tx) => unknown) => run(tx) } },
  });
  return { product, writes, audits, run: (changes: Record<string, unknown>) => {
    const body = { name: product.name, brand: product.brand, ean: product.ean, price: 10, status: "ACTIVE",
      ...(existing ? { expectedUpdatedAt: version } : { inventorySource: product.inventorySource }), ...changes };
    const request = new Request("https://store.example/api/produtos", { method: existing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return existing ? loaded.exports.PATCH(request, { params: Promise.resolve({ id: product.id }) }) : loaded.exports.POST(request);
  } };
}

test("product API creation rejects active distributor without a reviewed library photo", async () => {
  const f = await harness(false);
  assert.equal((await f.run({})).status, 422);
  assert.equal(f.writes.length, 0);
  assert.equal((await f.run({ imageAssetId: "asset" })).status, 201);
  assert.equal(f.writes.length, 1);
  assert.match(JSON.stringify(f.audits), /imageAssetId/);
});

test("MANAGER cannot append another product photo while retaining the cover", async () => {
  const f = await harness(true, true, "ACTIVE", "MANAGER");
  assert.equal((await f.run({ imageAssetId: "asset", imageUrls: ["/uploads/products/other.webp"] })).status, 403);
  assert.equal(f.writes.length, 0);
});

test("incidental ADMIN price saves do not approve a photo and identity changes need new selection", async () => {
  const f = await harness(true, true);
  assert.equal((await f.run({ imageAssetId: "asset", price: 12 })).status, 200);
  assert.equal(JSON.stringify(f.audits).includes('photoReview'), false);
  assert.equal((await f.run({ name: "Outra apresentação 30 ml", imageAssetId: "asset" })).status, 403);
  assert.equal((await f.run({ name: "Outra apresentação 30 ml", imageAssetId: "asset", photoReviewConfirmed: true })).status, 200);
  assert.equal(JSON.stringify(f.audits).includes('photoReview'), true);
});

test("product API prevents photo removal unless drafted, including omitted inventorySource", async () => {
  const f = await harness(true, true);
  assert.equal((await f.run({ imageAssetId: null, imageUrl: null })).status, 422);
  assert.equal(f.writes.length, 0);
  assert.equal((await f.run({ imageAssetId: null, imageUrl: null, status: "DRAFT" })).status, 200);
});

test("product API keeps legacy active price edits and blocks draft activation without a photo", async () => {
  const active = await harness(true);
  assert.equal((await active.run({ price: 12 })).status, 200);
  const draft = await harness(true, false, "DRAFT");
  assert.equal((await draft.run({})).status, 422);
  assert.equal(draft.writes.length, 0);
});

test("novo produto físico aceita EAN válido ou ausente e recusa EAN inválido", async () => {
  for (const ean of ["12345", "00000000", "00000000000000"]) {
    const invalid = await harness(false, false, "ACTIVE", "ADMIN", { inventorySource: "PHARMACY" });
    assert.equal((await invalid.run({ ean })).status, 422);
    assert.equal(invalid.writes.length, 0);
  }
  for (const ean of [undefined, "", "7896181915638"]) {
    const valid = await harness(false, false, "ACTIVE", "ADMIN", { inventorySource: "PHARMACY" });
    assert.equal((await valid.run({ ean })).status, 201);
    assert.equal(valid.writes.length, 1);
  }
});

test("edição preserva EAN legado inalterado/omitido e recusa novo EAN inválido", async () => {
  for (const changes of [{ ean: "LEGADO" }, { ean: undefined }]) {
    const legacy = await harness(true, true, "ACTIVE", "ADMIN", { inventorySource: "PHARMACY", ean: "LEGADO" });
    assert.equal((await legacy.run(changes)).status, 200);
    assert.equal(legacy.writes[0].ean, "LEGADO");
    assert.equal(legacy.writes[0].eanNormalized, null);
  }
  for (const ean of ["12345", "00000000", "00000000000000"]) {
    const invalid = await harness(true, true, "ACTIVE", "ADMIN", { inventorySource: "PHARMACY" });
    assert.equal((await invalid.run({ ean })).status, 422);
    assert.equal(invalid.writes.length, 0);
  }
  const cleared = await harness(true, true, "ACTIVE", "ADMIN", { inventorySource: "PHARMACY", ean: "LEGADO" });
  assert.equal((await cleared.run({ ean: "" })).status, 200);
  assert.equal(cleared.writes[0].ean, null);
});

test("EAN omitido do distribuidor mantém identidade e a exclusão continua bloqueada", async () => {
  const preserved = await harness(true, true);
  preserved.product.requiresPrescription = true;
  preserved.product.prescriptionType = "ORDINARY";
  preserved.product.catalogClassification = { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: false };
  assert.equal((await preserved.run({ ean: undefined, price: 12, requiresPrescription: true })).status, 200);
  assert.equal(preserved.writes[0].ean, "7896181915638");
  assert.equal(preserved.writes[0].eanNormalized, "07896181915638");
  assert.equal((preserved.writes[0].catalogClassification as { medicineClass: string }).medicineClass, "GENERIC");
  assert.equal(preserved.writes[0].prescriptionType, "ORDINARY");
  const cleared = await harness(true, true);
  assert.equal((await cleared.run({ ean: "" })).status, 422);
  assert.equal(cleared.writes.length, 0);
  for (const ean of ["LEGADO", "00000000"]) {
    const sourceChanged = await harness(true, true, "ACTIVE", "ADMIN", { inventorySource: "PHARMACY", ean });
    assert.equal((await sourceChanged.run({ inventorySource: "DISTRIBUTOR", ean: undefined })).status, 422);
    assert.equal(sourceChanged.writes.length, 0);
  }
});
