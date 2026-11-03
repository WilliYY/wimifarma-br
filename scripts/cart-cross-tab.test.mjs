import assert from "node:assert/strict";
import { createServer } from "node:http";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

// Real provider, React and browser storage; synthetic products and no backend.
const bundle = await build({ stdin: { contents: `
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CartProvider, useCart } from './src/components/site/cart-provider';
function Probe() { const cart = useCart(); useEffect(() => { window.cart = cart; }, [cart]); return <output>{JSON.stringify({ items: cart.items, total: cart.subtotalCents, hydrated: cart.hydrated })}</output>; }
createRoot(document.getElementById('root')).render(<CartProvider><Probe /></CartProvider>);
`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
const server = createServer((request, response) => {
  if (request.url === "/bundle.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); }
  else { response.setHeader("Content-Type", "text/html"); response.end('<div id="root"></div><script src="/bundle.js"></script>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch();
const product = (id, price) => ({ id, name: id, slug: id, imageUrl: null, category: null, unitPriceCents: price, originalPriceCents: null, stock: 999, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false });
const cotton = product("cotton", 515), kit = product("kit", 1100), soap = product("soap", 208);
try {
  const context = await browser.newContext();
  await context.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const a = await context.newPage(), b = await context.newPage();
  const url = `http://127.0.0.1:${server.address().port}`;
  await Promise.all([a.goto(url), b.goto(url)]);
  const ready = page => expect.poll(() => page.evaluate(() => window.cart?.hydrated)).toBe(true);
  await Promise.all([ready(a), ready(b)]);
  const add = (page, item) => page.evaluate(item => window.cart.addProduct(item), item);
  const total = (page, cents) => expect.poll(() => page.evaluate(() => window.cart.subtotalCents), { timeout: 3000 }).toBe(cents);
  await add(a, cotton); await add(b, kit);
  await Promise.all([total(a, 1615), total(b, 1615)]);
  await b.reload(); await ready(b); await total(b, 1615);
  await a.evaluate(() => window.cart.clearCart()); await total(b, 0);
  await add(a, soap); await add(a, cotton); await total(b, 723);
  await a.evaluate(() => window.cart.removeProduct("soap"));
  await b.evaluate(() => window.cart.updateQuantity("cotton", 2));
  await Promise.all([total(a, 1030), total(b, 1030)]);
  await a.reload(); await ready(a); await total(a, 1030);
  // Delayed storage events cannot replay obsolete snapshots over newer state.
  await a.evaluate(() => window.dispatchEvent(new StorageEvent("storage", { key: "wimifarma-cart-v1", newValue: "[]" })));
  await total(a, 1030);
  await a.evaluate(() => window.cart.clearCart()); await total(b, 0);
  // Hold each page's storage write until both have read the same shared state.
  await Promise.all([a, b].map(page => page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.pendingWrites = [];
    Storage.prototype.setItem = function(key, value) { window.pendingWrites.push(() => original.call(this, key, value)); };
    window.releaseWrites = () => { Storage.prototype.setItem = original; window.pendingWrites.forEach(write => write()); };
  })));
  await Promise.all([add(a, cotton), add(b, kit)]);
  await Promise.all([a, b].map(page => page.evaluate(() => window.releaseWrites())));
  await Promise.all([total(a, 1615), total(b, 1615)]);
  await Promise.all([a.reload(), b.reload()]); await Promise.all([ready(a), ready(b)]);
  await Promise.all([total(a, 1615), total(b, 1615)]);
  assert.equal(await a.evaluate(() => window.cart.items.length), 2);
  console.log("PASS: two real pages, independent adds, remove + quantity, overlap, delayed events and reload; all API requests intercepted");
  await context.close();
  const migration = await browser.newContext();
  await migration.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const legacyWriter = await migration.newPage();
  await legacyWriter.goto(url); await ready(legacyWriter);
  await legacyWriter.evaluate(item => {
    localStorage.clear();
    localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...item, quantity: 1 }]));
  }, cotton);
  const migrated = await migration.newPage(); await migrated.goto(url); await ready(migrated);
  await add(migrated, cotton); await total(migrated, 1030);
  await legacyWriter.evaluate(item => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...item, quantity: 2 }])), cotton);
  const lateReader = await migration.newPage(); await lateReader.goto(url); await ready(lateReader);
  await Promise.all([total(migrated, 1030), total(lateReader, 1030)]);
  await Promise.all([migrated.reload(), lateReader.reload()]);
  await Promise.all([ready(migrated), ready(lateReader)]);
  await Promise.all([total(migrated, 1030), total(lateReader, 1030)]);
  console.log("PASS: three pages, immutable legacy bootstrap, obsolete v1 writer and reload do not double additions");
  await migration.close();
  const privacy = await browser.newContext();
  await privacy.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const privateProduct = { ...product("private-medicine", 100), name: "Medicamento sintético privado" };
  await privacy.addInitScript(item => {
    if (!localStorage.getItem("qa-legacy-seeded")) {
      localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...item, quantity: 1 }]));
      localStorage.setItem("qa-legacy-seeded", "1");
    }
  }, privateProduct);
  const pages = await Promise.all([privacy.newPage(), privacy.newPage(), privacy.newPage()]);
  await Promise.all(pages.map(page => page.goto(url))); await Promise.all(pages.map(ready));
  const [p, q, r] = pages;
  await add(p, privateProduct); await total(q, 200);
  const historical = await p.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith("wimifarma-cart")));
  await p.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.pendingWrites = [];
    Storage.prototype.setItem = function(key, value) { window.pendingWrites.push(() => original.call(this, key, value)); };
    window.releaseWrites = () => { Storage.prototype.setItem = original; window.pendingWrites.forEach(write => write()); };
  });
  await add(p, product("late-before-clear", 100));
  // Advance another writer beyond the held operation, then persist its clear.
  await add(q, product("clock-tick", 100));
  await q.evaluate(() => window.cart.updateQuantity("clock-tick", 2));
  await q.evaluate(() => window.cart.clearCart()); await total(r, 0);
  const noPrivateHistory = page => expect.poll(() => page.evaluate(name => Object.entries(localStorage)
    .filter(([key]) => key.startsWith("wimifarma-cart")).every(([, value]) => !value.includes(name)), privateProduct.name)).toBe(true);
  await noPrivateHistory(q);
  await add(r, product("post-clear", 100)); await total(r, 100);
  await r.evaluate(() => {
    const source = window.cart.items;
    window.cart.applyCartReview({ source, items: source.map(item => ({ ...item, unitPriceCents: 200 })), entries: [], hasChanges: true });
  });
  await total(r, 200);
  await p.evaluate(() => window.releaseWrites());
  // Old seeds, legacy snapshots and pre-clear operations may arrive after GC.
  await p.evaluate(records => records.forEach(([key, value]) => localStorage.setItem(key, value)), historical);
  await Promise.all(pages.map(page => total(page, 200)));
  await noPrivateHistory(r);
  await Promise.all(pages.map(page => page.reload())); await Promise.all(pages.map(ready));
  await Promise.all(pages.map(page => total(page, 200))); await noPrivateHistory(r);
  assert.equal(await r.evaluate(() => Object.values(localStorage).some(value => value.includes("late-before-clear"))), false);
  console.log("PASS: three-page clear erases private product history, ignores late seeds/v1/old writes and preserves post-clear reviewed price 200 after reload");
  await privacy.close();
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
