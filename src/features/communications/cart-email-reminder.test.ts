import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { isCartReminderProductAllowed } from "./cart-email-reminder-policy";

const hygiene = {
  id: "qa", status: "ACTIVE", deletedAt: null, inventorySource: "PHARMACY", stock: 2,
  catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
  activeIngredients: [], cmedReference: null, requiresPrescription: false, prescriptionType: "UNREVIEWED", isPopularPharmacy: false,
} as const;

test("lembrete aceita apenas higiene e perfumaria não sensíveis classificadas no catálogo", () => {
  assert.equal(isCartReminderProductAllowed({ ...hygiene, activeIngredients: [] }), true);
  for (const conflict of [
    { catalogClassification: null }, { catalogClassification: { ...hygiene.catalogClassification, kind: "MEDICINE" } },
    { requiresPrescription: true }, { prescriptionType: "ANTIMICROBIAL" as const }, { isPopularPharmacy: true },
    { activeIngredients: ["sintético"] }, { cmedReference: {} }, { stock: 0 }, { inventorySource: "DISTRIBUTOR" as const }, { deletedAt: new Date() },
  ]) assert.equal(isCartReminderProductAllowed({ ...hygiene, activeIngredients: [], ...conflict }), false);
});

type Reminder = { customerId: string; email: string; cartKey: string; productIds: string[]; availableAt: Date; expiresAt: Date; optedInAt: Date; canceledAt: Date | null; claimedAt: Date | null };
const fixtureEmail = "customer@example.invalid";
const bundle = build({
  entryPoints: ["src/features/communications/cart-email-reminder.ts", "src/app/api/carrinho/descadastrar-email/route.ts"],
  outdir: "fixture", bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
  plugins: [{ name: "cart-email-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|customer-email-outbox$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>globalThis.fixture.db;" : "export const {isCustomerCartEmailConfigured,queueCustomerEmail}=globalThis.fixture;" }));
  } }],
});

async function harness() {
  let row: Reminder | null = null;
  let configured = true;
  let classified = true;
  let proven = true;
  let staff = false;
  const notices: { eventKey: string; kind: string; cartCustomerId: string; availableAt: Date }[] = [];
  function matches(where: Partial<Reminder>) {
    return row && Object.entries(where).every(([key, value]) => row![key as keyof Reminder] === value);
  }
  const db = {
    $queryRaw: async () => [],
    customer: { findUnique: async () => ({ email: fixtureEmail, status: "ACTIVE", passwordRecoveryVerifiedEmail: proven ? fixtureEmail : null, passwordRecoveryVerifiedAt: new Date(0) }) },
    user: { findFirst: async () => staff ? { id: "staff-qa" } : null },
    product: { findMany: async () => [{ ...hygiene, catalogClassification: classified ? hygiene.catalogClassification : null }] },
    customerCartEmailReminder: {
      findUnique: async ({ where }: { where: Partial<Reminder> }) => matches(where) ? { ...row! } : null,
      upsert: async ({ create }: { create: Reminder }) => { row = create; },
      updateMany: async ({ where, data }: { where: Partial<Reminder>; data: Partial<Reminder> }) => {
        if (!matches(where)) return { count: 0 };
        Object.assign(row!, data); return { count: 1 };
      },
    },
    $transaction<T>(run: (tx: unknown) => Promise<T>) { return run(db); },
  };
  const fixture = { db, isCustomerCartEmailConfigured: () => configured, queueCustomerEmail: async (_tx: unknown, input: typeof notices[number]) => { notices.push(input); } };
  const load = <T,>(code: string) => {
    const loaded = { exports: {} as T };
    vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, URL, URLSearchParams, Request, Response, TextDecoder, Uint8Array, setTimeout, clearTimeout });
    return loaded.exports;
  };
  const files = (await bundle).outputFiles;
  const service = load<typeof import("./cart-email-reminder")>(files.find(file => file.path.endsWith("cart-email-reminder.js"))!.text);
  const unsubscribe = load<typeof import("../../app/api/carrinho/descadastrar-email/route")>(files.find(file => file.path.endsWith("route.js"))!.text);
  const items = [{ productId: hygiene.id, quantity: 1 }];
  return { service, unsubscribe, notices, row: () => row,
    arm: () => service.updateCartEmailReminder("qa-customer", { action: "arm", consent: true, items }),
    sync: (cartKey: string, next = items) => service.updateCartEmailReminder("qa-customer", { action: "sync", cartKey, items: next }),
    change: (value: { configured?: boolean; classified?: boolean; proven?: boolean; staff?: boolean }) => {
      if (value.configured !== undefined) configured = value.configured;
      if (value.classified !== undefined) classified = value.classified;
      if (value.proven !== undefined) proven = value.proven;
      if (value.staff !== undefined) staff = value.staff;
    },
  };
}

test("opt-in validado arma uma única intenção e sincronização preserva a autorização", async () => {
  const h = await harness();
  assert.equal(h.service.cartReminderRequestSchema.safeParse({ action: "arm", items: [], email: "other@example.invalid", consent: true }).success, false);
  assert.equal(h.service.cartReminderRequestSchema.safeParse({ action: "arm", items: [] }).success, false);
  const { cartKey } = await h.arm();
  assert.ok(cartKey);
  assert.equal(h.row()?.email, fixtureEmail);
  assert.deepEqual(Array.from(h.row()?.productIds ?? []), [hygiene.id]);
  const optedInAt = h.row()!.optedInAt.getTime();
  assert.equal(h.row()!.availableAt.getTime() - optedInAt, 86_400_000);
  assert.equal(h.row()!.expiresAt.getTime() - h.row()!.availableAt.getTime(), 86_400_000);
  assert.equal((await h.arm()).cartKey, null);
  assert.equal((await h.sync(cartKey)).cartKey, cartKey);
  assert.equal(h.row()?.optedInAt.getTime(), optedInAt);
  assert.equal(h.notices.length, 2);
  assert.ok(h.notices.every(event => event.eventKey === `cart-reminder:v1:${cartKey}` && event.kind === "ABANDONED_CART"));
});

test("esvaziar, perder prova ou classificação segura desarma e não rearma por sync", async () => {
  for (const condition of ["empty", "proven", "classified", "configured", "staff"] as const) {
    const h = await harness();
    const { cartKey } = await h.arm();
    assert.ok(cartKey);
    if (condition !== "empty") h.change({ [condition]: condition === "staff" });
    assert.equal((await h.sync(cartKey, condition === "empty" ? [] : undefined)).cartKey, null);
    assert.ok(h.row()?.canceledAt);
    assert.equal(h.row()?.productIds.length, 0);
    assert.equal((await h.sync(cartKey)).cartKey, null);
    assert.equal(h.notices.length, 1);
  }
});

test("preview GET não cancela e POST público é idempotente e indistinguível de chave inexistente", async () => {
  const h = await harness();
  const { cartKey } = await h.arm();
  assert.ok(cartKey);
  const url = "https://example.invalid/api/carrinho/descadastrar-email";
  assert.equal(h.unsubscribe.GET(new Request(`${url}?chave=${cartKey}`)).status, 200);
  assert.equal(h.row()?.canceledAt, null);
  const submit = async (key: string) => h.unsubscribe.POST(new Request(url, { method: "POST", body: new URLSearchParams({ chave: key }) }));
  const first = await submit(cartKey);
  assert.equal(first.status, 200);
  const body = await first.text();
  assert.ok(h.row()?.canceledAt);
  assert.equal(body, await (await submit(cartKey)).text());
  assert.equal(body, await (await submit("f1b57794-7a23-4c1f-bf2e-1f6907476081")).text());
});
