import assert from "node:assert/strict";
import test from "node:test";
import { createProductSuggestionCache, productSuggestionCacheKey } from "./ai-suggestion-cache";

const input = { ean: "7891000248768", name: "Produto Sintético M 40", brand: "Sintética", knownCategories: ["Higiene"] };
const key = (data = input, model = "model-test", credential = "synthetic-secret") => productSuggestionCacheKey(data, model, credential);

test("cache identity isolates exact EAN, presentation, brand, categories, model and credential", () => {
  const original = key();
  for (const other of [
    key({ ...input, ean: "4005808808282" }), key({ ...input, name: "Produto Sintético G 40" }),
    key({ ...input, brand: "Outra" }), key({ ...input, knownCategories: ["Fraldas"] }),
    key(input, "another-model"), key(input, "model-test", "another-secret"),
  ]) assert.notEqual(other, original);
  assert.match(original, /^[a-f0-9]{64}$/);
  assert.equal(key(), original);
  assert.ok(!original.includes("synthetic-secret"));
});

test("parallel identical research calls share one request and independent result objects", async () => {
  const cache = createProductSuggestionCache<{ confidence: string; value: string[] }>();
  let calls = 0;
  let finish!: (value: { confidence: string; value: string[] }) => void;
  const load = () => { calls++; return new Promise<{ confidence: string; value: string[] }>(resolve => { finish = resolve; }); };
  const first = cache(key(), load);
  const second = cache(key(), load);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish({ confidence: "high", value: ["source"] });
  const [a, b] = await Promise.all([first, second]);
  a.value.push("changed");
  assert.deepEqual(b.value, ["source"]);
  assert.deepEqual((await cache(key(), load)).value, ["source"]);
  assert.equal(calls, 1);
});

test("failed research is never cached and releases inflight capacity for retry", async () => {
  const cache = createProductSuggestionCache({ maxInflight: 1 });
  let calls = 0;
  const fail = async () => { calls++; throw new Error("synthetic provider failure"); };
  await assert.rejects(cache(key(), fail), /synthetic provider failure/);
  await assert.rejects(cache(key(), fail), /synthetic provider failure/);
  assert.equal(calls, 2);
  assert.deepEqual(await cache(key(), async () => ({ confidence: "high" })), { confidence: "high" });
});

test("high confidence expires after 24h and uncertain results after 5min without sliding TTL", async () => {
  for (const [confidence, ttl] of [["high", 86_400_000], ["medium", 300_000], ["low", 300_000]] as const) {
    let time = 0;
    let calls = 0;
    const cache = createProductSuggestionCache({ now: () => time });
    const load = async () => { calls++; return { confidence }; };
    await cache(key(), load);
    time = ttl - 1;
    await cache(key(), load);
    assert.equal(calls, 1);
    time = ttl;
    await cache(key(), load);
    assert.equal(calls, 2);
  }
});

test("bounded cache evicts least recently used results and rejects excessive independent inflight requests", async () => {
  const cache = createProductSuggestionCache({ maxEntries: 2, maxInflight: 1 });
  const calls: string[] = [];
  const load = (id: string) => async () => { calls.push(id); return { confidence: "high" }; };
  await cache("A", load("A")); await cache("B", load("B"));
  await cache("A", load("A")); await cache("C", load("C"));
  await cache("B", load("B"));
  assert.deepEqual(calls, ["A", "B", "C", "B"]);
  let finish!: (value: { confidence: string }) => void;
  const pending = cache("D", () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();
  await assert.rejects(cache("E", load("E")), /Pesquisa de produtos ocupada/);
  finish({ confidence: "high" });
  await pending;
  await cache("E", load("E"));
});

test("oversized responses are returned but never retained", async () => {
  const cache = createProductSuggestionCache<{ confidence: string; value: string }>();
  let calls = 0;
  const load = async () => { calls++; return { confidence: "high", value: "x".repeat(256 * 1024) }; };
  await cache(key(), load); await cache(key(), load);
  assert.equal(calls, 2);
});
