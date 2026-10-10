import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

async function harness(authorized = true) {
  let processed = 0, written = 0;
  const bundle = await build({ entryPoints: ["src/app/api/admin/uploads/produtos/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-upload", setup(builder) {
    builder.onResolve({ filter: /(?:lib\/prisma|auth\/permissions|product-images\/service|node:fs\/promises)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions") ? "export const requireAdminApi=globalThis.fixture.guard;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" : args.path.endsWith("promises") ? "export const mkdir=async()=>{}; export const rm=async()=>{}; export const writeFile=globalThis.fixture.write;" : 'export const MAX_PRODUCT_IMAGE_BYTES=10485760; export const ACCEPTED_PRODUCT_IMAGE_TYPES=new Set(["image/webp"]); export class ProductImageError extends Error {} export const processProductImage=globalThis.fixture.process;' }));
  } }] });
  const loaded = { exports: {} as { POST(request: Request): Promise<Response> } };
  const tx = { productImage: { create: async () => ({ id: "synthetic-image", createdAt: new Date(), height: 1, width: 1, sizeBytes: 4, url: "/uploads/products/synthetic.webp" }) }, auditLog: { create: async () => ({}) } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, File, FormData, TextDecoder, Uint8Array, Buffer, setTimeout, clearTimeout, console, process: { cwd: () => "synthetic-no-disk" }, fixture: { guard: async () => authorized ? { session: { user: { id: "synthetic-admin" } } } : { response: new Response(null, { status: 401 }) }, prisma: { $transaction: async (fn: (transaction: typeof tx) => unknown) => fn(tx) }, process: async () => { processed++; return { buffer: Buffer.from("test"), height: 1, width: 1, sizeBytes: 4 }; }, write: async () => { written++; } } });
  const request = (extra = "") => { const form = new FormData(); form.set("image", new File(["test"], "test.webp", { type: "image/webp" })); if (extra) form.set("extra", extra); return new Request("https://example.com/api/admin/uploads/produtos", { method: "POST", body: form }); };
  return { post: loaded.exports.POST, request, processed: () => processed, written: () => written };
}

test("upload rejeita corpo multipart agregado excessivo mesmo com arquivo pequeno e sem Content-Length", async () => {
  const h = await harness();
  const response = await h.post(h.request("x".repeat(10_485_760 + 64_001)));
  assert.equal(response.status, 413); assert.equal(h.processed(), 0); assert.equal(h.written(), 0);
});

test("upload mantém arquivo autorizado e exige sessão antes de consumir o corpo", async () => {
  const denied = await harness(false);
  assert.equal((await denied.post(denied.request())).status, 401); assert.equal(denied.processed(), 0);
  const h = await harness();
  assert.equal((await h.post(h.request())).status, 201); assert.equal(h.processed(), 1); assert.equal(h.written(), 1);
});
