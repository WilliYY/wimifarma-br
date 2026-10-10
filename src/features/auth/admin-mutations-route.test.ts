import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

type Entry = Record<string, unknown>;
type State = { users: Entry[]; credentials: Entry[]; audits: Entry[] };
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
const sources = new Map<string, Promise<string>>();
const routes = {
  users: "src/app/api/admin/usuarios/route.ts",
  credentials: "src/app/api/admin/api-senhas/route.ts",
  deleteCredential: "src/app/api/admin/api-senhas/[id]/route.ts",
};

function source(path: string) {
  if (!sources.has(path)) sources.set(path, build({
    entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "isolated-admin-mutations", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$|lib\/secret-vault$|generated\/prisma\/client$|^bcryptjs$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path.endsWith("permissions") ? "export const requireAdminOnlyApi=globalThis.fixture.guard;" :
        args.path.endsWith("lib/prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" :
        args.path.endsWith("secret-vault") ? "export const encryptValue=globalThis.fixture.encrypt; export const encryptOptionalValue=globalThis.fixture.encrypt;" :
        args.path === "bcryptjs" ? "export const hash=globalThis.fixture.hash;" : "export const Prisma={};",
      }));
    } }],
  }).then(result => result.outputFiles[0].text));
  return sources.get(path)!;
}

async function harness(route: keyof typeof routes, options: { auditFails?: boolean; revokedAt?: "body" | "hash"; actor?: Entry | null; customer?: boolean; duplicate?: boolean; missingCredential?: boolean; denied?: boolean } = {}) {
  let actor: Entry | null = options.actor === undefined ? { id: "synthetic-admin", role: "ADMIN", isActive: true } : options.actor;
  let state: State = { users: [], credentials: options.missingCredential ? [] : [{ id: "synthetic-credential", service: "Synthetic", title: "Synthetic credential" }], audits: [] };
  const events: string[] = [];
  const models = (current: State, transactional: boolean) => ({
    $queryRaw: async () => { assert.ok(transactional, "access lock must be transactional"); events.push("lock"); return []; },
    customer: { findUnique: async () => options.customer ? { id: "synthetic-customer" } : null },
    user: {
      findUnique: async () => { assert.equal(events.at(-1), "lock"); events.push("actor"); return actor; },
      create: async ({ data, select }: { data: Entry; select: Entry }) => {
        if (options.duplicate) throw Object.assign(new Error("synthetic duplicate"), { code: "P2002" });
        const user = { ...data, id: "synthetic-created-user", isActive: true };
        current.users.push(user);
        return Object.fromEntries(Object.keys(select).map(key => [key, user[key as keyof typeof user]]));
      },
    },
    secretCredential: {
      findUnique: async () => current.credentials[0] ?? null,
      create: async ({ data, select }: { data: Entry; select: Entry }) => {
        const credential = { ...data, id: "synthetic-created-credential" };
        current.credentials.push(credential);
        return Object.fromEntries(Object.keys(select).map(key => [key, credential[key as keyof typeof credential]]));
      },
      delete: async () => current.credentials.splice(0, 1)[0],
    },
    auditLog: { create: async ({ data }: { data: Entry }) => { if (options.auditFails) throw new Error("synthetic audit unavailable"); current.audits.push(data); return data; } },
  });
  const prisma = {
    ...models(state, false),
    $transaction: async (callback: (tx: ReturnType<typeof models>) => Promise<unknown>) => {
      const pending = structuredClone(state);
      const result = await callback(models(pending, true));
      state = pending;
      return result;
    },
  };
  const loaded = { exports: {} as Record<string, Handler> };
  vm.runInNewContext(await source(routes[route]), {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, TextEncoder, TextDecoder, setTimeout, clearTimeout, Uint8Array,
    fixture: {
      prisma,
      guard: async () => options.denied ? { response: Response.json({ error: "Unauthorized" }, { status: 401 }) } : { session: { user: { id: "synthetic-admin", role: "ADMIN" } } },
      hash: async () => { if (options.revokedAt === "hash") actor = { ...actor, role: "STAFF" }; return "synthetic-password-hash"; },
      encrypt: (value: unknown) => value ? { ciphertext: "synthetic-ciphertext", iv: "synthetic-iv", tag: "synthetic-tag" } : null,
    },
  });
  return {
    state: () => state, events,
    run: async (body?: Entry) => {
      const request = new Request("https://example.com/api/admin/synthetic", { method: route === "deleteCredential" ? "DELETE" : "POST", body: route === "deleteCredential" ? undefined : JSON.stringify(body ?? (route === "users" ? {
        email: "synthetic@example.com", name: "Synthetic admin", role: "ADMIN", password: "synthetic-only-password", passwordConfirmation: "synthetic-only-password",
      } : { title: "Synthetic credential", secret: "synthetic-only-secret", notes: "synthetic-only-notes" })) });
      const json = request.json.bind(request);
      request.json = async () => { const value = await json(); if (options.revokedAt === "body") actor = { ...actor, isActive: false }; return value; };
      if (request.body && options.revokedAt === "body") {
        const getReader = request.body.getReader.bind(request.body);
        request.body.getReader = (() => {
          const reader = getReader();
          const read = reader.read.bind(reader);
          reader.read = async () => { const value = await read(); actor = { ...actor, isActive: false }; return value; };
          return reader;
        }) as typeof request.body.getReader;
      }
      return loaded.exports[route === "deleteCredential" ? "DELETE" : "POST"](request, { params: Promise.resolve({ id: "synthetic-credential" }) });
    },
  };
}

test("admin creation rejects an actor revoked while hashing or reading the body", async () => {
  for (const revokedAt of ["body", "hash"] as const) {
    const fixture = await harness("users", { revokedAt });
    assert.equal((await fixture.run()).status, 401, revokedAt);
    assert.equal(fixture.state().users.length, 0);
    assert.equal(fixture.state().audits.length, 0);
  }
});

test("admin creation rejects deleted, inactive or demoted actors inside the shared access lock", async () => {
  for (const actor of [null, { isActive: false, role: "ADMIN" }, { isActive: true, role: "STAFF" }]) {
    const fixture = await harness("users", { actor });
    assert.equal((await fixture.run()).status, 401);
    assert.deepEqual(fixture.events, ["lock", "actor"]);
    assert.equal(fixture.state().users.length, 0);
  }
});

test("admin creation commits the user and safe audit together without disclosing password hashes", async () => {
  const fixture = await harness("users");
  const response = await fixture.run();
  assert.equal(response.status, 201);
  assert.deepEqual(fixture.events, ["lock", "actor"]);
  assert.equal(fixture.state().users.length, 1);
  assert.equal(fixture.state().users[0].passwordHash, "synthetic-password-hash");
  assert.equal(fixture.state().audits[0].action, "ADMIN_USER_CREATED");
  assert.equal(fixture.state().audits[0].userId, "synthetic-admin");
  const payload = await response.json();
  assert.equal(payload.data.name, "Synthetic admin");
  assert.equal(payload.data.email, "synthetic@example.com");
  assert.equal(payload.data.role, "ADMIN");
  assert.doesNotMatch(JSON.stringify(payload), /password|hash/i);
  assert.doesNotMatch(JSON.stringify(fixture.state().audits), /password|hash/i);
});

test("admin creation rolls back when audit fails and preserves email conflicts", async () => {
  const fixture = await harness("users", { auditFails: true });
  await assert.rejects(fixture.run(), /synthetic audit unavailable/);
  assert.equal(fixture.state().users.length, 0);
  assert.equal(fixture.state().audits.length, 0);
  for (const options of [{ customer: true }, { duplicate: true }]) {
    const conflict = await harness("users", options);
    assert.equal((await conflict.run()).status, 409);
    assert.equal(conflict.state().users.length, 0);
    assert.equal(conflict.state().audits.length, 0);
  }
});

for (const route of ["credentials", "deleteCredential"] as const) {
  test(`vault ${route} rolls back when the audit cannot be saved`, async () => {
    const fixture = await harness(route, { auditFails: true });
    const before = structuredClone(fixture.state());
    await assert.rejects(fixture.run(), /synthetic audit unavailable/);
    assert.deepEqual(fixture.state(), before, route);
  });
}

test("vault creation and deletion commit a safe audit and preserve response contracts", async () => {
  for (const route of ["credentials", "deleteCredential"] as const) {
    const fixture = await harness(route);
    const response = await fixture.run();
    assert.equal(response.status, route === "credentials" ? 201 : 200);
    assert.equal(fixture.state().credentials.length, route === "credentials" ? 2 : 0);
    assert.equal(fixture.state().audits.length, 1);
    assert.equal(fixture.state().audits[0].action, route === "credentials" ? "SECRET_CREDENTIAL_CREATED" : "SECRET_CREDENTIAL_DELETED");
    assert.equal(fixture.state().audits[0].userId, "synthetic-admin");
    assert.doesNotMatch(JSON.stringify(await response.json()), /synthetic-only-secret|synthetic-only-notes|ciphertext|secretIv|secretTag/i);
    assert.doesNotMatch(JSON.stringify(fixture.state().audits), /synthetic-only-secret|synthetic-only-notes|ciphertext|secretIv|secretTag/i);
  }
  const missing = await harness("deleteCredential", { missingCredential: true });
  assert.equal((await missing.run()).status, 404);
  assert.equal(missing.state().audits.length, 0);
});

test("admin mutations preserve authorization and input rejection without persisting changes", async () => {
  for (const route of Object.keys(routes) as (keyof typeof routes)[]) {
    const denied = await harness(route, { denied: true });
    assert.equal((await denied.run()).status, 401);
    assert.equal(denied.state().audits.length, 0);
    assert.equal(denied.state().users.length, 0);
  }
  for (const route of ["users", "credentials"] as const) {
    const fixture = await harness(route);
    assert.equal((await fixture.run({})).status, 422);
    assert.equal(fixture.state().audits.length, 0);
  }
});

test("vault rejects oversized JSON before encryption or persistence", async () => {
  const fixture = await harness("credentials");
  assert.equal((await fixture.run({ title: "Synthetic", secret: "synthetic-only", padding: "x".repeat(64_001) })).status, 400);
  assert.equal(fixture.state().credentials.length, 1);
  assert.equal(fixture.state().audits.length, 0);
});
