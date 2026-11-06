import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
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

test("shipping accepts the exact HTTPS www alias only for the explicitly configured apex", async () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://wimifarma.com.br";
  try {
    for (const origin of ["https://wimifarma.com.br", "https://www.wimifarma.com.br"]) {
      for (const path of ["/api/fretes/estimativa", "/api/fretes/cotacao"]) {
        assert.deepEqual(await shippingBody(new Request(`${origin}${path}`, {
          method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}",
        })), {});
      }
    }
    for (const origin of ["http://www.wimifarma.com.br", "https://www.wimifarma.com.br:443",
      "https://www.wimifarma.com.br:8443", "https://www.wimifarma.com.br.evil.invalid",
      "https://shop.wimifarma.com.br", "https://www.other.invalid", "null",
      "https://www.wimifarma.com.br, https://wimifarma.com.br"]) {
      await assert.rejects(shippingBody(request("{}", { origin })), (error: unknown) =>
        error instanceof ShippingError && error.status === 403);
    }
    const missingOrigin = new Request("https://www.wimifarma.com.br/api/fretes/estimativa", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    await assert.rejects(shippingBody(missingOrigin), (error: unknown) => error instanceof ShippingError && error.status === 403);
  } finally { if (previous === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = previous; }
});

test("shipping does not infer the www alias without AUTH_URL or for another canonical origin", async () => {
  const previous = process.env.AUTH_URL;
  try {
    for (const configured of [undefined, "https://example.invalid", "http://wimifarma.com.br", "https://wimifarma.com.br:8443"]) {
      if (configured === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = configured;
      await assert.rejects(shippingBody(new Request("https://wimifarma.com.br/api/fretes/estimativa", {
        method: "POST", headers: { origin: "https://www.wimifarma.com.br", "content-type": "application/json" }, body: "{}",
      })), (error: unknown) => error instanceof ShippingError && error.status === 403);
    }
    delete process.env.AUTH_URL;
    assert.deepEqual(await shippingBody(request("{}")), {});
    process.env.AUTH_URL = "https://www.wimifarma.com.br";
    await assert.rejects(shippingBody(request("{}", { origin: "https://wimifarma.com.br" })), (error: unknown) =>
      error instanceof ShippingError && error.status === 403);
  } finally { if (previous === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = previous; }
});

test("shipping www alias preserves JSON validation and the 32000-byte limit", async () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://wimifarma.com.br";
  try {
    const origin = "https://www.wimifarma.com.br";
    const body = JSON.stringify({ value: "a".repeat(31988) });
    assert.equal(Buffer.byteLength(body), 32000);
    assert.deepEqual(await shippingBody(request(body, { origin })), { value: "a".repeat(31988) });
    for (const [value, headers, status] of [
      ["{}", { origin, "content-type": "text/plain" }, 415], ["{", { origin }, 400],
      [null, { origin }, 400], [`${body} `, { origin }, 413],
    ] as const) {
      await assert.rejects(shippingBody(request(value, headers)), (error: unknown) => error instanceof ShippingError && error.status === status);
    }
  } finally { if (previous === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = previous; }
});

test("shipping alias still requires matching Origin and proxy Host through the API middleware", async () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://wimifarma.com.br";
  try {
    const make = (origin: string, fetchSite = "same-origin") => new NextRequest("http://127.0.0.1:3000/api/fretes/estimativa", {
      method: "POST", headers: { host: "www.wimifarma.com.br", origin, "sec-fetch-site": fetchSite,
        "content-type": "application/json", "x-real-ip": "synthetic-shipping-alias" }, body: "{}",
    });
    const allowed = make("https://www.wimifarma.com.br");
    assert.equal(middleware(allowed).headers.get("x-middleware-next"), "1");
    assert.deepEqual(await shippingBody(allowed), {});
    for (const blocked of [make("https://wimifarma.com.br"), make("https://attacker.invalid"),
      make("https://www.wimifarma.com.br", "cross-site")]) {
      assert.equal(middleware(blocked).status, 403);
    }
  } finally { if (previous === undefined) delete process.env.AUTH_URL; else process.env.AUTH_URL = previous; }
});
