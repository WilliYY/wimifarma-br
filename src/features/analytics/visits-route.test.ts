import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { NextRequest, type NextResponse } from "next/server";

const cookieName = "wimi-visitor";
const id = "12345678-1234-4123-8123-123456789012";
type Visit = { sessionId: string; views: number; firstPath: string; lastPath: string; ipHash?: string | null; referrer?: string | null };
type Upsert = { where: { sessionId: string }; create: Omit<Visit, "views">; update: { lastPath: string; views: { increment: number } } };
const bundlePromise = build({ entryPoints: ["src/app/api/visitas/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "visits-fixture", setup(builder) {
  builder.onResolve({ filter: /lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const getPrisma=()=>globalThis.fixture.db;" }));
} }] });

async function harness(secret: string | null = "synthetic-visitor-secret") {
  const visits = new Map<string, Visit>();
  const bundle = await bundlePromise;
  const loaded = { exports: {} as { POST: (request: NextRequest) => Promise<NextResponse> } };
  const db = { siteVisit: { upsert: async ({ where, create, update }: Upsert) => {
    const existing = visits.get(where.sessionId);
    if (existing) { existing.views += update.views.increment; existing.lastPath = update.lastPath; }
    else visits.set(where.sessionId, { ...create, views: 1 });
  } } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, Request, Response, Buffer, Date, console, TextDecoder, Uint8Array, setTimeout, clearTimeout, process: { env: { AUTH_URL: "https://example.com", AUTH_SECRET: secret } }, fixture: { db } });
  const post = (sessionId: unknown = id, token?: string, path = "/", origin = "https://example.com") => {
    const headers = new Headers({ "Content-Type": "application/json", "Origin": origin, "x-real-ip": "192.0.2.1" });
    if (token) headers.set("Cookie", `${cookieName}=${token}`);
    return loaded.exports.POST(new NextRequest("https://example.com/api/visitas", { method: "POST", headers, body: JSON.stringify({ sessionId, path, referrer: "https://example.com/?email=private@example.com" }) }));
  };
  return { visits, post };
}

test("F5, reopening and returns count one browser and separate page views", async () => {
  const f = await harness();
  const first = await f.post();
  const token = first.cookies.get(cookieName)?.value;
  assert.ok(token, "persistent signed visitor cookie must be issued");
  await f.post(id, token);
  await f.post(undefined, token, "/ofertas");
  await f.post("another-local-id-123", token, "/contato");
  const returning = await f.post(null, token);
  assert.equal((await returning.json()).visitorId, id);
  assert.equal(f.visits.size, 1);
  assert.equal(f.visits.get(id)?.views, 5);
  assert.equal(f.visits.get(id)?.firstPath, "/");
  assert.equal(f.visits.get(id)?.lastPath, "/");
  assert.match(first.headers.get("set-cookie") ?? "", /HttpOnly/i);
  assert.match(first.headers.get("set-cookie") ?? "", /Secure/i);
  assert.match(first.headers.get("set-cookie") ?? "", /SameSite=lax/i);
  assert.match(first.headers.get("set-cookie") ?? "", /Max-Age=31536000/i);
});

test("simultaneous page requests for the same identity retain one visitor", async () => {
  const f = await harness();
  await Promise.all(Array.from({ length: 25 }, () => f.post()));
  assert.equal(f.visits.size, 1);
  assert.equal(f.visits.get(id)?.views, 25);
});

test("legacy local identity survives introduction of the cookie", async () => {
  const f = await harness();
  const legacy = "visit-1780000000000-oldbrowser";
  await f.post(legacy);
  const response = await f.post(legacy);
  await f.post(null, response.cookies.get(cookieName)?.value);
  assert.equal(f.visits.size, 1);
  assert.equal(f.visits.get(legacy)?.views, 3);
});

test("different browser identities remain distinct", async () => {
  const f = await harness();
  await f.post();
  await f.post("23456789-1234-4123-8123-123456789012");
  assert.equal(f.visits.size, 2);
});

test("blocked local storage uses a server identity and cookie on subsequent pages", async () => {
  const f = await harness();
  const first = await f.post(null);
  const token = first.cookies.get(cookieName)?.value;
  assert.ok(token);
  const visitorId = (await first.json()).visitorId;
  assert.match(visitorId, /^[a-f0-9-]{36}$/);
  await f.post(null, token, "/ofertas");
  assert.equal(f.visits.size, 1);
  assert.equal(f.visits.get(visitorId)?.views, 2);
});

test("query strings and fragments never enter stored page paths", async () => {
  const f = await harness();
  await f.post(id, undefined, "/ofertas?email=private@example.com#secret");
  assert.equal(f.visits.get(id)?.firstPath, "/ofertas");
  await f.post(id, undefined, "//external.example/private");
  assert.equal(f.visits.get(id)?.lastPath, "/");
});

test("invalid cookies are replaced and visitor data omits IP and referrer query", async () => {
  const f = await harness();
  const response = await f.post(id, "tampered-cookie");
  assert.equal(response.status, 200);
  assert.ok(response.cookies.get(cookieName)?.value);
  assert.equal(f.visits.get(id)?.ipHash, undefined);
  assert.equal(f.visits.get(id)?.referrer, "https://example.com");
});

test("foreign-origin requests and missing signing secret do not write visits", async () => {
  const f = await harness();
  assert.equal((await f.post(id, undefined, "/", "https://foreign.example")).status, 403);
  assert.equal(f.visits.size, 0);
  const unconfigured = await harness(null);
  assert.equal((await unconfigured.post()).status, 503);
  assert.equal(unconfigured.visits.size, 0);
});
