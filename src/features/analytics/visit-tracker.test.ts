import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/components/site/site-visit-tracker.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "tracker-lifecycle", setup(builder) {
  builder.onResolve({ filter: /^react$|^next\/navigation$|analytics\/visitor-client$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "react" ? "export const useEffect=globalThis.fixture.effect;"
    : args.path === "next/navigation" ? "export const usePathname=()=>'/ofertas';"
    : "export const getVisitSessionId=async()=> 'synthetic-browser';export const rememberVisitSessionId=()=>{};" }));
} }] });

async function fixture(hidden = false) {
  const callbacks = new Map<string, () => void>();
  const intervals = new Map<number, () => void>();
  const requests: { body: { type?: string; path?: string }; signal: AbortSignal }[] = [];
  let cleanup: (() => void) | undefined;
  let timer = 0;
  let fail = false;
  const doc = { visibilityState: hidden ? "hidden" : "visible", referrer: "", addEventListener: (event: string, callback: () => void) => callbacks.set(event, callback), removeEventListener: (event: string) => callbacks.delete(event) };
  const navigator = { onLine: true };
  const window = { location: { pathname: "/ofertas" }, navigator, addEventListener: doc.addEventListener, removeEventListener: doc.removeEventListener };
  const loaded = { exports: {} as { SiteVisitTracker: () => null } };
  vm.runInNewContext((await bundle).outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), AbortController, document: doc, navigator, window,
    setInterval: (callback: () => void, ms: number) => { assert.equal(ms, 30_000); intervals.set(++timer, callback); return timer; },
    clearInterval: (id: number) => intervals.delete(id), setTimeout: () => ++timer, clearTimeout: () => {},
    fetch: async (_url: string, options: { body: string; signal: AbortSignal }) => {
      requests.push({ body: JSON.parse(options.body), signal: options.signal });
      if (fail) throw new Error("offline");
      return { ok: true, json: async () => ({ visitorId: "synthetic-browser" }) };
    },
    fixture: { effect: (setup: () => () => void) => { cleanup = setup(); } },
  });
  loaded.exports.SiteVisitTracker();
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  await settle();
  return { doc, navigator, requests, intervals, callbacks, settle, tick: async () => { for (const fn of intervals.values()) fn(); await settle(); }, cleanup: () => cleanup!(), fail: (value: boolean) => { fail = value; } };
}

test("visible tracker records one page view then presence only; pauses hidden/offline and cleans timers", async () => {
  const f = await fixture(true);
  assert.equal(f.requests.length, 0);
  f.doc.visibilityState = "visible";
  f.callbacks.get("visibilitychange")!();
  await f.settle();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].body.path, "/ofertas");
  await f.tick();
  assert.deepEqual(f.requests[1].body, { type: "heartbeat" });
  f.doc.visibilityState = "hidden";
  await f.tick();
  assert.equal(f.requests.length, 2);
  f.doc.visibilityState = "visible";
  f.navigator.onLine = false;
  await f.tick();
  assert.equal(f.requests.length, 2);
  f.navigator.onLine = true;
  f.callbacks.get("online")!();
  await f.settle();
  assert.equal(f.requests.length, 3);
  f.cleanup();
  assert.equal(f.intervals.size, 0);
  assert.equal(f.callbacks.size, 0);
  assert.equal(f.requests.at(-1)!.signal.aborted, true);
});

test("failed registration retries on schedule without turning it into an unsigned heartbeat", async () => {
  const f = await fixture(true);
  f.fail(true);
  f.doc.visibilityState = "visible";
  await f.tick();
  assert.equal(f.requests.length, 1);
  f.fail(false);
  await f.tick();
  assert.equal(f.requests[1].body.type, undefined);
  await f.tick();
  assert.equal(f.requests[2].body.type, "heartbeat");
  f.cleanup();
});
