import assert from "node:assert/strict";
import test from "node:test";
import { shippingBody, shippingFailure } from "./http";
import { ShippingError } from "./schema";

function request(body: BodyInit | null, headers: Record<string, string> = {}) {
  const origin = new URL(process.env.AUTH_URL || "https://shipping.example.invalid").origin;
  return new Request(`${origin}/api/fretes/cotacao`, { method: "POST", body,
    headers: { origin, "content-type": "application/json", ...headers }, duplex: "half" } as RequestInit);
}

test("shipping counts UTF-8 bytes, accepts the exact limit and rejects one byte above", async () => {
  const body = JSON.stringify({ value: "á".repeat(15994) });
  assert.equal(Buffer.byteLength(body), 32000);
  assert.deepEqual(await shippingBody(request(body)), { value: "á".repeat(15994) });
  await assert.rejects(shippingBody(request(`${body} `)), (error: unknown) =>
    error instanceof ShippingError && error.status === 413 && error.message === "Solicitação muito grande.");
});

test("shipping cancels a chunked body on overflow without reading remaining chunks", async () => {
  let reads = 0; let canceled = false;
  const body = new ReadableStream<Uint8Array>({ pull(controller) {
    reads++;
    if (reads <= 2) controller.enqueue(new Uint8Array(16001).fill(32));
    else controller.error(new Error("The excess body must not be read"));
  }, cancel() { canceled = true; } }, { highWaterMark: 0 });
  await assert.rejects(shippingBody(request(body, { "content-length": "1" })), (error: unknown) =>
    error instanceof ShippingError && error.status === 413);
  assert.equal(reads, 2); assert.equal(canceled, true);
});

test("shipping decodes multibyte characters split across stream chunks", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ value: "ação 🚚" }));
  let index = 0;
  const body = new ReadableStream<Uint8Array>({ pull(controller) {
    if (index === bytes.length) controller.close();
    else controller.enqueue(bytes.slice(index, ++index));
  } }, { highWaterMark: 0 });
  assert.deepEqual(await shippingBody(request(body)), { value: "ação 🚚" });
});

test("shipping keeps the size error even if canceling an oversized stream fails", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(32001)); },
    cancel() { throw new Error("synthetic private stream failure"); },
  });
  await assert.rejects(shippingBody(request(body)), (error: unknown) =>
    error instanceof ShippingError && error.status === 413);
});

test("shipping preserves origin, content-type, empty and malformed JSON errors", async () => {
  for (const [body, headers, status, message] of [
    ["{}", { origin: "https://other.example.invalid" }, 403, "Origem da solicitação inválida."],
    ["{}", { "content-type": "text/plain" }, 415, "Envie JSON."],
    [null, {}, 400, "JSON inválido."], ["{", {}, 400, "JSON inválido."],
  ] as const) {
    await assert.rejects(shippingBody(request(body, headers)), (error: unknown) => {
      assert.ok(error instanceof ShippingError); assert.equal(error.status, status); assert.equal(error.message, message);
      const response = shippingFailure(error);
      assert.equal(response.status, status); assert.equal(response.headers.get("cache-control"), "private, no-store");
      return true;
    });
  }
});
