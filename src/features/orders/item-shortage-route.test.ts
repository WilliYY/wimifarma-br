import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

async function fixture(customer = false, role = customer ? "CUSTOMER" : "ADMIN") {
  let calls = 0;
  const bundle = await build({ entryPoints: [customer ? "src/app/api/minha-conta/pedidos/[id]/faltas/route.ts" : "src/app/api/pedidos/[id]/faltas/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "shortage-route-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/auth$|features\/orders\/item-shortage-service$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth") ? "export const auth=async()=>globalThis.fixture.session;" : args.path.endsWith("prisma") ? "export const getPrisma=()=>({$transaction:fn=>fn({})});" : "export const proposeItemShortage=globalThis.fixture.save; export const decideItemShortage=globalThis.fixture.save;" }));
  } }] });
  const loaded = { exports: {} as { POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, TextDecoder, setTimeout, clearTimeout, console, fixture: { session: { user: { id: "synthetic", role } }, save: async () => { calls++; return { status: "PROPOSED" }; } } });
  const body = customer ? { shortageId: "shortage", version: 1, decision: "ACCEPT_CREDIT", consent: true } : { orderItemId: "item", quantity: 1, expectedUpdatedAt: "2026-10-20T10:00:00Z" };
  const post = (value: unknown = body, origin: string | null = "https://example.com") => loaded.exports.POST(new Request("https://example.com/api/shortage", { method: "POST", headers: origin ? { origin } : {}, body: typeof value === "string" ? value : JSON.stringify(value) }), { params: Promise.resolve({ id: "order" }) });
  return { body, post, calls: () => calls };
}

test("proposta exige ADMIN, origem explícita, JSON limitado e rejeita valores financeiros", async () => {
  const denied = await fixture(false, "MANAGER"); assert.equal((await denied.post()).status, 403); assert.equal(denied.calls(), 0);
  const f = await fixture();
  for (const origin of [null, "https://other.example"]) assert.equal((await f.post(f.body, origin)).status, 403);
  assert.equal((await f.post({ ...f.body, cashPaidCents: 100 })).status, 422);
  assert.equal((await f.post({ ...f.body, quantity: -1 })).status, 422);
  assert.equal((await f.post("{" )).status, 422);
  assert.equal((await f.post("x".repeat(1025))).status, 413);
  assert.equal(f.calls(), 0); assert.equal((await f.post()).status, 200);
});
test("decisão exige consentimento e ignora qualquer identidade ou montante enviado por meio de rejeição strict", async () => {
  const f = await fixture(true);
  assert.equal((await f.post({ ...f.body, consent: false })).status, 422);
  assert.equal((await f.post({ ...f.body, customerId: "other" })).status, 422);
  assert.equal((await f.post({ ...f.body, amountCents: 999 })).status, 422);
  assert.equal((await f.post(f.body, null)).status, 403);
  assert.equal(f.calls(), 0); assert.equal((await f.post()).status, 200);
});
