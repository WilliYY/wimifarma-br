import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const privateUrl = "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp";
const bundles = new Map<string, ReturnType<typeof build>>();

async function harness(current: { inventorySource: "PHARMACY" | "DISTRIBUTOR"; requiresPrescription: boolean; imageUrl: string | null }) {
  let writes = 0;
  const updatedAt = new Date("2026-10-18T12:00:00.000Z");
  const tx = { $queryRaw: async () => [], product: {
    findUnique: async () => ({ name: "Synthetic product", brand: null, ean: "7891234567895", prescriptionType: "UNREVIEWED", featuredPosition: null, ...current }),
    findFirst: async () => null,
    updateMany: async () => { writes++; return { count: 1 }; },
    create: async (args: { data: object }) => { writes++; return { ...args.data, createdAt: updatedAt, updatedAt, price: 16 }; },
    findUniqueOrThrow: async () => ({ createdAt: updatedAt, updatedAt, price: 16 }),
  }, orderItem: { findFirst: async () => null }, auditLog: { create: async () => ({}) } };
  const fixture = { db: { product: { findUnique: async () => null }, $transaction: async (run: (db: typeof tx) => unknown) => run(tx) } };
  async function load(entry: string) {
    if (!bundles.has(entry)) bundles.set(entry, build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "private-product-fixtures", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>({user:{id:'synthetic-admin',role:'ADMIN'}});" : "export const getPrisma=()=>fixture.db;" }));
    } }] }));
    const loaded = { exports: {} as { POST(request: Request): Promise<Response>; PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> } };
    vm.runInNewContext((await bundles.get(entry)!).outputFiles![0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, Request, Response, URL, Buffer, TextDecoder, Uint8Array, setTimeout, clearTimeout, console });
    return loaded.exports;
  }
  const create = await load("src/app/api/produtos/route.ts");
  const update = await load("src/app/api/produtos/[id]/route.ts");
  const request = (data: object) => new Request("https://example.com/api/produtos/synthetic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Synthetic product", ean: "7891234567895", price: 16, expectedUpdatedAt: updatedAt.toISOString(), ...data }) });
  return { writes: () => writes, create: (data: object) => create.POST(request(data)), update: (data: object) => update.PATCH(request(data), { params: Promise.resolve({ id: "synthetic" }) }) };
}

test("product create rejects private URLs for public stock or non-prescription products before writes", async () => {
  for (const [inventorySource, requiresPrescription] of [["PHARMACY", true], ["DISTRIBUTOR", false]] as const) {
    const h = await harness({ inventorySource, requiresPrescription, imageUrl: null });
    const response = await h.create({ inventorySource, requiresPrescription, imageUrl: privateUrl });
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /Fotos internas/);
    assert.equal(h.writes(), 0);
  }
});

test("product update cannot expose an existing private image by changing source or removing prescription", async () => {
  for (const patch of [{ inventorySource: "PHARMACY", requiresPrescription: true }, { requiresPrescription: false }]) {
    const h = await harness({ inventorySource: "DISTRIBUTOR", requiresPrescription: true, imageUrl: privateUrl });
    const response = await h.update(patch);
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /Fotos internas/);
    assert.equal(h.writes(), 0);
  }
});

test("prescription distributor private photos and normal public photos retain successful product saves", async () => {
  for (const [inventorySource, requiresPrescription, imageUrl] of [["DISTRIBUTOR", true, privateUrl], ["PHARMACY", false, "/uploads/products/synthetic.webp"]] as const) {
    const h = await harness({ inventorySource, requiresPrescription, imageUrl });
    assert.equal((await h.create({ inventorySource, requiresPrescription, imageUrl })).status, 201);
    assert.equal((await h.update({ requiresPrescription, imageUrl })).status, 200);
    assert.equal(h.writes(), 2);
  }
});
