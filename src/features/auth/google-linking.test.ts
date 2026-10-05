import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { hashSync } from "bcryptjs";

type Customer = {
  id: string; email: string; name: string; status: string;
  googleSubject: string | null; passwordHash: string | null; staffAccess: null;
};
type Config = {
  callbacks: { jwt: (input: Record<string, unknown>) => Promise<Record<string, unknown> | null> };
  providers: Array<{ id: string; authorize: (input: Record<string, unknown>) => Promise<Record<string, unknown> | null> }>;
};
const email = "synthetic@example.test";
const subject = "synthetic-google-subject";
const password = "Synthetic-password-42!";
const existing: Customer = {
  id: "synthetic-customer", email, name: "Synthetic", status: "ACTIVE",
  googleSubject: null, passwordHash: hashSync(password, 4), staffAccess: null,
};

async function harness(initial: Customer | null) {
  let row = initial ? { ...initial } : null;
  let writes = 0;
  const bundle = await build({
    entryPoints: ["src/features/auth/auth.ts"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "isolated-auth", setup(builder) {
      builder.onResolve({ filter: /^next-auth($|\/providers\/)|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" :
        args.path === "next-auth" ? "export default function NextAuth(){return {}; }" :
        `export default function provider(config){return {...config,id:'${args.path.split("/").at(-1)}'};}`,
      }));
    } }],
  });
  const loaded = { exports: {} as { authConfig: Config } };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    process: { env: { NODE_ENV: "test", GOOGLE_CLIENT_ID: "synthetic", GOOGLE_CLIENT_SECRET: "synthetic" } },
    Date, console, fixture: { prisma: {
      customer: {
        findUnique: async ({ where }: { where: Record<string, unknown> }) => row &&
          (where.id === row.id || where.email === row.email || (where.googleSubject && where.googleSubject === row.googleSubject)) ? row : null,
        update: async ({ data }: { data: Partial<Customer> }) => { writes++; row = { ...row!, ...data }; return row; },
        create: async ({ data }: { data: Partial<Customer> }) => {
          writes++; row = { ...existing, passwordHash: null, ...data }; return row;
        },
      },
      user: { findUnique: async () => null },
      loginAttempt: { count: async () => 0, create: async () => undefined },
    } },
  });
  const config = loaded.exports.authConfig;
  const google = () => config.callbacks.jwt({
    token: {}, user: { email, name: "Verified synthetic owner" },
    account: { provider: "google", providerAccountId: subject },
    profile: { email, email_verified: true, sub: subject },
  });
  return { google, config, writes: () => writes, row: () => row };
}

test("verified Google cannot inherit an unverified password registration", async () => {
  const fixture = await harness(existing);
  assert.equal(await fixture.google(), null);
  assert.equal(fixture.writes(), 0);
  assert.equal(fixture.row()?.googleSubject, null);
  assert.equal(fixture.row()?.passwordHash, existing.passwordHash);
});

test("existing authorized Google association keeps the same customer and local login", async () => {
  const fixture = await harness({ ...existing, googleSubject: subject });
  assert.equal((await fixture.google())?.customerId, existing.id);
  const credentials = fixture.config.providers.find(provider => provider.id === "credentials")!;
  assert.equal((await credentials.authorize({ email, password }))?.id, existing.id);
});

test("Google rejects blocked customers and different subjects without writes", async () => {
  for (const customer of [
    { ...existing, googleSubject: "different-subject" },
    { ...existing, googleSubject: subject, status: "BLOCKED" },
  ]) {
    const fixture = await harness(customer);
    assert.equal(await fixture.google(), null);
    assert.equal(fixture.writes(), 0);
  }
});

test("new verified Google customer and passwordless record remain supported", async () => {
  for (const initial of [null, { ...existing, passwordHash: null }]) {
    const fixture = await harness(initial);
    assert.equal((await fixture.google())?.customerId, existing.id);
    assert.equal(fixture.row()?.googleSubject, subject);
    assert.equal(fixture.row()?.passwordHash, null);
  }
});

test("real JWT callbacks revoke Google and password sessions after password rotation", async () => {
  const fixture = await harness({ ...existing, googleSubject: subject });
  const googleToken = await fixture.google();
  const credentials = fixture.config.providers.find(provider => provider.id === "credentials")!;
  const user = await credentials.authorize({ email, password });
  const passwordToken = await fixture.config.callbacks.jwt({ token: {}, user, account: { provider: "credentials" } });
  assert.ok(googleToken);
  assert.ok(passwordToken);
  const nextPassword = "Synthetic-next-password-42!";
  fixture.row()!.passwordHash = hashSync(nextPassword, 4);
  assert.equal(await fixture.config.callbacks.jwt({ token: googleToken }), null);
  assert.equal(await fixture.config.callbacks.jwt({ token: passwordToken }), null);
  assert.equal(await credentials.authorize({ email, password }), null);
  const freshUser = await credentials.authorize({ email, password: nextPassword });
  assert.ok(freshUser);
  const freshToken = await fixture.config.callbacks.jwt({ token: {}, user: freshUser, account: { provider: "credentials" } });
  assert.equal(freshToken?.id, existing.id);
});
