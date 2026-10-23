import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/components/admin/admin-order-notice.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
type Summary = { pending: number; latestId: string | null; latestCreatedAt: string | null; orders: { id: string; number: string; createdAt: string }[] };
const summary = (id: string | null, pending = 2, time = "2026-10-22T12:00:00Z"): Summary => ({ pending, latestId: id, latestCreatedAt: id ? time : null, orders: id ? [{ id, number: `SYNTH-${id}`, createdAt: time }] : [] });
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

async function fixture(initial: Summary = summary("original"), storage = new Map<string, string>(), denied = false, viewerKey = "synthetic-operator") {
  const nativeRequire = createRequire(import.meta.url);
  const effects: (() => (() => void) | void)[] = [];
  const state: unknown[] = []; let cursor = 0; let refreshes = 0; let nextTimer = 0;
  const timers = new Map<number, { callback: () => void; ms: number; interval: boolean }>();
  const listeners = new Map<string, () => void>();
  const document = { visibilityState: "visible", addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: (name: string) => listeners.delete(name) };
  let fetcher: (signal: AbortSignal) => Promise<Response> = async () => Response.json({ data: initial });
  let calls = 0; const signals: AbortSignal[] = [];
  const clock = {
    localStorage: { getItem: (key: string) => { if (denied) throw new Error("denied"); return storage.get(key) ?? null; }, setItem: (key: string, value: string) => { if (denied) throw new Error("denied"); storage.set(key, value); } },
    setInterval: (callback: () => void, ms: number) => { const id = ++nextTimer; timers.set(id, { callback, ms, interval: true }); return id; },
    clearInterval: (id: number) => timers.delete(id),
    setTimeout: (callback: () => void, ms: number) => { const id = ++nextTimer; timers.set(id, { callback, ms, interval: false }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const loaded = { exports: {} as { AdminOrderNotice: (props: { viewerKey: string }) => unknown; readNoticeIds: (raw: string | null) => string[] } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, AbortController, document, window: clock, ...clock,
    fetch: async (url: string, options: { cache: string; signal: AbortSignal }) => { assert.equal(url, "/api/admin/pedidos/resumo"); assert.equal(options.cache, "no-store"); calls++; signals.push(options.signal); return fetcher(options.signal); },
    require: (id: string) => id === "react" ? {
      useState: (initialValue: unknown) => { const index = cursor++; if (!(index in state)) state[index] = initialValue; return [state[index], (value: unknown) => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
      useEffect: (effect: () => (() => void) | void) => effects.push(effect),
      useRef: (value: unknown) => { const index = cursor++; if (!(index in state)) state[index] = { current: value }; return state[index]; },
      useId: () => "notice-panel",
    } : id === "next/navigation" ? { useRouter: () => ({ refresh: () => refreshes++ }) } : id === "next/link" ? { default: "a", __esModule: true } : id === "lucide-react" ? { ShoppingBag: "svg", Check: "svg", X: "svg" } : id === "react/jsx-runtime" ? { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) } : nativeRequire(id),
  });
  const tree = () => { cursor = 0; return loaded.exports.AdminOrderNotice({ viewerKey }); };
  const render = () => JSON.stringify(tree());
  const click = (name: string) => {
    const visit = (node: unknown): boolean => {
      if (!node || typeof node !== "object") return false;
      const element = node as { type: string; props: { children?: unknown; onClick?: () => void } };
      if (element.type === "button" && element.props && JSON.stringify(element.props.children)?.includes(name)) { element.props.onClick?.(); return true; }
      return (Array.isArray(node) ? node : Object.values(node)).some(visit);
    };
    assert.ok(visit(tree()), `button ${name}`);
  };
  render(); const cleanup = effects[0](); await settle();
  return {
    render, click, timers, signals, listeners, storage, readNoticeIds: loaded.exports.readNoticeIds,
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
  assert.equal(f.refreshes(), 0); assert.match(f.render(), /Pedidos/); assert.doesNotMatch(f.render(), /Avisos de pedidos/);
  await f.tick(); assert.equal(f.refreshes(), 0);
  f.respond(summary("new", 3, "2026-10-22T12:01:00Z")); await f.tick();
  assert.equal(f.refreshes(), 1); assert.match(f.render(), /Pedido.*SYNTH-new.*foi realizado/); assert.match(f.render(), /aria-live/);
  assert.match(f.render(), /pedido=new/);
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

test("baseline opens on demand; marking stores only IDs and preserves the server counter", async () => {
  const storage = new Map<string, string>();
  const f = await fixture(summary("baseline", 42), storage);
  assert.doesNotMatch(f.render(), /Avisos de pedidos/);
  f.click("Pedidos");
  assert.match(f.render(), /Pedido.*SYNTH-baseline.*foi realizado/);
  f.click("Marcar visualizado");
  assert.match(f.render(), /42 pedidos novos pendentes/);
  assert.match(f.render(), /Nenhum aviso não visualizado/);
  assert.deepEqual(JSON.parse([...storage.values()][0]), ["baseline"]);
  assert.equal(f.refreshes(), 0);
  assert.equal(f.calls(), 1);
  f.cleanup();
  const same = await fixture(summary("baseline"), storage);
  same.click("Pedidos"); assert.match(same.render(), /Nenhum aviso não visualizado/); same.cleanup();
  const other = await fixture(summary("baseline"), storage, false, "other-operator");
  other.click("Pedidos"); assert.match(other.render(), /Pedido.*SYNTH-baseline.*foi realizado/); other.cleanup();
});

test("denied storage keeps acknowledgement usable and removed pending orders expire from the notice", async () => {
  const f = await fixture(summary("old"), new Map(), true);
  f.click("Pedidos"); f.click("Marcar visualizado");
  assert.match(f.render(), /Nenhum aviso não visualizado/);
  f.respond(summary("new", 3, "2026-10-22T12:01:00Z")); await f.tick();
  assert.match(f.render(), /Pedido.*SYNTH-new.*foi realizado/);
  f.respond(summary(null, 0)); await f.tick();
  assert.match(f.render(), /Nenhum aviso não visualizado/);
  assert.doesNotMatch(f.render(), /SYNTH-new/); f.cleanup();
});

test("local IDs are bounded and invalid storage or server lists do not leak into the notice", async () => {
  const f = await fixture();
  for (const raw of [null, "{", "{}", "x".repeat(20001)]) assert.equal(f.readNoticeIds(raw).length, 0);
  const ids = f.readNoticeIds(JSON.stringify([...Array.from({ length: 150 }, (_, i) => `id-${i}`), "id-149", 3, null, "", "x".repeat(81)]));
  assert.equal(ids.length, 100); assert.equal(ids[0], "id-50"); assert.equal(ids[99], "id-149");
  for (const orders of [Array.from({ length: 11 }, () => summary("original").orders[0]), [summary("original").orders[0], summary("original").orders[0]], [{ ...summary("original").orders[0], createdAt: "invalid" }]]) {
    f.respond({ ...summary("original"), orders }); await f.tick();
    assert.match(f.render(), /indisponível/); assert.equal(f.refreshes(), 0);
  }
  f.cleanup();
});
