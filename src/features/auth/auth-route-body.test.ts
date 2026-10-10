import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { NextRequest } from "next/server";
import { build } from "esbuild";

async function harness() {
  const received: { url: string; cookie: string | null; type: string | null; body: string; nextUrl: string }[] = [];
  const bundle = await build({ entryPoints: ["src/app/api/auth/[...nextauth]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-auth-handler", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const handlers=globalThis.fixture.handlers;" }));
  } }] });
  const loaded = { exports: {} as { POST(request: NextRequest): Promise<Response>; GET(request: NextRequest): Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, Headers, Uint8Array, TextDecoder, setTimeout, clearTimeout, fixture: { handlers: {
    GET: async () => new Response("synthetic-get"),
    POST: async (request: NextRequest) => { received.push({ url: request.url, nextUrl: request.nextUrl.href, cookie: request.headers.get("cookie"), type: request.headers.get("content-type"), body: await request.text() }); return new Response("synthetic-post", { headers: { "Set-Cookie": "synthetic=1; HttpOnly; Secure; SameSite=Lax" } }); },
  } } });
  return { ...loaded.exports, received };
}

test("Auth.js rejeita POST excessivo antes de processar login ou callbacks", async () => {
  const h = await harness();
  const result = await h.POST(new NextRequest("https://example.com/api/auth/callback/credentials", { method: "POST", body: "x".repeat(64_001) }));
  assert.equal(result.status, 413); assert.equal(h.received.length, 0);
});

test("Auth.js preserva formulários, URL, cookies e resposta do provedor", async () => {
  const h = await harness();
  const body = new URLSearchParams({ csrfToken: "synthetic", callbackUrl: "/minha-conta", email: "synthetic@example.com", password: "synthetic-only" }).toString();
  const url = "https://example.com/api/auth/callback/credentials?json=true";
  const response = await h.POST(new NextRequest(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie: "synthetic-csrf=value" }, body }));
  assert.equal(response.status, 200); assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
  assert.deepEqual(JSON.parse(JSON.stringify(h.received)), [{ url, nextUrl: url, cookie: "synthetic-csrf=value", type: "application/x-www-form-urlencoded", body }]);
  assert.equal(await (await h.GET(new NextRequest("https://example.com/api/auth/session"))).text(), "synthetic-get");
});
