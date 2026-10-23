import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

type User = { id: string; passwordHash: string; isActive: boolean; customerId: string | null; name: string; email: string };
type Customer = { id: string; passwordHash: string | null; status: string; createdAt: Date; passwordSetAt?: Date };
type State = { customer: Customer | null; user: User | null };
type Options = { customerHash?: string | null; userHash?: string | null; inactive?: boolean; customerInactive?: boolean; race?: (state: State) => void; failUserWrite?: boolean; failCommit?: boolean; failHash?: boolean; failPrisma?: boolean; unrelatedUser?: boolean; casFailure?: "customer" | "user" };
const sources = new Map<string, Promise<string>>();
const customerId = "synthetic-customer";
const originalHash = "synthetic-local-hash";
const nextHash = "synthetic-next-hash";
const currentPassword = "Synthetic-current-42!";
const nextPassword = "Synthetic-next-42!";

function source(path: string) {
  if (!sources.has(path)) sources.set(path, build({
    entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "isolated-linked-password", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|^bcryptjs$|components\/site\/customer-account-panel$|features\/cashback\/service$|features\/orders\/customer-orders-service$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path.endsWith("auth") ? "export const auth=globalThis.fixture.auth;" :
        args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.getPrisma();" :
        args.path === "bcryptjs" ? "export const hash=globalThis.fixture.hash;export const compare=globalThis.fixture.compare;" :
        args.path.endsWith("customer-account-panel") ? "export function CustomerAccountPanel(){}" :
        args.path.endsWith("customer-orders-service") ? "export const getCustomerOrders=async()=>({});" : "export const getCustomerCashback=async()=>({});",
      }));
    } }],
  }).then(result => result.outputFiles[0].text));
  return sources.get(path)!;
}

async function harness(options: Options = {}) {
  let state: State = {
    customer: { id: customerId, passwordHash: options.customerHash ?? null, status: options.customerInactive ? "BLOCKED" : "ACTIVE", createdAt: new Date("2026-01-01") },
    user: options.userHash === null ? null : { id: "synthetic-user", passwordHash: options.userHash ?? originalHash, isActive: !options.inactive, customerId: options.unrelatedUser ? "synthetic-other-customer" : customerId, name: "Synthetic", email: "synthetic@example.test" },
  };
  let insideTransaction = false;
  const events: string[] = [];
  const diagnostics: unknown[][] = [];
  const linked = (current: State) => current.user?.customerId === current.customer?.id ? current.user : null;
  const models = (current: State) => ({
    $queryRaw: async (sql: TemplateStringsArray) => { assert.ok(insideTransaction); events.push(sql.join("").includes('"User"') ? "lock-user" : "lock-customer"); return []; },
    customer: {
      findUnique: async () => current.customer ? { ...current.customer, staffAccess: linked(current) ? { ...linked(current)! } : null } : null,
      create: async ({ data }: { data: Partial<Customer> }) => (current.customer = { id: customerId, passwordHash: null, status: "ACTIVE", createdAt: new Date(), ...data }),
      update: async ({ data }: { data: Partial<Customer> }) => { events.push("customer-write"); Object.assign(current.customer!, data); return current.customer; },
      updateMany: async ({ where, data }: { where: Partial<Customer>; data: Partial<Customer> }) => {
        if (options.casFailure === "customer") return { count: 0 };
        if (!current.customer || Object.entries(where).some(([key, value]) => current.customer![key as keyof Customer] !== value)) return { count: 0 };
        events.push("customer-write"); Object.assign(current.customer, data); return { count: 1 };
      },
    },
    user: {
      findUnique: async () => current.user ? { ...current.user } : null,
      update: async ({ data }: { data: Partial<User> }) => { events.push("user-write"); Object.assign(current.user!, data); return current.user; },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<User> }) => {
        if (options.casFailure === "user") return { count: 0 };
        if (options.failUserWrite) throw new Error("synthetic-private-database-error");
        if (!current.user || Object.entries(where).some(([key, value]) => typeof value === "object" && value !== null ? current.user![key as keyof User] === (value as { not: unknown }).not : current.user![key as keyof User] !== value)) return { count: 0 };
        events.push("user-write"); Object.assign(current.user, data); return { count: 1 };
      },
    },
  });
  const prisma = {
    ...models(state),
    $transaction: async (callback: (tx: ReturnType<typeof models>) => Promise<unknown>) => {
      options.race?.(state);
      const pending = structuredClone(state);
      insideTransaction = true;
      try { const result = await callback(models(pending)); if (options.failCommit) throw new Error("synthetic-serialization-error"); state = pending; return result; }
      finally { insideTransaction = false; }
    },
  };
  async function load(path: string) {
    const loaded = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
    vm.runInNewContext(await source(path), {
      module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, Headers, TextEncoder, TextDecoder, Uint8Array, console: { ...console, error: (...args: unknown[]) => diagnostics.push(args) }, process, Buffer, Date, setTimeout, clearTimeout,
      fixture: { getPrisma: () => { if (options.failPrisma) throw new Error("synthetic-private-prisma-unavailable"); return prisma; }, auth: async () => ({ user: { id: "synthetic-user", role: "ADMIN", customerId } }),
        compare: async (password: string, hash: string) => { assert.equal(insideTransaction, false); events.push(`compare:${hash}`); return password === currentPassword && hash === originalHash; },
        hash: async () => { assert.equal(insideTransaction, false); events.push("hash"); if (options.failHash) throw new Error("synthetic-private-bcrypt-error"); return nextHash; },
      },
    });
    return loaded.exports;
  }
  return { events, diagnostics, state: () => state, load,
    run: async (password?: string) => {
      const route = await load("src/app/api/minha-conta/password/route.ts");
      return await route.PATCH(new Request("https://example.test/api/minha-conta/password", { method: "PATCH", body: JSON.stringify({ password: nextPassword, confirmPassword: nextPassword, ...(password === undefined ? {} : { currentPassword: password }) }) })) as Response;
    },
    join: async (userHash: string) => {
      state.customer = null; state.user!.customerId = null; state.user!.passwordHash = userHash;
      const club = await load("src/features/club/service.ts");
      return prisma.$transaction(tx => club.resolveClubCustomer(tx, { user: { id: "synthetic-user", role: "ADMIN" } }, true));
    },
  };
}

test("linked local password is required even when Customer has no password", async () => {
  const h = await harness(); const response = await h.run();
  assert.equal(response.status, 400);
  assert.equal(h.state().user!.passwordHash, originalHash);
  assert.equal(h.state().customer!.passwordHash, null);
});

test("linked local password overrides a divergent customer password", async () => {
  const h = await harness({ customerHash: "synthetic-stale-customer-hash" });
  assert.equal((await h.run(currentPassword)).status, 200);
  assert.ok(h.events.includes(`compare:${originalHash}`));
  assert.equal(h.state().user!.passwordHash, nextHash);
  assert.equal(h.state().customer!.passwordHash, nextHash);
  assert.ok(h.events.indexOf("hash") < h.events.indexOf("lock-user"));
  assert.ok(h.events.indexOf("lock-user") < h.events.indexOf("lock-customer"));
});

test("incorrect local password cannot rotate either credential", async () => {
  const h = await harness(); assert.equal((await h.run("Synthetic-wrong-42!")).status, 400);
  assert.equal(h.state().user!.passwordHash, originalHash); assert.equal(h.state().customer!.passwordHash, null);
});

test("Google-only marker remains unchanged when creating a customer password", async () => {
  const h = await harness({ userHash: "!GOOGLE_ONLY" }); assert.equal((await h.run()).status, 200);
  assert.equal(h.state().user!.passwordHash, "!GOOGLE_ONLY"); assert.equal(h.state().customer!.passwordHash, nextHash);
});

test("customer-only initial password and normal rotation still work", async () => {
  const initial = await harness({ userHash: null }); assert.equal((await initial.run()).status, 200);
  const normal = await harness({ userHash: null, customerHash: originalHash });
  assert.equal((await normal.run()).status, 400); assert.equal((await normal.run(currentPassword)).status, 200);
});

test("unrelated staff credential is never selected or changed", async () => {
  const h = await harness({ unrelatedUser: true }); assert.equal((await h.run()).status, 200);
  assert.equal(h.state().user!.passwordHash, originalHash);
});

test("inactive linked account cannot rotate a password", async () => {
  const h = await harness({ inactive: true }); assert.equal((await h.run(currentPassword)).status, 400);
  assert.equal(h.state().user!.passwordHash, originalHash); assert.equal(h.state().customer!.passwordHash, null);
});

test("inactive Customer cannot rotate either credential", async () => {
  const h = await harness({ customerInactive: true }); const before = structuredClone(h.state());
  assert.equal((await h.run(currentPassword)).status, 400); assert.deepEqual(h.state(), before);
});

test("Google-only staff preserves the customer password verification", async () => {
  const h = await harness({ userHash: "!GOOGLE_ONLY", customerHash: originalHash });
  assert.equal((await h.run()).status, 400);
  assert.equal((await h.run("Synthetic-wrong-42!")).status, 400);
  assert.equal((await h.run(currentPassword)).status, 200);
  assert.equal(h.state().user!.passwordHash, "!GOOGLE_ONLY");
});

for (const [name, race] of Object.entries({
  "staff password rotation": (state: State) => { state.user!.passwordHash = "synthetic-concurrent-hash"; },
  "customer password rotation": (state: State) => { state.customer!.passwordHash = "synthetic-concurrent-hash"; },
  "staff revocation": (state: State) => { state.user!.isActive = false; },
  "customer revocation": (state: State) => { state.customer!.status = "BLOCKED"; },
  "staff relinking": (state: State) => { state.user!.customerId = "synthetic-other-customer"; },
  "new staff linking": (state: State) => { state.user = { id: "synthetic-new-user", passwordHash: originalHash, isActive: true, customerId, name: "Synthetic", email: "other@example.test" }; },
})) test(`concurrent ${name} aborts without overwriting either credential`, async () => {
  const h = await harness({ race, ...(name === "new staff linking" ? { userHash: null } : {}) });
  const before = structuredClone(h.state()); race(before);
  const response = await h.run(currentPassword);
  assert.ok(response.status >= 400); assert.deepEqual(h.state(), before);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await response.text(), /hash|synthetic|GOOGLE_ONLY/);
});

for (const option of ["failUserWrite", "failCommit", "failHash", "failPrisma"] as const) test(`${option} returns 503 with a fixed sanitized diagnostic and preserves both credentials`, async () => {
  const h = await harness({ [option]: true }); const before = structuredClone(h.state());
  const response = await h.run(currentPassword); assert.equal(response.status, 503); assert.deepEqual(h.state(), before);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await response.text(), /synthetic|serialization|database|bcrypt|prisma|hash|stack/i);
  assert.deepEqual(h.diagnostics, [["Customer password update failed."]]);
});

for (const casFailure of ["customer", "user"] as const) test(`${casFailure} CAS conflict rolls back both writes`, async () => {
  const h = await harness({ casFailure }); const before = structuredClone(h.state());
  const response = await h.run(currentPassword); assert.equal(response.status, 400); assert.deepEqual(h.state(), before);
  assert.deepEqual(h.diagnostics, []);
});

test("Club copies local staff credential to new Customer", async () => {
  const h = await harness(); await h.join(originalHash);
  assert.equal(h.state().customer!.passwordHash, originalHash);
  assert.equal(h.state().user!.customerId, customerId);
});

test("Club never copies the Google-only marker to Customer", async () => {
  const h = await harness(); await h.join("!GOOGLE_ONLY");
  assert.equal(h.state().customer!.passwordHash, null);
});

test("account page exposes hasPassword for linked local staff without serializing a hash", async () => {
  const h = await harness(); const page = await h.load("src/app/(site)/minha-conta/page.tsx");
  const element = await page.default() as { props: { customer: { hasPassword: boolean } } };
  assert.equal(element.props.customer.hasPassword, true);
  assert.doesNotMatch(JSON.stringify(element.props), /synthetic-local-hash|passwordHash|staffAccess/);
});

test("account page does not treat a Google-only marker as a customer password", async () => {
  const h = await harness({ userHash: "!GOOGLE_ONLY" }); const page = await h.load("src/app/(site)/minha-conta/page.tsx");
  const element = await page.default() as { props: { customer: { hasPassword: boolean } } };
  assert.equal(element.props.customer.hasPassword, false);
  assert.doesNotMatch(JSON.stringify(element.props), /GOOGLE_ONLY|passwordHash|staffAccess/);
});
