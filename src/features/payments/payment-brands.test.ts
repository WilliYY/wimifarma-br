import assert from "node:assert/strict";
import test from "node:test";
import { createPaymentBrandsCache, parsePaymentBrands, uniquePaymentBrandDisplay } from "./payment-brands";

const connection = { accountId: "synthetic-account", revision: 1, environment: "production" };
const method = (id = "visa", overrides: Record<string, unknown> = {}) => ({
  id, name: id.toUpperCase(), status: "active", payment_type_id: "credit_card",
  secure_thumbnail: "https://http2.mlstatic.com/brand.png", ...overrides,
});

test("footer shows a brand once while preserving distinct payment method IDs in the catalogue", () => {
  const brands = parsePaymentBrands([
    method("elo", { name: "Elo", secure_thumbnail: "https://http2.mlstatic.com/elo.png" }),
    method("debelo", { name: "Elo Débito", payment_type_id: "debit_card", secure_thumbnail: "https://http2.mlstatic.com/elo-debit.png" }),
    method("elo-credit", { name: "Elo crédito", secure_thumbnail: "https://http2.mlstatic.com/elo-credit.png" }),
    method("elo-case", { name: " ELO ", secure_thumbnail: null }),
    method("visa", { name: "Visa", secure_thumbnail: "https://http2.mlstatic.com/elo.png" }),
    method("another", { name: "Outra marca", secure_thumbnail: null }),
  ]);
  assert.equal(brands.length, 6, "display filtering must not remove payment methods");
  assert.deepEqual(uniquePaymentBrandDisplay(brands).map(brand => brand.id), ["elo", "visa", "another"]);
  assert.equal(brands.length, 6);
});

test("footer does not merge arbitrary debit names or lookalikes into the Elo brand", () => {
  const names = ["Elo", "Elo Débito", "Elo crédito", "Elo debito", "Elo credito", "Elo outra marca", "Outra Débito", "Outra", "Mastercard", "American Express", "MP Card"];
  const brands = names.map((name, index) => ({ id: `synthetic-${index}`, name, image: null }));
  assert.deepEqual(uniquePaymentBrandDisplay(brands).map(brand => brand.name), ["Elo", "Elo outra marca", "Outra Débito", "Outra", "Mastercard", "American Express", "MP Card"]);
});

test("footer groups the live Elo prepaid variant with debit and credit without dropping gateway methods", () => {
  const brands = parsePaymentBrands([
    method("elo-prepaid", { name: "Elo Prepaid", payment_type_id: "prepaid_card" }),
    method("elo-debit", { name: "Elo Débito", payment_type_id: "debit_card" }),
    method("elo-credit", { name: "Elo" }),
    method("elo-local-prepaid", { name: "Elo Pré-pago", payment_type_id: "prepaid_card" }),
    method("visa", { name: "Visa" }),
  ]);
  assert.equal(brands.length, 5);
  assert.deepEqual(uniquePaymentBrandDisplay(brands).map(brand => brand.id), ["elo-prepaid", "visa"]);
});

test("brands preserve every active card type, deduplicate IDs and omit provider-only fields", () => {
  const methods = Array.from({ length: 15 }, (_, index) => method(`brand-${index}`));
  const brands = parsePaymentBrands([
    ...methods, method("brand-0"), method("debit", { payment_type_id: "debit_card" }),
    method("prepaid", { payment_type_id: "prepaid_card" }),
    method("pix", { payment_type_id: "bank_transfer" }), method("boleto", { payment_type_id: "ticket" }),
    method("inactive", { status: "inactive" }),
  ]);
  assert.equal(brands.length, 17);
  assert.deepEqual(brands[0], { id: "brand-0", name: "BRAND-0", image: "https://http2.mlstatic.com/brand.png" });
});

test("brands support the official Mercado Pago logo origin without accepting lookalikes or credentials", () => {
  const image = "https://www.mercadopago.com/org-img/MP3/API/logos/visa.gif";
  assert.equal(parsePaymentBrands([method("visa", { secure_thumbnail: image })])[0].image, image);
  for (const url of ["http://www.mercadopago.com/org-img/MP3/API/logos/visa.gif", "https://www.mercadopago.com.evil.example/a", "https://user:pass@www.mercadopago.com/a", "https://www.mercadopago.com:8443/a"]) {
    assert.equal(parsePaymentBrands([method("visa", { secure_thumbnail: url })])[0].image, null);
  }
});

test("brands allow only HTTPS Mercado Pago image hosts without credentials; names remain usable", () => {
  const invalid = [null, undefined, "http://http2.mlstatic.com/a", "https://http2.mlstatic.com.evil.example/a",
    "https://evil.example/a", "https://user:pass@http2.mlstatic.com/a", "data:image/svg+xml,test", "javascript:alert(1)"];
  for (const url of invalid) {
    assert.deepEqual(parsePaymentBrands([method("visa", { secure_thumbnail: url })]), [{ id: "visa", name: "VISA", image: null }]);
  }
});

test("brands validate bounded nonempty names and IDs and reject malformed catalogues", () => {
  for (const overrides of [{ id: "" }, { name: " " }, { id: "a".repeat(61) }, { name: "a".repeat(81) }]) {
    assert.throws(() => parsePaymentBrands([method("visa", overrides)]));
  }
  assert.throws(() => parsePaymentBrands(null));
});

test("brand cache shares concurrent misses and refreshes after thirty minutes", async () => {
  let now = 0; let calls = 0;
  const cache = createPaymentBrandsCache(() => now);
  let complete!: (methods: unknown) => void;
  const fetch = () => { calls++; return new Promise<unknown>(resolve => { complete = resolve; }); };
  const first = cache(connection, fetch);
  const second = cache(connection, fetch);
  await Promise.resolve();
  assert.equal(calls, 1);
  complete([method()]);
  assert.deepEqual(await first, await second);
  await cache(connection, fetch);
  assert.equal(calls, 1);
  now = 30 * 60_000;
  const expired = cache(connection, fetch);
  await Promise.resolve();
  assert.equal(calls, 2);
  complete([method("new")]);
  assert.equal((await expired)[0].id, "new");
});

test("revision, environment and account changes invalidate cached brands", async () => {
  const cache = createPaymentBrandsCache(); let calls = 0;
  const fetch = async () => { calls++; return [method(`brand-${calls}`)]; };
  for (const next of [connection, { ...connection, revision: 2 }, { ...connection, revision: 2, environment: "test" },
    { ...connection, accountId: "another-account", revision: 2, environment: "test" }]) {
    assert.equal((await cache(next, fetch))[0].id, `brand-${calls}`);
  }
  assert.equal(calls, 4);
});

test("failed brand reads share sixty-second cooldown and do not reuse another account", async () => {
  let now = 0; let failures = 0;
  const cache = createPaymentBrandsCache(() => now);
  await cache(connection, async () => [method()]);
  const other = { ...connection, accountId: "another-account" };
  const fail = async () => { failures++; throw new Error("synthetic-private-upstream-error"); };
  await assert.rejects(cache(other, fail));
  assert.deepEqual(await cache(other, fail), []);
  assert.equal(failures, 1);
  now = 60_000;
  await assert.rejects(cache(other, fail));
  assert.equal(failures, 2);
});

test("an old in-flight request cannot overwrite a newer account cache", async () => {
  const cache = createPaymentBrandsCache();
  let complete!: (methods: unknown) => void;
  const old = cache(connection, () => new Promise(resolve => { complete = resolve; }));
  const other = { ...connection, accountId: "new-account" };
  await cache(other, async () => [method("new")]);
  complete([method("old")]);
  await old;
  assert.equal((await cache(other, async () => { throw new Error("must remain cached"); }))[0].id, "new");
});

test("alternating connection keys keep one pending request per key", async () => {
  const cache = createPaymentBrandsCache(); let calls = 0;
  const complete: ((methods: unknown) => void)[] = [];
  const fetch = () => { calls++; return new Promise<unknown>(resolve => { complete.push(resolve); }); };
  const first = cache(connection, fetch);
  await cache({ ...connection, revision: 2 }, async () => [method("new")]);
  const second = cache(connection, fetch);
  await Promise.resolve();
  for (const resolve of complete) resolve([method("old")]);
  const results = await Promise.all([first, second]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(calls, 1, "A pending -> B -> A must share the original A request");
});

test("alternating connection keys preserve the original failure cooldown", async () => {
  const cache = createPaymentBrandsCache(() => 0); let calls = 0;
  const fail = async () => { calls++; throw new Error("synthetic-upstream-error"); };
  await assert.rejects(cache(connection, fail));
  await cache({ ...connection, revision: 2 }, async () => [method("new")]);
  assert.deepEqual(await cache(connection, fail), []);
  assert.equal(calls, 1, "A cooldown -> B -> A must not bypass the sixty-second cooldown");
});
