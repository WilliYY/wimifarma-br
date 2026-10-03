import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { NextRequest, type NextResponse } from "next/server";
import { cartEventKey, createCartIdentity, readCartIdentity } from "./commerce-rules";

const now = Date.UTC(2026, 9, 3, 12);
const secret = "synthetic-cart-test-secret";
const cookieName = "wimi-miauby-cart";
class FixedDate extends Date { static now() { return now; } }
type Product = { id: string; name: string; price: number; promotionalPrice: number | null; stock: number; status: string; requiresPrescription: boolean; isPopularPharmacy: boolean };
type Event = { id: string; key: string; type: string; sessionId: string; status: string; attempts: number; text: string; availableAt: Date; lastError?: string };
type EventWhere = { key?: string; type?: string; sessionId?: string; status?: string; attempts?: number };
type ProductWhere = { id: { in: string[] }; status?: string; requiresPrescription?: boolean; isPopularPharmacy?: boolean };
const baseProduct: Product = { id: "synthetic-product", name: "Produto sintético", price: 10, promotionalPrice: 8, stock: 20, status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false };
const cart = (quantity = 1, productId = baseProduct.id) => ({ items: [{ productId, quantity }] });
const bundlePromise = build({ entryPoints: ["src/app/api/miauby/carrinho/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "cart-fixture", setup(builder) {
  builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>globalThis.fixture.db;" }));
} }] });

async function harness(options: { products?: Product[]; failTransaction?: boolean; enabled?: boolean; cartAlerts?: boolean } = {}) {
  const bundle = await bundlePromise;
  const products = options.products ?? [baseProduct];
  const events: Event[] = [];
  const productQueries: ProductWhere[] = [];
  let reads = 0;
  let transactions = 0;
  const matches = (event: Event, where: EventWhere) => Object.entries(where).every(([key, value]) => event[key as keyof Event] === value);
  const eventDb = {
    upsert: async ({ where, create }: { where: { key: string }; create: Omit<Event, "id" | "status" | "attempts"> }) => {
      let event = events.find(item => item.key === where.key);
      if (!event) { event = { id: `synthetic-event-${events.length}`, status: "PENDING", attempts: 0, ...create }; events.push(event); }
      return event;
    },
    updateMany: async ({ where, data }: { where: EventWhere; data: Partial<Event> }) => {
      if (options.failTransaction) throw new Error("synthetic private database failure");
      const found = events.filter(event => matches(event, where)); found.forEach(event => Object.assign(event, data)); return { count: found.length };
    },
  };
  const db = {
    miaubyConfig: { findUnique: async () => { reads++; return { enabled: options.enabled ?? true, cartAlerts: options.cartAlerts ?? true }; } },
    miaubyEvent: eventDb,
    product: { findMany: async ({ where }: { where: ProductWhere }) => {
      reads++; productQueries.push(where);
      return products.filter(product => where.id.in.includes(product.id) && (where.status === undefined || product.status === where.status)
        && (where.requiresPrescription === undefined || product.requiresPrescription === where.requiresPrescription)
        && (where.isPopularPharmacy === undefined || product.isPopularPharmacy === where.isPopularPharmacy));
    } },
    $transaction: async (callback: (tx: { miaubyEvent: typeof eventDb }) => Promise<void>) => {
      transactions++; const before = events.map(event => ({ ...event }));
      try { await callback({ miaubyEvent: eventDb }); } catch (error) { events.splice(0, events.length, ...before); throw error; }
    },
  };
  const loaded = { exports: {} as { POST: (request: NextRequest) => Promise<NextResponse> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, Buffer, Date: FixedDate, console, process: { env: { AUTH_URL: "https://example.com", AUTH_SECRET: secret } }, fixture: { db } });
  const post = (body: unknown, token?: string, origin: string | null = "https://example.com") => {
    const headers = new Headers({ "Content-Type": "application/json", "x-real-ip": "192.0.2.1" });
    if (origin !== null) headers.set("Origin", origin);
    if (token) headers.set("Cookie", `${cookieName}=${token}`);
    return loaded.exports.POST(new NextRequest("https://example.com/api/miauby/carrinho", { method: "POST", headers, body: JSON.stringify(body) }));
  };
  return { events, productQueries, post, reads: () => reads, transactions: () => transactions };
}

test("cart rejects absent or foreign origin before reading the database", async () => {
  const f = await harness();
  for (const origin of [null, "https://foreign.example"]) assert.equal((await f.post(cart(), undefined, origin)).status, 403);
  assert.equal(f.reads(), 0); assert.equal(f.events.length, 0);
});
test("cart rejects client prices, text and totals instead of trusting them", async () => {
  const f = await harness();
  for (const body of [{ ...cart(), totalCents: 1 }, { ...cart(), text: "client message" }, { items: [{ ...cart().items[0], price: 0.01 }] }]) assert.equal((await f.post(body)).status, 422);
  assert.equal(f.reads(), 0); assert.equal(f.events.length, 0);
});
test("cart issues a signed private cookie and computes subtotal from catalog promotion", async () => {
  const f = await harness(); const response = await f.post(cart(2));
  assert.equal(response.status, 200);
  const token = response.cookies.get(cookieName)?.value; assert.ok(token);
  const sessionId = readCartIdentity(token, secret, now); assert.ok(sessionId);
  assert.equal(f.events[0].sessionId, sessionId); assert.equal(f.events[0].key, cartEventKey(sessionId, now));
  assert.match(f.events[0].text, /Subtotal: R\$\s*16,00/); assert.match(f.events[0].text, /2 × Produto sintético/);
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i); assert.match(response.headers.get("set-cookie") ?? "", /Secure/i);
  assert.match(response.headers.get("set-cookie") ?? "", /SameSite=lax/i); assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=86400/i);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/); assert.equal(f.transactions(), 1);
});
test("empty cart cancels only pending events in its signed session", async () => {
  const f = await harness(); const first = await f.post(cart()); const token = first.cookies.get(cookieName)!.value;
  f.events.push({ ...f.events[0], id: "other-session", key: "other-key", sessionId: "other-session" });
  f.events.push({ ...f.events[0], id: "accepted", key: "accepted-key", status: "SENT" });
  assert.equal((await f.post({ items: [] }, token)).status, 200);
  assert.equal(f.events[0].status, "FAILED"); assert.match(f.events[0].lastError!, /Carrinho esvaziado/);
  assert.equal(f.events[1].status, "PENDING"); assert.equal(f.events[2].status, "SENT");
  const empty = await harness(); assert.equal((await empty.post({ items: [] })).status, 200); assert.equal(empty.events.length, 0);
});
test("unsigned cookie cannot cancel another session and is replaced on creation", async () => {
  const f = await harness(); const valid = createCartIdentity(secret, now); const invalid = `${valid.slice(0, -1)}${valid.endsWith("0") ? "1" : "0"}`;
  await f.post(cart(), valid); assert.equal((await f.post({ items: [] }, invalid)).status, 200); assert.equal(f.events[0].status, "PENDING");
  const response = await f.post(cart(), invalid); const replacement = response.cookies.get(cookieName)!.value;
  assert.ok(readCartIdentity(replacement, secret, now)); assert.notEqual(replacement, invalid); assert.equal(f.events.length, 2);
});
test("unsent cart updates its pending snapshot without creating a second event", async () => {
  const f = await harness(); const first = await f.post(cart()); const token = first.cookies.get(cookieName)!.value;
  assert.equal((await f.post(cart(3), token)).status, 200); assert.equal(f.events.length, 1); assert.match(f.events[0].text, /3 × Produto sintético/);
  assert.match(f.events[0].text, /Subtotal: R\$\s*24,00/); assert.equal(f.events[0].attempts, 0);
});
test("retrying, accepted and uncertain cart snapshots remain unchanged", async () => {
  for (const state of [{ status: "PENDING", attempts: 1 }, { status: "SENT", attempts: 1 }, { status: "UNCERTAIN", attempts: 1 }, { status: "PROCESSING", attempts: 1 }]) {
    const f = await harness(); const first = await f.post(cart()); const token = first.cookies.get(cookieName)!.value;
    Object.assign(f.events[0], state); const original = f.events[0].text;
    assert.equal((await f.post(cart(4), token)).status, 200); assert.equal(f.events.length, 1); assert.equal(f.events[0].text, original); assert.equal(f.events[0].status, state.status);
  }
});
test("product query excludes inactive, prescription and Popular Pharmacy products", async () => {
  const products: Product[] = [baseProduct, { ...baseProduct, id: "inactive", status: "INACTIVE" }, { ...baseProduct, id: "prescription", requiresPrescription: true }, { ...baseProduct, id: "popular", isPopularPharmacy: true }];
  for (const product of products.slice(1)) {
    const f = await harness({ products }); assert.equal((await f.post(cart(1, product.id))).status, 409); assert.equal(f.events.length, 0);
    const where = f.productQueries[0]; assert.equal(where.status, "ACTIVE"); assert.equal(where.requiresPrescription, false); assert.equal(where.isPopularPharmacy, false);
  }
});
test("invalid quantities, duplicate ids, excessive items and stock shortage never enqueue", async () => {
  const f = await harness();
  for (const quantity of [0, -1, 1.5, 21]) assert.equal((await f.post(cart(quantity))).status, 422);
  assert.equal((await f.post({ items: [cart().items[0], cart().items[0]] })).status, 422);
  assert.equal((await f.post({ items: Array.from({ length: 31 }, (_, index) => ({ productId: `product-${index}`, quantity: 1 })) })).status, 422);
  const scarce = await harness({ products: [{ ...baseProduct, stock: 1 }] }); assert.equal((await scarce.post(cart(2))).status, 409);
  assert.equal(f.events.length, 0); assert.equal(scarce.events.length, 0); assert.equal(f.transactions(), 0); assert.equal(scarce.transactions(), 0);
});
test("transaction failure rolls back event creation and hides database details", async () => {
  const f = await harness({ failTransaction: true }); const response = await f.post(cart());
  assert.equal(response.status, 503); assert.equal(f.events.length, 0); assert.equal(f.transactions(), 1);
  assert.doesNotMatch(await response.text(), /synthetic private database failure/); assert.equal(response.cookies.get(cookieName), undefined);
});
test("six cart updates deduplicate and creation limit still permits clearing", async () => {
  const f = await harness(); const first = await f.post(cart()); const token = first.cookies.get(cookieName)!.value;
  for (let quantity = 2; quantity <= 6; quantity++) assert.equal((await f.post(cart(quantity), token)).status, 200);
  assert.equal(f.events.length, 1); assert.match(f.events[0].text, /6 × Produto sintético/);
  assert.equal((await f.post(cart(7), token)).status, 429); assert.match(f.events[0].text, /6 × Produto sintético/);
  assert.equal((await f.post({ items: [] }, token)).status, 200); assert.equal(f.events[0].status, "FAILED"); assert.equal(f.events.length, 1);
});
test("disabled cart alerts leave products, events and cookie untouched", async () => {
  for (const settings of [{ enabled: false }, { cartAlerts: false }]) {
    const f = await harness(settings); const response = await f.post(cart());
    assert.equal(response.status, 200); assert.equal(f.productQueries.length, 0); assert.equal(f.events.length, 0); assert.equal(response.cookies.get(cookieName), undefined);
  }
});
