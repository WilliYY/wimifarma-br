import assert from "node:assert/strict";
import test from "node:test";
import { CartStorage, CART_LEGACY_KEY, CART_OPERATION_PREFIX } from "./cart-storage";
import type { CartProduct } from "./cart-provider";

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  pending: Array<[string, string]> | null = null;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.pending) this.pending.push([key, value]); else this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  flush() { const pending = this.pending ?? []; this.pending = null; pending.forEach(([key, value]) => this.setItem(key, value)); }
}
const product = (id: string, unitPriceCents = 515): CartProduct => ({ id, name: id, slug: id, imageUrl: null, category: null, unitPriceCents, originalPriceCents: null, stock: 999, requiresPrescription: false, isPopularPharmacy: false });
const add = (store: CartStorage, id: string, quantity = 1) => store.commit({ type: "add", product: product(id), quantity });

test("overlapping writes with identical clocks preserve both products and survive a new reader", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage), b = new CartStorage(storage);
  a.read(); b.read(); storage.pending = [];
  add(a, "cotton"); add(b, "kit");
  assert.equal(storage.pending.length, 2); storage.flush();
  assert.deepEqual(a.read(), b.read()); assert.deepEqual(a.read(), new CartStorage(storage).read());
  assert.equal(a.read().length, 2);
});
test("concurrent adds to the same SKU accumulate rather than overwrite", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage), b = new CartStorage(storage);
  storage.pending = []; add(a, "cotton"); add(b, "cotton", 2); storage.flush();
  assert.equal(new CartStorage(storage).read()[0].quantity, 3);
});
test("concurrent purchases keep one quantity and explicit adds still accumulate", () => {
  const storage = new MemoryStorage();
  const a = new CartStorage(storage), b = new CartStorage(storage);
  a.read(); b.read(); storage.pending = [];
  const purchase = { type: "add", product: product("kit"), quantity: 2, onlyIfMissing: true } as const;
  a.commit(purchase); b.commit(purchase); storage.flush();
  assert.equal(new CartStorage(storage).read()[0].quantity, 2);
  assert.equal(add(a, "kit", 3)[0].quantity, 5);
  const current = b.read();
  const repeatedPurchase = b.commit({ ...purchase, quantity: 4, product: product("kit", 900) });
  assert.equal(repeatedPurchase, current);
  assert.equal(repeatedPurchase[0].unitPriceCents, 515);
  assert.equal(repeatedPurchase[0].quantity, 5);
});
test("remove and clear cannot be undone by stale quantity or review operations", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage), b = new CartStorage(storage);
  add(a, "soap"); add(a, "cotton"); const stale = b.read();
  a.commit({ type: "remove", productId: "soap" });
  b.commit({ type: "quantity", productId: "cotton", quantity: 2 });
  assert.deepEqual(a.read().map(item => [item.id, item.quantity]), [["cotton", 2]]);
  b.commit({ type: "quantity", productId: "soap", quantity: 3 });
  b.commit({ type: "review", source: stale, items: stale });
  assert.equal(a.read().length, 1);
  a.commit({ type: "clear" }); b.commit({ type: "quantity", productId: "cotton", quantity: 3 });
  assert.deepEqual(new CartStorage(storage).read(), []);
});
test("legacy seed is read once per reader, deduplicated, and never copied into the journal", () => {
  const storage = new MemoryStorage(); const item = { ...product("cotton"), quantity: 1 };
  storage.setItem(CART_LEGACY_KEY, JSON.stringify([item, item]));
  const a = new CartStorage(storage), b = new CartStorage(storage); a.read(); b.read();
  add(a, "kit"); add(b, "soap");
  assert.equal(new CartStorage(storage).read().length, 3);
  assert.equal([...storage.values.keys()].filter(key => key.startsWith(CART_OPERATION_PREFIX)).length, 2);
  assert.equal(JSON.parse(storage.getItem(CART_LEGACY_KEY)!).length, 2);
});
test("limits, invalid storage records and malformed operations do not corrupt the basket", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage);
  for (let i = 0; i < 31; i++) add(a, String(i), 5000);
  assert.equal(a.read().length, 30); assert.equal(a.read()[0].quantity, 999);
  a.commit({ type: "quantity", productId: "0", quantity: NaN });
  a.commit({ type: "add", product: product(""), quantity: 1 });
  storage.setItem(CART_OPERATION_PREFIX + "bad", "{}");
  storage.setItem(CART_OPERATION_PREFIX + "bad-json", "{");
  assert.equal(new CartStorage(storage).read().length, 30);
  a.commit({ type: "quantity", productId: "0", quantity: -1 });
  assert.equal(a.read().length, 29);
});
test("blocked or full storage reports the failure and preserves in-memory edits", () => {
  const storage = new MemoryStorage(); let warnings = 0;
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  const a = new CartStorage(storage, () => warnings++);
  assert.equal(add(a, "cotton").length, 1); assert.ok(warnings >= 1);
  a.commit({ type: "quantity", productId: "cotton", quantity: 2 });
  assert.equal(a.read()[0].quantity, 2);
});

test("quota during bootstrap retains the existing legacy cart in memory", () => {
  const storage = new MemoryStorage(); storage.setItem(CART_LEGACY_KEY, JSON.stringify([{ ...product("cotton"), quantity: 1 }]));
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  const a = new CartStorage(storage);
  assert.equal(a.read()[0].quantity, 1);
  assert.equal(add(a, "cotton")[0].quantity, 2);
});

test("immutable bootstrap survives legacy writers and reload without doubling journal edits", () => {
  const storage = new MemoryStorage(); const one = { ...product("cotton"), quantity: 1 };
  storage.setItem(CART_LEGACY_KEY, JSON.stringify([one]));
  const a = new CartStorage(storage); add(a, "cotton");
  storage.setItem(CART_LEGACY_KEY, JSON.stringify([{ ...one, quantity: 2 }]));
  const c = new CartStorage(storage);
  assert.equal(c.read()[0].quantity, 2); assert.deepEqual(a.read(), c.read());
});

test("racing bootstrap candidates converge even if a legacy writer changes the captured seed", () => {
  const storage = new MemoryStorage(); const one = { ...product("cotton"), quantity: 1 };
  storage.setItem(CART_LEGACY_KEY, JSON.stringify([one])); storage.pending = [];
  const a = new CartStorage(storage); a.read();
  storage.values.set(CART_LEGACY_KEY, JSON.stringify([{ ...one, quantity: 2 }]));
  const b = new CartStorage(storage); b.read(); storage.flush();
  assert.deepEqual(a.read(), b.read()); assert.deepEqual(a.read(), new CartStorage(storage).read());
});

test("refresh preserves review identity until a journal edit, even when values return to the original", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage), b = new CartStorage(storage);
  add(a, "cotton"); const before = b.read();
  assert.equal(before, b.read());
  a.commit({ type: "quantity", productId: "cotton", quantity: 2 });
  a.commit({ type: "quantity", productId: "cotton", quantity: 1 });
  assert.deepEqual(before, b.read()); assert.notEqual(before, b.read());
});

test("current review applies updated prices while a stale review source is rejected", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage), b = new CartStorage(storage);
  const source = add(a, "cotton");
  const updated = source.map(item => ({ ...item, unitPriceCents: 600 }));
  assert.equal(a.commit({ type: "review", source, items: updated }), updated);
  assert.equal(a.read(), updated);
  assert.equal(new CartStorage(storage).read()[0].unitPriceCents, 600);
  const stale = b.read();
  a.commit({ type: "quantity", productId: "cotton", quantity: 2 });
  a.commit({ type: "quantity", productId: "cotton", quantity: 1 });
  b.commit({ type: "review", source: stale, items: [] });
  assert.equal(b.read().length, 1);
});

test("durable clear removes product history from every cart namespace and ignores late legacy seeds", () => {
  const storage = new MemoryStorage(); const privateProduct = { ...product("private-medicine"), name: "Medicamento sintético privado", quantity: 1 };
  storage.setItem(CART_LEGACY_KEY, JSON.stringify([privateProduct]));
  const a = new CartStorage(storage); a.read();
  a.commit({ type: "add", product: privateProduct, quantity: 1 });
  a.commit({ type: "clear" });
  assert.equal([...storage.values.values()].some(value => value.includes(privateProduct.name)), false);
  storage.setItem(CART_LEGACY_KEY, JSON.stringify([privateProduct]));
  assert.deepEqual(new CartStorage(storage).read(), []);
  assert.equal(storage.getItem(CART_LEGACY_KEY), null);
});

test("post-clear reviews keep their price after old operations are collected and a new reader loads", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage);
  add(a, "old"); const oldRecords = [...storage.values.entries()];
  a.commit({ type: "clear" });
  a.commit({ type: "add", product: product("new", 100), quantity: 1 });
  const source = a.read();
  a.commit({ type: "review", source, items: source.map(item => ({ ...item, unitPriceCents: 200 })) });
  oldRecords.forEach(([key, value]) => storage.setItem(key, value));
  assert.equal(new CartStorage(storage).read()[0].unitPriceCents, 200);
  assert.equal(a.read()[0].unitPriceCents, 200);
  assert.equal([...storage.values.values()].some(value => value.includes('"old"')), false);
});

test("a clear write which fails never authorizes deleting the persistent cart", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage);
  add(a, "cotton"); const persisted = [...storage.values.entries()];
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  a.commit({ type: "clear" });
  assert.deepEqual([...storage.values.entries()], persisted);
  assert.equal(new CartStorage(storage).read()[0].id, "cotton");
});

test("a rejected empty review never claims application just because a concurrent clear also empties the cart", () => {
  const storage = new MemoryStorage(); const a = new CartStorage(storage);
  const source = add(a, "cotton"); const removed: typeof source = [];
  const save = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    const entry = JSON.parse(value);
    if (entry.operation?.type === "review") {
      const id = "00000000-0000-4000-8000-000000000000";
      save(CART_OPERATION_PREFIX + id, JSON.stringify({ id, clock: entry.clock, operation: { type: "clear" } }));
    }
    save(key, value);
  };
  const result = a.commit({ type: "review", source, items: removed });
  assert.deepEqual(result, []);
  assert.notEqual(result, removed);
});
