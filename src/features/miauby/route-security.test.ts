import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

async function harness(blockProvider = false, failProvider = false) {
  let calls = 0, reads = 0, now = 1_800_000_000_000;
  let release!: () => void, called!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { called = resolve; });
  const bundle = await build({ entryPoints: ["src/app/api/miauby/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-prisma", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>globalThis.fixture.prisma;" }));
  } }] });
  const loaded = { exports: {} as { POST(request: Request): Promise<Response> } };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, Headers, AbortSignal, URL, TextDecoder, TextEncoder, Uint8Array, Buffer, setTimeout, clearTimeout, Date: Clock, console: { error() {} }, process: { env: { GEMINI_API_KEY: "synthetic-only", AUTH_URL: "https://example.com" } }, fixture: { prisma: { product: { findMany: async () => { reads++; return []; } } } }, fetch: async () => {
    calls++; called(); if (blockProvider) await blocked;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Veja nossos sabonetes no catálogo." }] } }] }), { status: failProvider ? 503 : 200 });
  } });
  const request = (ip = "192.0.2.1", extra: Record<string, unknown> = {}, origin = "https://example.com") => new Request("https://example.com/api/miauby", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip, origin }, body: JSON.stringify({ message: "Quais marcas de sabonete vocês têm?", ...extra }) });
  return { post: loaded.exports.POST, request, started, release, calls: () => calls, reads: () => reads, advance: (ms: number) => { now += ms; } };
}

test("Miauby recusa origem estrangeira e JSON excessivo antes de catálogo/IA", async () => {
  const h = await harness();
  assert.equal((await h.post(h.request("192.0.2.1", {}, "https://outside.invalid"))).status, 403);
  assert.equal((await h.post(h.request("192.0.2.1", { padding: "x".repeat(64_001) }))).status, 422);
  assert.equal(h.calls(), 0); assert.equal(h.reads(), 0);
});

test("Miauby limita o mesmo IP no handler e recupera após a janela", async () => {
  const h = await harness();
  for (let i = 0; i < 10; i++) assert.equal((await h.post(h.request())).status, 200);
  const limited = await h.post(h.request());
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(h.calls(), 10); assert.equal(h.reads(), 10);
  h.advance(60_001);
  assert.equal((await h.post(h.request())).status, 200);
});

test("cota global evita chamadas pagas ilimitadas mesmo trocando IP", async () => {
  const h = await harness();
  for (let i = 0; i < 61; i++) {
    const response = await h.post(h.request(`192.0.2.${i + 1}`));
    assert.equal(response.status, 200);
    if (i === 60) assert.equal((await response.json()).source, "fallback");
  }
  assert.equal(h.calls(), 60);
});

test("IA limita concorrência e libera slots depois de concluir", async () => {
  const h = await harness(true);
  const pending = Array.from({ length: 4 }, (_, i) => h.post(h.request(`192.0.2.${i + 1}`)));
  await h.started;
  const extra = h.post(h.request("192.0.2.50"));
  // Always release the synthetic provider, including when the regression fails.
  await new Promise(resolve => setTimeout(resolve, 20));
  h.release();
  const excess = await extra;
  assert.equal((await excess.json()).source, "fallback"); assert.equal(h.calls(), 4);
  await Promise.all(pending);
  assert.equal((await h.post(h.request("192.0.2.51"))).status, 200); assert.equal(h.calls(), 5);
});

test("falhas repetidas do provedor abrem pausa e preservam atendimento local", async () => {
  const h = await harness(false, true);
  for (let i = 0; i < 4; i++) assert.equal((await (await h.post(h.request())).json()).source, "fallback");
  assert.equal(h.calls(), 3);
  h.advance(60_001); await h.post(h.request()); assert.equal(h.calls(), 4);
});

test("cota diária da IA permanece entre janelas e volta após 24 horas", async () => {
  const h = await harness();
  for (let minute = 0; minute < 9; minute++) {
    if (minute) h.advance(60_001);
    for (let i = 0; i < 60; i++) await h.post(h.request(`2001:db8::${(minute * 60 + i + 1).toString(16)}`));
  }
  assert.equal(h.calls(), 500);
  h.advance(86_400_001);
  await h.post(h.request()); assert.equal(h.calls(), 501);
});

test("limite global também contém consultas de catálogo distribuídas", async () => {
  const h = await harness();
  for (let i = 0; i < 120; i++) assert.equal((await h.post(h.request(`2001:db8::${(i + 1).toString(16)}`))).status, 200);
  assert.equal((await h.post(h.request("2001:db8::ffff"))).status, 429);
  assert.equal(h.reads(), 120); assert.equal(h.calls(), 60);
});
