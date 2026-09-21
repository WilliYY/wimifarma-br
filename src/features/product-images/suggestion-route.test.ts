import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

type Handler = (request: Request) => Promise<Response>;

async function routeHarness(authorized = true, blocked?: Promise<void>) {
  let providerCalls = 0;
  const bundle = await build({
    entryPoints: ["src/app/api/admin/imagens-produtos/sugestoes/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "isolated-services", setup(builder) {
      builder.onResolve({ filter: /features\/(auth\/permissions|product-images\/(suggestions|service))$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions")
        ? "export const requireAdminApi = globalThis.fixture.guard;"
        : args.path.endsWith("suggestions") ? "export const analyzeProductPhoto = globalThis.fixture.provider; export const generateProductArtwork = globalThis.fixture.provider;"
          : 'export const MAX_PRODUCT_IMAGE_BYTES=10485760; export const ACCEPTED_PRODUCT_IMAGE_TYPES=new Set(["image/webp"]); export class ProductImageError extends Error {}' }));
    } }],
  });
  const loaded = { exports: {} as { POST: Handler } };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), process: { env: { GEMINI_API_KEY: "test" } },
    Buffer, Request, Response, File, console,
    fixture: { guard: async () => authorized ? { session: { user: { id: "isolated-admin" } } } : { response: new Response("Unauthorized", { status: 401 }) },
      provider: async () => { providerCalls++; await blocked; return { candidates: [], analysis: { name: "fixture" } }; } },
  });
  return { post: loaded.exports.POST, calls: () => providerCalls };
}

function request(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: "KitKat", brand: "KitKat", ean: "", action: "analyze", ...overrides })) form.set(key, value);
  form.set("image", new File(["fixture"], "fixture.webp", { type: "image/webp" }));
  return new Request("https://example.com/api/admin/imagens-produtos/sugestoes", { method: "POST", body: form });
}

test("API de fotos exige sessao administrativa antes de chamar IA", async () => {
  const fixture = await routeHarness(false);
  assert.equal((await fixture.post(request())).status, 401);
  assert.equal(fixture.calls(), 0);
});

test("API valida EAN, acao e limite real do corpo sem Content-Length", async () => {
  const fixture = await routeHarness();
  assert.equal((await fixture.post(request({ ean: "123" }))).status, 422);
  assert.equal((await fixture.post(request({ action: "anything" }))).status, 422);
  const oversized = new Request("https://example.com/api", { method: "POST", body: new Uint8Array(10485760 + 64001) });
  assert.equal((await fixture.post(oversized)).status, 413);
  assert.equal(fixture.calls(), 0);
});

test("API retorna previa sem cache e limita consumo por administrador", async () => {
  const fixture = await routeHarness();
  for (let i = 0; i < 4; i++) {
    const result = await fixture.post(request());
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
  }
  assert.equal((await fixture.post(request())).status, 429);
  assert.equal(fixture.calls(), 4);
});

test("API recusa links internos e quantidade excessiva de referencias", async () => {
  const fixture = await routeHarness();
  assert.equal((await fixture.post(request({ referenceUrls: '["https://127.0.0.1/a"]' }))).status, 422);
  assert.equal((await fixture.post(request({ referenceUrls: JSON.stringify(Array(4).fill("https://example.com/item")) }))).status, 422);
  assert.equal(fixture.calls(), 0);
});

test("API bloqueia requisicoes simultaneas do mesmo administrador", async () => {
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const fixture = await routeHarness(true, blocked);
  const first = fixture.post(request());
  await new Promise(resolve => setTimeout(resolve, 20));
  const second = await fixture.post(request());
  release();
  assert.equal(second.status, 429);
  assert.equal((await first).status, 200);
  assert.equal(fixture.calls(), 1);
});
