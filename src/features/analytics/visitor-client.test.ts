import assert from "node:assert/strict";
import test from "node:test";
import { getVisitSessionId, rememberVisitSessionId, VISIT_SESSION_KEY } from "./visitor-client";

function harness(options: { blocked?: boolean; locks?: boolean } = {}) {
  const storage = new Map<string, string>();
  let generated = 0;
  let lockRequests = 0;
  let queue = Promise.resolve<unknown>(undefined);
  const browser = {
    localStorage: {
      getItem: (key: string) => { if (options.blocked) throw new Error("Storage blocked"); return storage.get(key) ?? null; },
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
    crypto: { randomUUID: () => { generated++; return `${String(generated).padStart(8, "0")}-1234-4123-8123-123456789012`; } },
    navigator: { locks: options.locks ? { request: (_name: string, action: () => unknown) => { lockRequests++; queue = queue.then(action); return queue; } } : undefined },
  } as unknown as Parameters<typeof getVisitSessionId>[0];
  return { browser, storage, generated: () => generated, lockRequests: () => lockRequests };
}

test("F5, reopened tabs and revisits reuse persistent browser identity", async () => {
  const f = harness();
  const id = await getVisitSessionId(f.browser);
  assert.equal(await getVisitSessionId({ ...f.browser }), id);
  assert.equal(await getVisitSessionId({ ...f.browser }), id);
  assert.equal(f.generated(), 1);
});

test("concurrent first tabs share one identity using the browser lock", async () => {
  const f = harness({ locks: true });
  const ids = await Promise.all(Array.from({ length: 25 }, () => getVisitSessionId({ ...f.browser })));
  assert.equal(new Set(ids).size, 1);
  assert.equal(f.generated(), 1);
  assert.equal(f.lockRequests(), 25);
});

test("existing visitor remains stable and malformed storage is replaced", async () => {
  const f = harness();
  f.storage.set(VISIT_SESSION_KEY, "visit-1780000000000-oldbrowser");
  assert.equal(await getVisitSessionId(f.browser), "visit-1780000000000-oldbrowser");
  assert.equal(f.generated(), 0);
  f.storage.set(VISIT_SESSION_KEY, "bad");
  assert.match((await getVisitSessionId(f.browser)) ?? "", /^00000001-/);
});

test("unavailable localStorage falls back to server cookie without blocking navigation", async () => {
  const f = harness({ blocked: true });
  assert.equal(await getVisitSessionId(f.browser), undefined);
  assert.equal(f.generated(), 0);
});

test("server cookie identity restores cleared local storage for future visits", async () => {
  const f = harness();
  await getVisitSessionId(f.browser);
  rememberVisitSessionId(f.browser, "visit-1780000000000-existingcookie");
  assert.equal(await getVisitSessionId(f.browser), "visit-1780000000000-existingcookie");
  rememberVisitSessionId(f.browser, "invalid");
  assert.equal(await getVisitSessionId(f.browser), "visit-1780000000000-existingcookie");
});
