import assert from "node:assert/strict";
import test from "node:test";
import { subscribeSchema, RestockError } from "./contracts";
import { assertRestockOrigin, restockBody, restockFailure } from "./http";
import { RequestBodyError } from "@/lib/api";

test("same-origin protection rejects cross-site and same-site sibling origins", () => {
  const rejected: Record<string, string>[] = [{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }];
  for (const headers of rejected) {
    assert.throws(() => assertRestockOrigin(new Request("https://store.example/api", { headers })), /não autorizada/);
  }
  assert.doesNotThrow(() => assertRestockOrigin(new Request("https://store.example/api", { headers: { origin: "https://store.example", "sec-fetch-site": "same-origin" } })));
  assert.doesNotThrow(() => assertRestockOrigin(new Request("http://localhost:3000/api", { headers: { origin: "https://store.example", "x-forwarded-host": "store.example", "x-forwarded-proto": "https", "sec-fetch-site": "same-origin" } })));
});
test("body limit is 4KB and strict schema rejects injected contact fields", async () => {
  const request = (body: string) => new Request("https://store.example/api", { method: "POST", body });
  await assert.rejects(restockBody(request("x".repeat(4097)), subscribeSchema), error => error instanceof RequestBodyError && error.status === 413);
  await assert.rejects(restockBody(request(JSON.stringify({ productId: "x", whatsapp: true, email: false, consent: true, phone: "5544999990000" })), subscribeSchema), /inválida/);
  await assert.rejects(restockBody(request("{"), subscribeSchema), /inválida/);
});
test("every response error is private and does not leak raw errors or PII", async () => {
  for (const error of [new Error("secret test@example.test"), new RequestBodyError("secret", 413), new RestockError("Conta indisponível.", 401)]) {
    const response = restockFailure(error);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(JSON.stringify(await response.json()).includes("secret"), false);
  }
});
test("unexpected failures log only fixed operation and safe Prisma code, while expected failures remain silent", async () => {
  const original = console.error;
  const logs: unknown[][] = [];
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    const response = restockFailure(Object.assign(new Error("private@example.test SELECT contact"), { code: "P2022", query: "private" }), "customer_get");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(logs, [["RESTOCK_FAILURE", { operation: "customer_get", code: "P2022" }]]);
    assert.equal(JSON.stringify(await response.json()).includes("private"), false);
    restockFailure({ code: "private@example.test", message: "private" }, "customer_post");
    assert.deepEqual(logs[1], ["RESTOCK_FAILURE", { operation: "customer_post", code: "UNKNOWN" }]);
    restockFailure(new RestockError("Solicitação inválida.", 422), "customer_post");
    restockFailure(new RequestBodyError("Solicitação muito grande.", 413), "customer_post");
    assert.equal(logs.length, 2);
  } finally { console.error = original; }
});
