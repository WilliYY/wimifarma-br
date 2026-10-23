import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/components/admin/admin-order-notice.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
type Summary = { pending: number; latestId: string | null; latestCreatedAt: string | null };
const summary = (id: string | null, pending = 2, time = "2026-10-22T12:00:00Z"): Summary => ({ pending, latestId: id, latestCreatedAt: id ? time : null });
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

async function fixture(initial: Summary = summary("original")) {
  const nativeRequire = createRequire(import.meta.url);
  const effects: (() => (() => void) | void)[] = [];
  const state: unknown[] = []; let cursor = 0; let refreshes = 0; let nextTimer = 0;
  const timers = new Map<number, { callback: () => void; ms: number; interval: boolean }>();
  const listeners = new Map<string, () => void>();
  const document = { visibilityState: "visible", addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: (name: string) => listeners.delete(name) };
  let fetcher: (signal: AbortSignal) => Promise<Response> = async () => Response.json({ data: initial });
  let calls = 0; const signals: AbortSignal[] = [];
  const clock = {
    setInterval: (callback: () => void, ms: number) => { const id = ++nextTimer; timers.set(id, { callback, ms, interval: true }); return id; },
    clearInterval: (id: number) => timers.delete(id),
    setTimeout: (callback: () => void, ms: number) => { const id = ++nextTimer; timers.set(id, { callback, ms, interval: false }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const loaded = { exports: {} as { AdminOrderNotice: () => unknown } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, AbortController, document, window: clock, ...clock,
    fetch: async (url: string, options: { cache: string; signal: AbortSignal }) => { assert.equal(url, "/api/admin/pedidos/resumo"); assert.equal(options.cache, "no-store"); calls++; signals.push(options.signal); return fetcher(options.signal); },
    require: (id: string) => id === "react" ? {
      useState: (initialValue: unknown) => { const index = cursor++; if (!(index in state)) state[index] = initialValue; return [state[index], (value: unknown) => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
      useEffect: (effect: () => (() => void) | void) => effects.push(effect),
    } : id === "next/navigation" ? { useRouter: () => ({ refresh: () => refreshes++ }) } : id === "next/link" ? { default: "a", __esModule: true } : id === "lucide-react" ? { ShoppingBag: "svg" } : id === "react/jsx-runtime" ? { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) } : nativeRequire(id),
  });
  const render = () => { cursor = 0; return JSON.stringify(loaded.exports.AdminOrderNotice()); };
  render(); const cleanup = effects[0](); await settle();
  return {
    render, timers, signals, listeners,
    calls: () => calls, refreshes: () => refreshes,
    respond: (value: Summary) => { fetcher = async () => Response.json({ data: value }); },
    invalid: () => { fetcher = async () => Response.json({ data: { pending: -1 } }); },
    fail: () => { fetcher = async () => { throw new Error("network"); }; },
    delay: () => { fetcher = signal => new Promise((_, reject) => { signal.addEventListener("abort", () => reject(new Error("aborted"))); }); },
    hidden: (hidden: boolean) => { document.visibilityState = hidden ? "hidden" : "visible"; listeners.get("visibilitychange")?.(); },
    tick: async (ms = 30000) => { for (const [id, timer] of [...timers]) if (timer.ms === ms) { if (!timer.interval) timers.delete(id); timer.callback(); } await settle(); },
    cleanup: () => { if (typeof cleanup === "function") cleanup(); },
  };
}

test("notice uses an initial baseline then refreshes SSR only for a newer order", async () => {
  const f = await fixture();
  assert.equal(f.refreshes(), 0); assert.match(f.render(), /Pedidos/); assert.doesNotMatch(f.render(), /Novo pedido recebido/);
  await f.tick(); assert.equal(f.refreshes(), 0);
  f.respond(summary("new", 3, "2026-10-22T12:01:00Z")); await f.tick();
  assert.equal(f.refreshes(), 1); assert.match(f.render(), /Novo pedido recebido/); assert.match(f.render(), /aria-live/);
  await f.tick(); assert.equal(f.refreshes(), 1);
  f.respond(summary("original")); await f.tick(); assert.equal(f.refreshes(), 1);
  f.cleanup();
});

test("empty baseline detects a first order and failures preserve the last counter", async () => {
  const f = await fixture(summary(null, 0));
  f.respond(summary("first", 4)); await f.tick(); assert.equal(f.refreshes(), 1);
  f.fail(); await f.tick(); assert.match(f.render(), /indisponível/); assert.match(f.render(), /4/);
  f.invalid(); await f.tick(); assert.match(f.render(), /indisponível/); assert.match(f.render(), /4/);
  f.cleanup();
});

test("polling pauses hidden tabs, prevents overlapping requests and cleans timers and aborts", async () => {
  const f = await fixture();
  f.hidden(true); await f.tick(); assert.equal(f.calls(), 1);
  f.delay(); f.hidden(false); await settle(); assert.equal(f.calls(), 2);
  await f.tick(); assert.equal(f.calls(), 2);
  await f.tick(10000); assert.equal(f.signals[1].aborted, true); assert.match(f.render(), /indisponível/);
  await f.tick(); assert.equal(f.calls(), 3);
  f.cleanup(); await settle(); assert.equal(f.signals[2].aborted, true); assert.equal(f.timers.size, 0); assert.equal(f.listeners.size, 0);
});
