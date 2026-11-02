import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

async function load(path: string, prisma: object) {
  const bundle = await build({
    entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "synthetic-customer-address", setup(builder) {
      builder.onResolve({ filter: /lib\/prisma$|features\/auth\/auth$|generated\/prisma\/client$|^bcryptjs$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path.endsWith("lib/prisma") ? "export const getPrisma=()=>globalThis.fixture.prisma;" :
        args.path.endsWith("auth/auth") ? "export const auth=async()=>({user:{id:'synthetic-customer',role:'CUSTOMER'}});" :
        args.path === "bcryptjs" ? "export const hash=async()=> 'synthetic-hash';" : "export const Prisma={};",
      }));
    } }],
  });
  const loaded = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, Date, console, Buffer, process, setTimeout, clearTimeout,
    fixture: { prisma },
  });
  return loaded.exports;
}

test("cadastro público ignora o padrão legado do banco para a cidade de um novo cliente", async () => {
  let created: Record<string, unknown> = {};
  const route = await load("src/app/api/minha-conta/register/route.ts", { customer: {
    findUnique: async () => null,
    create: async ({ data }: { data: Record<string, unknown> }) => { created = { city: "Ivate", ...data }; return { id: "synthetic-customer", ...created }; },
  } });
  const response = await route.POST(new Request("https://example.test/api/minha-conta/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Cliente Sintético", email: "customer@example.invalid", phone: "44999990000", password: "Synthetic-42!", confirmPassword: "Synthetic-42!" }) })) as Response;
  assert.equal(response.status, 201);
  assert.equal(created.city, "");
});

test("vínculo cria cliente sem cidade padrão e preserva endereço de cliente já vinculado", async () => {
  for (const linked of [false, true]) {
    const customer = { id: "synthetic-customer", city: "Cidade Preservada", address: "Rua Preservada, 42", status: "ACTIVE" };
    const staff = { id: "synthetic-staff", name: "Cliente Sintético", email: "customer@example.invalid", role: "STAFF", isActive: true, customerId: linked ? customer.id : null, passwordHash: "synthetic-hash", lastLoginAt: null, updatedAt: new Date("2026-01-01") };
    let created: Record<string, unknown> | null = null;
    const tx = {
      $queryRaw: async () => [],
      user: {
        findUnique: async ({ where }: { where: { id?: string } }) => where.id === "synthetic-admin" ? { id: "synthetic-admin", role: "ADMIN", isActive: true } : staff,
        update: async ({ data }: { data: object }) => Object.assign(staff, data),
      },
      customer: {
        findUnique: async ({ where }: { where: { id?: string } }) => where.id === customer.id ? customer : null,
        create: async ({ data }: { data: Record<string, unknown> }) => { created = { city: "Ivate", ...data }; return { id: "new-synthetic-customer", ...created }; },
        update: async ({ data }: { data: object }) => Object.assign(customer, data),
      },
      auditLog: { create: async () => ({}) },
    };
    const directory = await load("src/features/admin-users/directory.ts", {});
    await directory.changeAccess(tx, "synthetic-admin", staff.id, { kind: "staff", role: "CUSTOMER", isActive: true, version: staff.updatedAt.toISOString() });
    if (linked) assert.equal(created, null);
    else assert.equal((created as Record<string, unknown> | null)?.city, "");
    assert.equal(customer.city, "Cidade Preservada");
    assert.equal(customer.address, "Rua Preservada, 42");
  }
});

test("PATCH mantém o cliente da sessão e preserva cidade omitida ou explicitamente vazia", async () => {
  for (const city of [undefined, "", "Cidade Preservada"]) {
    let written: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null;
    const route = await load("src/app/api/minha-conta/route.ts", { customer: {
      update: async (input: { where: Record<string, unknown>; data: Record<string, unknown> }) => { written = input; return { id: "synthetic-customer", ...input.data }; },
    } });
    const response = await route.PATCH(new Request("https://example.test/api/minha-conta", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Cliente Sintético", city, id: "outro-cliente", status: "INACTIVE", role: "ADMIN" }) })) as Response;
    assert.equal(response.status, 200);
    const result = written as { where: Record<string, unknown>; data: Record<string, unknown> } | null;
    assert.equal(result?.where.id, "synthetic-customer");
    assert.equal(result?.where.status, "ACTIVE");
    if (city === undefined) assert.equal(Object.hasOwn(result!.data, "city"), false);
    else assert.equal(result?.data.city, city);
    for (const field of ["id", "status", "role"]) assert.equal(Object.hasOwn(result!.data, field), false);
  }
});
