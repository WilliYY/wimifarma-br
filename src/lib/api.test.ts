import assert from "node:assert/strict";
import test from "node:test";
import * as api from "./api";

test("JSON comum mantém o contrato e recusa corpo maior mesmo sem Content-Length", async () => {
  const request = (body: string, headers = {}) => new Request("https://example.com/api", { method: "POST", body, headers });
  assert.deepEqual(await api.readJsonBody(request('{"name":"Produto"}')), { name: "Produto" });
  assert.equal(await api.readJsonBody(request("invalid")), null);
  assert.equal(await api.readJsonBody(request(JSON.stringify({ padding: "x".repeat(64_001) }))), null);
});

test("limite é contado em bytes UTF-8 e não confia no tamanho declarado", async () => {
  const body = JSON.stringify({ padding: "á".repeat(40_000) });
  assert.equal(await api.readJsonBody(new Request("https://example.com", { method: "POST", headers: { "Content-Length": "1" }, body })), null);
});

test("leitura limitada encerra stream no primeiro excesso e rejeita tamanho declarado grande", async () => {
  assert.equal(typeof api.readLimitedBody, "function");
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(5)); },
    cancel() { canceled = true; },
  });
  const request = new Request("https://example.com", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(api.readLimitedBody(request, { maxBytes: 4 }), (error: unknown) => error instanceof api.RequestBodyError && error.status === 413);
  assert.equal(canceled, true);
  await assert.rejects(api.readLimitedBody(new Request("https://example.com", { method: "POST", body: "ok", headers: { "Content-Length": "100" } }), { maxBytes: 4 }), (error: unknown) => error instanceof api.RequestBodyError && error.status === 413);
});

test("stream interrompido pelo cliente e stream lento não retêm leitor indefinidamente", async () => {
  assert.equal(typeof api.readLimitedBody, "function");
  let canceled = false;
  const stalled = new ReadableStream<Uint8Array>({ cancel() { canceled = true; } });
  await assert.rejects(api.readLimitedBody(new Request("https://example.com", { method: "POST", body: stalled, duplex: "half" } as RequestInit), { maxBytes: 100, timeoutMs: 20 }), (error: unknown) => error instanceof api.RequestBodyError && error.status === 408);
  assert.equal(canceled, true);
  const broken = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("synthetic-disconnect")); } });
  assert.equal(await api.readJsonBody(new Request("https://example.com", { method: "POST", body: broken, duplex: "half" } as RequestInit)), null);
});

test("JSON não aceita UTF-8 inválido nem conteúdo comprimido sem limite de expansão", async () => {
  assert.equal(await api.readJsonBody(new Request("https://example.com", { method: "POST", body: new Uint8Array([123, 34, 97, 34, 58, 34, 255, 34, 125]) })), null);
  assert.equal(await api.readJsonBody(new Request("https://example.com", { method: "POST", body: "{}", headers: { "Content-Encoding": "gzip" } })), null);
});
