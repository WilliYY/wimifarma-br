import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundlePromise = build({ entryPoints: ["src/components/site/cart-provider.tsx"], bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", packages: "external", plugins: [{ name: "cart-client-fixture", setup(builder) {
  builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "const hooks=globalThis.fixture; export const createContext=()=>({Provider:()=>null}); export const useContext=()=>null; export const useState=hooks.useState; export const useRef=hooks.useRef; export const useEffect=hooks.useEffect; export const useMemo=(fn)=>fn(); export const useCallback=(fn)=>fn;" }));
} }] });

async function harness() {
  const refs: { current: unknown }[] = [];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const requests: { items: { productId: string; quantity: number }[] }[] = [];
  let items: { id: string; quantity: number; unitPriceCents: number }[] = [];
  let refIndex = 0;
  let stateIndex = 0;
  let nextTimer = 0;
  let effects: (() => (() => void) | void)[] = [];
  let cleanup: (() => void) | void;
  let nextResponse: Promise<{ ok: boolean; status: number }> | undefined;
  const hooks = {
    useState: () => [stateIndex++ === 0 ? items : true, () => {}],
    useRef: (value: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
    useEffect: (effect: () => (() => void) | void) => effects.push(effect),
  };
  const loaded = { exports: {} as { CartProvider: (props: { children: null }) => unknown } };
  const bundle = await bundlePromise;
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture: hooks,
    setTimeout: (callback: () => void, delay: number) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    fetch: async (_url: string, options: { body: string }) => { requests.push(JSON.parse(options.body)); const response = nextResponse; nextResponse = undefined; return response ? await response : { ok: true, status: 200 }; },
  });
  const render = (quantity = 0) => {
    cleanup?.(); items = quantity ? [{ id: "synthetic-product", quantity, unitPriceCents: 1000 }] : [];
    refIndex = 0; stateIndex = 0; effects = []; loaded.exports.CartProvider({ children: null }); cleanup = effects[2]();
  };
  const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
  const tick = async (delay: number) => {
    for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
    await flush();
  };
  const holdResponse = () => { let resolve!: (response: { ok: boolean; status: number }) => void; nextResponse = new Promise(done => { resolve = done; }); return async () => { resolve({ ok: true, status: 200 }); await flush(); }; };
  return { render, tick, requests, holdResponse };
}

test("initial empty cart synchronizes cancellation once and repeated empty renders do not repeat it", async () => {
  const f = await harness(); f.render(); await f.tick(0);
  assert.deepEqual(f.requests, [{ items: [] }]);
  f.render(); await f.tick(0); assert.equal(f.requests.length, 1);
});

test("clearing before a cart request is queued never sends products", async () => {
  const f = await harness(); f.render(1); f.render(); await f.tick(0); await f.tick(30_000);
  assert.deepEqual(f.requests, [{ items: [] }]);
});

test("clearing a synchronized cart sends one cancellation and never a repeated empty alert", async () => {
  const f = await harness(); f.render(1); await f.tick(30_000); f.render(); await f.tick(0);
  assert.deepEqual(f.requests.map(request => request.items.length), [1, 0]);
  f.render(); await f.tick(0); assert.equal(f.requests.length, 2);
});

test("clearing a second in-flight cart cancels it even when the last synchronized cart was empty", async () => {
  const f = await harness(); f.render(1); await f.tick(30_000); f.render(); await f.tick(0);
  const release = f.holdResponse(); f.render(2); await f.tick(30_000);
  f.render(); await f.tick(0); assert.equal(f.requests.length, 3);
  await release();
  assert.deepEqual(f.requests.map(request => request.items.length), [1, 0, 1, 0]);
});
