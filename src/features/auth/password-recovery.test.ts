import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const email = "customer@example.invalid";
const now = new Date();
const password = "Synthetic-password-42!";
const customer = {
  id: "synthetic-customer", email, status: "ACTIVE", passwordHash: "old-synthetic-hash",
  passwordRecoveryVerifiedEmail: email, passwordRecoveryVerifiedAt: now,
};
type Reset = { customerId: string; email: string; verifiedAt: Date; credentialVersion: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null };
type Verification = Omit<Reset, "verifiedAt">;
type State = { customer: typeof customer; reset: Reset | null; verification: Verification | null; staff: boolean };
type Options = {
  configured?: boolean;
  sendFails?: boolean;
  conflict?: "credential" | "consume";
  initial?: Partial<typeof customer>;
  staff?: boolean;
  role?: string;
};
const sources = new Map<string, Promise<string>>();

function source(path: string) {
  if (!sources.has(path)) sources.set(path, build({
    entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "password-recovery-fixtures", setup(builder) {
      builder.onResolve({ filter: /lib\/prisma$|communications\/password-recovery-email$|features\/auth\/auth$|^bcryptjs$|^next\/server$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "bcryptjs" ? "export const {hash,compare}=globalThis.fixture;"
        : args.path === "next/server" ? "export const after=globalThis.fixture.after; export const NextResponse={json:Response.json.bind(Response)};"
        : args.path.endsWith("lib/prisma") ? "export const getPrisma=()=>globalThis.fixture.db;"
        : args.path.endsWith("features/auth/auth") ? "export const auth=globalThis.fixture.auth;"
        : "export const {getPasswordRecoveryUrl,sendPasswordRecoveryEmail,isPasswordRecoveryEmailConfigured,sendPasswordRecoveryVerificationEmail}=globalThis.fixture;" }));
    } }],
  }).then(result => result.outputFiles[0].text));
  return sources.get(path)!;
}

async function harness(options: Options = {}) {
  let state: State = { customer: { ...customer, ...options.initial }, reset: null, verification: null, staff: options.staff ?? false };
  const sent: { recipient: string; resetUrl: string }[] = [];
  const verificationSent: { recipient: string; token: string }[] = [];
  const tasks: (() => Promise<unknown>)[] = [];
  const locks: string[] = [];
  let transaction = Promise.resolve();
  function models(current: State) {
    return {
      $queryRaw: async (query: TemplateStringsArray) => { locks.push(query.join("")); return []; },
      customer: {
        findUnique: async ({ where }: { where: { id?: string; email?: string } }) => (where.id === current.customer.id || where.email === current.customer.email) ? current.customer : null,
        updateMany: async ({ where, data }: { where: Partial<typeof customer>; data: Partial<typeof customer> }) => {
          if (options.conflict === "credential" || where.passwordHash !== current.customer.passwordHash) return { count: 0 };
          Object.assign(current.customer, data); return { count: 1 };
        },
      },
      user: { findFirst: async () => current.staff ? { id: "synthetic-staff" } : null },
      customerPasswordRecovery: {
        findUnique: async ({ where }: { where: { customerId?: string; tokenHash?: string } }) => current.reset && (where.customerId === current.reset.customerId || where.tokenHash === current.reset.tokenHash) ? current.reset : null,
        upsert: async ({ create }: { create: Reset }) => { current.reset = { ...create, consumedAt: null }; return current.reset; },
        updateMany: async ({ where, data }: { where: { tokenHash: string }; data: Partial<Reset> }) => {
          if (options.conflict === "consume" || !current.reset || where.tokenHash !== current.reset.tokenHash || current.reset.consumedAt) return { count: 0 };
          Object.assign(current.reset, data); return { count: 1 };
        },
      },
      customerRecoveryEmailVerification: {
        findUnique: async ({ where }: { where: { customerId: string } }) => current.verification?.customerId === where.customerId ? current.verification : null,
        upsert: async ({ create }: { create: Verification }) => { current.verification = { ...create, consumedAt: null }; return current.verification; },
        updateMany: async ({ where, data }: { where: { tokenHash: string }; data: Partial<Verification> }) => {
          if (options.conflict === "consume" || !current.verification || where.tokenHash !== current.verification.tokenHash || current.verification.consumedAt) return { count: 0 };
          Object.assign(current.verification, data); return { count: 1 };
        },
      },
    };
  }
  const db = {
    customer: { findUnique: (args: Parameters<ReturnType<typeof models>["customer"]["findUnique"]>[0]) => models(state).customer.findUnique(args) },
    user: { findFirst: () => models(state).user.findFirst() },
    customerPasswordRecovery: { findUnique: (args: Parameters<ReturnType<typeof models>["customerPasswordRecovery"]["findUnique"]>[0]) => models(state).customerPasswordRecovery.findUnique(args) },
    $transaction<T>(work: (tx: ReturnType<typeof models>) => Promise<T>) {
      const result = transaction.then(async () => {
        const copy = structuredClone(state);
        const value = await work(models(copy));
        state = copy;
        return value;
      });
      transaction = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  const fixture = {
    db, after: (task: () => Promise<unknown>) => tasks.push(task),
    hash: async () => "new-synthetic-hash",
    compare: async (value: string, storedHash: string) => value === password && storedHash === customer.passwordHash,
    auth: async () => options.role === "anonymous" ? null : { user: { role: options.role ?? "CUSTOMER", id: customer.id } },
    getPasswordRecoveryUrl: (token: string) => `https://example.invalid/recuperar-senha#token=${token}`,
    isPasswordRecoveryEmailConfigured: () => options.configured !== false,
    sendPasswordRecoveryEmail: async (message: (typeof sent)[number]) => { sent.push(message); return !options.sendFails; },
    sendPasswordRecoveryVerificationEmail: async (message: (typeof verificationSent)[number]) => { verificationSent.push(message); return !options.sendFails; },
  };
  async function load(path: string) {
    const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
    vm.runInNewContext(await source(`src/app/api/minha-conta/${path}/route.ts`), {
      module: loaded, exports: loaded.exports, fixture, require: createRequire(import.meta.url),
      Request, Response, TextDecoder, Uint8Array, Buffer, Date, setTimeout, clearTimeout,
    });
    return loaded.exports.POST;
  }
  const [recover, reset] = await Promise.all([load("recuperar-senha"), load("redefinir-senha")]);
  function request(value: unknown) { return new Request("https://example.invalid", { method: "POST", body: JSON.stringify(value) }); }
  return { sent, locks, state: () => state, recover: (address = email) => recover(request({ email: address })),
    flush: () => Promise.all(tasks.splice(0).map(task => task())),
    reset: (token: string, value = password) => reset(request({ token, password: value, confirmPassword: value })),
    token: () => new URL(sent[0].resetUrl).hash.slice("#token=".length),
    verificationSent,
    verify: async (token?: string, currentPassword = password) => (await load("confirmar-email"))(request({ password: currentPassword, ...(token ? { token } : {}) })),
  };
}

test("solicitação responde igual para elegível, ausente, bloqueado, não verificado, Google-only e staff", async () => {
  const cases: [Options, string?, boolean?][] = [
    [{}, email, true], [{}, "missing@example.invalid"], [{ initial: { status: "BLOCKED" } }],
    [{ initial: { passwordRecoveryVerifiedEmail: "old@example.invalid" } }],
    [{ initial: { passwordHash: "" } }], [{ staff: true }], [{ configured: false }],
  ];
  let expected: unknown;
  for (const [options, address, shouldSend] of cases) {
    const h = await harness(options);
    const response = await h.recover(address);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const body: unknown = await response.json();
    if (expected === undefined) expected = body;
    assert.deepEqual(body, expected);
    assert.equal(h.sent.length, 0);
    await h.flush();
    assert.equal(h.sent.length, shouldSend ? 1 : 0);
  }
});

test("solicitações concorrentes reservam uma emissão e não persistem o token em claro", async () => {
  const h = await harness({ sendFails: true });
  await Promise.all([h.recover(), h.recover(email.toUpperCase())]);
  await h.flush();
  assert.equal(h.sent.length, 1);
  const token = h.token();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(h.state().reset?.tokenHash, createHash("sha256").update(token).digest("hex"));
  assert.doesNotMatch(JSON.stringify(h.state()), new RegExp(token));
  assert.equal(h.sent[0].recipient, email);
});

test("consumo concorrente altera senha uma vez e rejeita repetição", async () => {
  const h = await harness();
  await h.recover(); await h.flush();
  const token = h.token();
  const results = await Promise.all([h.reset(token), h.reset(token)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  assert.equal(h.state().customer.passwordHash, "new-synthetic-hash");
  assert.ok(h.state().reset?.consumedAt);
  assert.ok(h.locks.some(lock => lock.includes('"Customer"') && lock.includes("FOR UPDATE")));
});

test("expiração, mudança de hash/endereço, staff superveniente e conflito de escrita não consomem token", async () => {
  const mutations: ((state: State) => void)[] = [
    state => { state.reset!.expiresAt = new Date(0); },
    state => { state.customer.passwordHash = "changed-synthetic-hash"; },
    state => { state.customer.email = "changed@example.invalid"; },
    state => { state.staff = true; },
  ];
  for (const mutate of mutations) {
    const h = await harness();
    await h.recover(); await h.flush(); mutate(h.state());
    const before = h.state().customer.passwordHash;
    const response = await h.reset(h.token());
    assert.equal(response.status, 400);
    assert.equal(h.state().customer.passwordHash, before);
    assert.equal(h.state().reset?.consumedAt, null);
  }
  for (const conflict of ["credential", "consume"] as const) {
    const h = await harness({ conflict });
    await h.recover(); await h.flush();
    assert.equal((await h.reset(h.token())).status, 400);
    assert.equal(h.state().reset?.consumedAt, null);
    assert.equal(h.state().customer.passwordHash, customer.passwordHash);
  }
});

test("senha acima de 72 bytes UTF-8 recusa antes de consumir", async () => {
  const h = await harness();
  await h.recover(); await h.flush();
  assert.equal((await h.reset(h.token(), "é".repeat(37))).status, 400);
  assert.equal(h.state().reset?.consumedAt, null);
});

test("confirmação exige sessão, senha e posse do e-mail exato antes de habilitar recuperação", async () => {
  for (const options of [{ role: "anonymous" }, { role: "ADMIN" }, { staff: true }]) {
    const h = await harness(options);
    assert.equal((await h.verify()).status, options.role ? 401 : 400);
    assert.equal(h.verificationSent.length, 0);
  }
  const h = await harness({ initial: { passwordRecoveryVerifiedEmail: "old@example.invalid" } });
  assert.equal((await h.verify(undefined, "wrong-password")).status, 400);
  assert.equal(h.verificationSent.length, 0);
  const results = await Promise.all([h.verify(), h.verify()]);
  assert.ok(results.every(result => result.status === 200));
  assert.equal(h.verificationSent.length, 1);
  const { token, recipient } = h.verificationSent[0];
  assert.equal(recipient, email);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(h.state().verification?.tokenHash, createHash("sha256").update(token).digest("hex"));
  assert.equal(h.state().customer.passwordRecoveryVerifiedEmail, "old@example.invalid");
  assert.equal((await h.reset(token)).status, 400);
  assert.equal((await h.verify(token, "wrong-password")).status, 400);
  const done = await h.verify(token);
  assert.equal(done.status, 200);
  assert.equal((await done.json()).verified, true);
  assert.equal(h.state().customer.passwordRecoveryVerifiedEmail, email);
  assert.equal(h.state().customer.passwordHash, customer.passwordHash);
  assert.equal((await h.verify(token)).status, 400);
  await h.recover(); await h.flush();
  assert.equal(h.sent.length, 1);
  assert.equal((await h.verify(h.token())).status, 400);
});

test("verificação recusa expiração, alteração de endereço/credencial ou falha de consumo", async () => {
  for (const mutate of [
    (state: State) => { state.verification!.expiresAt = new Date(0); },
    (state: State) => { state.customer.email = "changed@example.invalid"; },
    (state: State) => { state.customer.passwordHash = "changed-synthetic-hash"; },
  ]) {
    const h = await harness({ initial: { passwordRecoveryVerifiedEmail: "old@example.invalid" } });
    await h.verify(); mutate(h.state());
    assert.equal((await h.verify(h.verificationSent[0].token)).status, 400);
    assert.equal(h.state().customer.passwordRecoveryVerifiedEmail, "old@example.invalid");
  }
  const h = await harness({ conflict: "consume", initial: { passwordRecoveryVerifiedEmail: "old@example.invalid" } });
  await h.verify();
  assert.equal((await h.verify(h.verificationSent[0].token)).status, 400);
  assert.equal(h.state().customer.passwordRecoveryVerifiedEmail, "old@example.invalid");
});
