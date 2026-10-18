import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const bundles = new Map<string, ReturnType<typeof build>>();
async function harness(role: string | null = "ADMIN", auditFails = false) {
  const calls = { read: 0, stored: 0, removed: 0, audited: 0 };
  const fixture = {
    auth: async () => role ? { user: { id: "synthetic-admin", role } } : null,
    read: async () => { calls.read++; return new Response("private", { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); },
    store: async () => { calls.stored++; return { fileName: "synthetic.webp", url: "/api/admin/fornecedores/imagens/synthetic.webp", width: 10, height: 10, sizeBytes: 40 }; },
    remove: async () => { calls.removed++; },
    audit: async () => { calls.audited++; if (auditFails) throw new Error("private database credentials"); },
  };
  async function load(entry: string) {
    if (!bundles.has(entry)) bundles.set(entry, build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "private-image-fixtures", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|private-supplier-storage$|node:fs\/promises$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=fixture.auth;"
        : args.path.endsWith("prisma") ? "export const getPrisma=()=>({auditLog:{create:fixture.audit}});"
          : args.path.endsWith("promises") ? "export const rm=fixture.remove;"
            : 'export const privateSupplierImageHeaders={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}; export const privateSupplierImagesDirectory=()=>"synthetic-private"; export const storePrivateSupplierImage=fixture.store; export const servePrivateSupplierImage=fixture.read;' }));
    } }] }));
    const loaded = { exports: {} as { GET(request: Request, context: { params: Promise<{ fileName: string }> }): Promise<Response>; POST(request: Request): Promise<Response> } };
    vm.runInNewContext((await bundles.get(entry)!).outputFiles![0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, Request, Response, File, FormData, Buffer, URL, Uint8Array, TextDecoder, setTimeout, clearTimeout, console, process: { env: { AUTH_URL: "https://example.com" } } });
    return loaded.exports;
  }
  const reader = await load("src/app/api/admin/fornecedores/imagens/[fileName]/route.ts");
  const upload = await load("src/app/api/admin/fornecedores/imagens/route.ts");
  const request = (options: { origin?: string; extra?: string; raw?: string } = {}) => {
    const form = new FormData(); form.set("image", new File(["synthetic"], "synthetic.webp", { type: "image/webp" }));
    if (options.extra) form.set("extra", options.extra);
    return new Request("https://example.com/api/admin/fornecedores/imagens", { method: "POST", body: options.raw ?? form, headers: { origin: options.origin ?? "https://example.com" } });
  };
  return { calls, request, post: upload.POST, get: () => reader.GET(new Request("https://example.com/private"), { params: Promise.resolve({ fileName: "synthetic.webp" }) }) };
}

test("private supplier image routes deny anonymous, CUSTOMER and STAFF before reading or storing", async () => {
  for (const role of [null, "CUSTOMER", "STAFF"]) {
    const h = await harness(role);
    for (const response of [await h.get(), await h.post(h.request())]) {
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    }
    assert.equal(h.calls.read + h.calls.stored + h.calls.audited, 0);
  }
});

test("ADMIN and MANAGER read private images and upload an audited private URL without public library writes", async () => {
  for (const role of ["ADMIN", "MANAGER"]) {
    const h = await harness(role);
    assert.equal((await h.get()).status, 200);
    const uploaded = await h.post(h.request());
    assert.equal(uploaded.status, 201);
    assert.equal(uploaded.headers.get("cache-control"), "private, no-store");
    assert.equal((await uploaded.json()).data.id, "");
    assert.deepEqual(h.calls, { read: 1, stored: 1, removed: 0, audited: 1 });
  }
});

test("private uploads reject cross-origin, missing origin, malformed and oversized multipart bodies before storage", async () => {
  for (const [options, status] of [[{ origin: "https://attacker.example" }, 403], [{ origin: "" }, 403], [{ raw: "invalid" }, 422], [{ extra: "x".repeat(10_485_760 + 64_001) }, 413]] as const) {
    const h = await harness();
    assert.equal((await h.post(h.request(options))).status, status);
    assert.equal(h.calls.stored, 0);
  }
});

test("an audit failure removes the just-created private file and never exposes internal errors", async () => {
  const h = await harness("ADMIN", true);
  const response = await h.post(h.request());
  assert.equal(response.status, 500);
  assert.equal(h.calls.removed, 1);
  assert.doesNotMatch(await response.text(), /database|credentials/);
});
