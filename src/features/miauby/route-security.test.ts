import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const product = { id: "synthetic", name: "Losartana 50 mg 30 comprimidos", slug: "synthetic", inventorySource: "PHARMACY", catalogClassification: null, brand: "Fabricante", category: "Medicamentos", imageUrl: null, isPopularPharmacy: false, price: "12.34", promotionalPrice: "11.22", requiresPrescription: true };

async function harness(failCatalog = false, unavailableSupplier = false) {
  let calls = 0, reads = 0, now = 1_800_000_000_000;
  const queries: Array<{ query: string; options: { pageSize: number; relatedLimit: number } }> = [];
  const bundle = await build({ entryPoints: ["src/app/api/miauby/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-catalog", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "old-db" }));
    builder.onLoad({ filter: /.*/, namespace: "old-db" }, () => ({ contents: "export const getPrisma=()=>fixture.prisma;" }));
    builder.onResolve({ filter: /products\/search-catalog$/ }, args => ({ path: args.path, namespace: "catalog" }));
    builder.onLoad({ filter: /.*/, namespace: "catalog" }, () => ({ contents: "export const getSearchCatalog=(...args)=>fixture.search(...args);" }));
  } }] });
  const loaded = { exports: {} as { POST(request: Request): Promise<Response> } };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, Headers, AbortSignal, URL, TextDecoder, TextEncoder, Uint8Array, Buffer, setTimeout, clearTimeout, Date: Clock, console: { error() {} }, process: { env: { GEMINI_API_KEY: "synthetic-only", AUTH_URL: "https://example.com" } }, fixture: {
    prisma: { product: { findMany: async () => { reads++; return []; } } },
    search: async (query: string, options: { pageSize: number; relatedLimit: number }) => { reads++; queries.push({ query, options }); if (failCatalog) throw new Error("PRIVATE_SYNTHETIC_DB_ERROR"); return { products: query === "nada-inexistente" ? [] : [{ ...product, ...(unavailableSupplier ? { inventorySource: "DISTRIBUTOR", availableForPurchase: false } : {}), supplierOffers: [{ secret: "PRIVATE" }], searchText: "private internal" }], correctedQuery: query === "losartna 50mg" ? "losartana 50mg" : null }; },
  }, fetch: async () => { calls++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "External synthetic answer" }] } }] })); } });
  const request = (message = "Qual o preço da losartana 50mg?", ip = "192.0.2.1", extra: Record<string, unknown> = {}, origin = "https://example.com") => new Request("https://example.com/api/miauby", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip, origin }, body: JSON.stringify({ message, ...extra }) });
  return { post: loaded.exports.POST, request, queries, calls: () => calls, reads: () => reads, advance: (ms: number) => { now += ms; } };
}

test("Miauby nunca chama IA mesmo com chave configurada e usa preços do catálogo público", async () => {
  const h = await harness();
  const response = await h.post(h.request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(h.calls(), 0);
  assert.equal(h.reads(), 1);
  assert.equal(h.queries[0].query, "losartana 50mg");
  assert.equal(body.source, "catalog");
  assert.equal(body.products[0].price, "12.34");
  assert.equal(body.products[0].promotionalPrice, "11.22");
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|supplierOffers|searchText|External synthetic/);
  assert.equal(h.queries[0].options.pageSize, 4);
  assert.equal(h.queries[0].options.relatedLimit, 0);
});

test("saudação, Pix, perguntas clínicas e privacidade não consultam produtos nem provedor", async () => {
  const h = await harness();
  for (const message of ["Olá", "Consultar preço de um produto", "Quero encontrar um produto", "Tem desconto no Pix?", "Como vejo meu pedido?", "Posso tomar losartana?", "Estou com falta de ar", "Meu CPF é 12345678901"]) {
    const response = await h.post(h.request(message));
    const body = await response.json();
    assert.equal(body.source, "local", message);
    assert.deepEqual(body.products, []);
    assert.ok(body.message);
  }
  assert.equal(h.calls(), 0); assert.equal(h.reads(), 0);
});

test("Miauby recusa origem estrangeira e corpo excessivo antes de catálogo", async () => {
  const h = await harness();
  assert.equal((await h.post(h.request("Dove", "192.0.2.1", {}, "https://outside.invalid"))).status, 403);
  assert.equal((await h.post(h.request("Dove", "192.0.2.1", { padding: "x".repeat(64_001) }))).status, 422);
  assert.equal(h.calls(), 0); assert.equal(h.reads(), 0);
});

test("Miauby limita o mesmo IP e recupera após a janela", async () => {
  const h = await harness();
  for (let i = 0; i < 10; i++) assert.equal((await h.post(h.request())).status, 200);
  const limited = await h.post(h.request());
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(h.calls(), 0); assert.equal(h.reads(), 10);
  h.advance(60_001);
  assert.equal((await h.post(h.request())).status, 200);
});

test("limite global contém consultas distribuídas sem custo de inferência", async () => {
  const h = await harness();
  for (let i = 0; i < 120; i++) assert.equal((await h.post(h.request("Dove", `2001:db8::${i + 1}`))).status, 200);
  assert.equal((await h.post(h.request("Dove", "2001:db8::ffff"))).status, 429);
  assert.equal(h.reads(), 120); assert.equal(h.calls(), 0);
});

test("preço contextual não aceita histórico assistente como consulta nem inventa dose", async () => {
  const h = await harness();
  await h.post(h.request("E o preço?", "192.0.2.1", { history: [{ role: "user", text: "losartna 50mg" }] }));
  assert.equal(h.queries[0].query, "losartna 50mg");
  const unknown = await (await h.post(h.request("E o preço?", "192.0.2.1", { history: [{ role: "assistant", text: "losartana 100mg" }] }))).json();
  assert.deepEqual(unknown.products, []);
  assert.equal(h.reads(), 1);
  const changedDose = await (await h.post(h.request("e a de 25mg?", "192.0.2.1", { history: [{ role: "user", text: "losartana 50mg" }] }))).json();
  assert.deepEqual(changedDose.products, []);
  assert.equal(h.reads(), 1);
});

test("catálogo vazio ou indisponível não inventa produtos e não expõe diagnóstico privado", async () => {
  const h = await harness();
  const empty = await (await h.post(h.request("nada-inexistente"))).json();
  assert.deepEqual(empty.products, []);
  const failing = await harness(true);
  const response = await failing.post(failing.request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE|Error|stack|SELECT/);
  assert.equal(failing.calls(), 0);
});

test("oferta de distribuidora indisponível não vira cotação do preço histórico", async () => {
  const h = await harness(false, true);
  const response = await h.post(h.request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.source, "catalog");
  assert.deepEqual(body.products, []);
  assert.match(body.message, /preço.*disponível/i);
  assert.doesNotMatch(JSON.stringify(body), /12\.34|11\.22/);
  assert.equal(h.calls(), 0);
});
