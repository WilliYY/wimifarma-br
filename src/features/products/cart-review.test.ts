import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { cartReviewRequestSchema, createCartReviewProposal, reviewedCartItems, requestCartReview } from "./cart-review";
import type { CartItem, CartProduct } from "@/components/site/cart-provider";

const product: CartProduct = { id: "synthetic-product", name: "Produto sintético", slug: "produto-sintetico", category: null, imageUrl: null, unitPriceCents: 499, originalPriceCents: null, stock: 10, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false };
const item: CartItem = { ...product, quantity: 4 };

test("review proposes current price and reduced stock without silently changing the source cart", () => {
  const source = [{ ...item }];
  const proposal = createCartReviewProposal(source, [{ ...product, unitPriceCents: 599, stock: 2 }]);
  assert.equal(source[0].quantity, 4);
  assert.equal(source[0].unitPriceCents, 499);
  assert.equal(proposal.entries[0].after?.quantity, 2);
  assert.equal(proposal.entries[0].after?.unitPriceCents, 599);
  assert.equal(reviewedCartItems(source, proposal)?.[0].quantity, 2);
});

test("new stock never increases quantities and reviewed quantities stay capped at twenty", () => {
  const source = [{ ...item, quantity: 20 }];
  assert.equal(createCartReviewProposal(source, [{ ...product, stock: 100 }]).entries[0].after?.quantity, 20);
  assert.equal(createCartReviewProposal([item], [{ ...product, stock: 100 }]).entries[0].after?.quantity, 4);
});

test("deleted, unavailable, assisted and out-of-stock products are explicitly proposed for removal", () => {
  const source = [item];
  assert.equal(createCartReviewProposal(source, []).entries[0].reason, "UNAVAILABLE");
  for (const current of [
    { ...product, requiresPrescription: true, prescriptionType: "UNREVIEWED" as const },
    { ...product, requiresPrescription: true, prescriptionType: "CONTROLLED" as const },
    { ...product, isPopularPharmacy: true },
  ]) {
    const proposal = createCartReviewProposal(source, [current]);
    assert.equal(proposal.entries[0].reason, "ASSISTED");
    assert.equal(proposal.entries[0].after, null);
  }
  assert.equal(createCartReviewProposal(source, [{ ...product, stock: 0 }]).entries[0].reason, "OUT_OF_STOCK");
  assert.equal(createCartReviewProposal(source, [{ ...product, requiresPrescription: true, prescriptionType: "ORDINARY" }]).entries[0].after?.quantity, 4);
});

test("a cart changed during a delayed consultation cannot apply the proposal, even after restoring its previous values", async () => {
  const source = [item];
  let resolve!: (response: Response) => void;
  const response = new Promise<Response>(done => { resolve = done; });
  const pending = requestCartReview(source, async () => response);
  const changed = [{ ...item, quantity: 2 }];
  resolve(Response.json({ data: { products: [{ ...product, unitPriceCents: 599 }] } }));
  const proposal = await pending;
  assert.equal(reviewedCartItems(changed, proposal), null);
  assert.equal(reviewedCartItems([{ ...item }], proposal), null);
  assert.equal(reviewedCartItems(source, proposal)?.[0].unitPriceCents, 599);
});

test("review request rejects duplicates, empty IDs, extra fields and more than thirty products", () => {
  for (const input of [{ productIds: [] }, { productIds: [""] }, { productIds: ["same", "same"] }, { productIds: ["x".repeat(65)] }, { productIds: Array.from({ length: 31 }, (_, i) => `product-${i}`) }, { productIds: ["valid"], price: 1 }]) assert.equal(cartReviewRequestSchema.safeParse(input).success, false);
  assert.equal(cartReviewRequestSchema.safeParse({ productIds: Array.from({ length: 30 }, (_, i) => `product-${i}`) }).success, true);
});

test("client sends only IDs and rejects failed or unknown classification responses", async () => {
  await assert.rejects(requestCartReview([item], async (url, init) => {
    assert.equal(url, "/api/carrinho/revisao");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { productIds: [item.id] });
    return Response.json({ error: "Não foi possível revisar o carrinho." }, { status: 503 });
  }), /Não foi possível revisar/);
  await assert.rejects(requestCartReview([item], async () => Response.json({ data: { products: [{ ...product, prescriptionType: "UNKNOWN" }] } })), /Não foi possível revisar/);
});

test("route reads only active non-deleted public products and sanitizes database failure", async () => {
  const result = await build({ entryPoints: ["src/app/api/carrinho/revisao/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "cart-review-db", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>globalThis.fixture.db;" }));
  } }] });
  const queries: Array<Record<string, unknown>> = [];
  const fixture = { fail: false, db: { product: { findMany: async (query: Record<string, unknown>) => {
    queries.push(query);
    if (fixture.fail) throw new Error("private database connection secret");
    return [{ ...product, price: { toString: () => "4.99" }, promotionalPrice: { toString: () => "3.99" } }];
  } } } };
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, Buffer, console, process: { env: { AUTH_URL: "https://example.com" } }, fixture });
  let requestId = 0;
  const request = (body: unknown, overrides: Record<string, string> = {}) => new Request("https://example.com/api/carrinho/revisao", { method: "POST", headers: { "content-type": "application/json", origin: "https://example.com", "x-real-ip": `synthetic-${requestId++}`, ...overrides }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const response = await loaded.exports.POST(request({ productIds: [product.id] }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(JSON.parse(JSON.stringify(queries[0].where)), { id: { in: [product.id] }, status: "ACTIVE", deletedAt: null });
  assert.equal(Object.keys(queries[0].select as object).includes("description"), false);
  const data = await response.json();
  assert.equal(data.data.products[0].unitPriceCents, 399);
  assert.equal(data.data.products[0].originalPriceCents, 499);
  assert.equal("price" in data.data.products[0], false);
  assert.equal((await loaded.exports.POST(request({ productIds: [product.id, product.id] }))).status, 422);
  assert.equal((await loaded.exports.POST(request({ productIds: Array.from({ length: 31 }, (_, index) => `product-${index}`) }))).status, 422);
  assert.equal((await loaded.exports.POST(request("{"))).status, 400);
  assert.equal((await loaded.exports.POST(request("x".repeat(4100)))).status, 413);
  assert.equal((await loaded.exports.POST(request({ productIds: [product.id] }, { origin: "https://other.example.com" }))).status, 403);
  assert.equal((await loaded.exports.POST(request({ productIds: [product.id] }, { "content-type": "text/plain" }))).status, 415);
  assert.equal(queries.length, 1);
  fixture.fail = true;
  const failed = await loaded.exports.POST(request({ productIds: [product.id] }));
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private|secret/);
  fixture.fail = false;
  for (let index = 0; index < 15; index += 1) assert.equal((await loaded.exports.POST(request({ productIds: [product.id] }, { "x-real-ip": "synthetic-rate-limit" }))).status, 200);
  const countBeforeLimit = queries.length;
  assert.equal((await loaded.exports.POST(request({ productIds: [product.id] }, { "x-real-ip": "synthetic-rate-limit" }))).status, 429);
  assert.equal(queries.length, countBeforeLimit);
});
