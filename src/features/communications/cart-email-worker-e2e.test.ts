import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import { GET, POST } from "@/app/api/carrinho/descadastrar-email/route";
import type { submitBrevoEmail } from "./brevo-email";
import { updateCartEmailReminder } from "./cart-email-reminder";
import { processCustomerEmails } from "./customer-email-worker";

const day = 86_400_000;
const customerId = "synthetic-cart-customer";
const email = "customer@example.invalid";
const product = {
  id: "synthetic-product", name: "Sabonete QA confidencial", status: "ACTIVE", deletedAt: null,
  inventorySource: "PHARMACY", stock: 3, activeIngredients: [], cmedReference: null, requiresPrescription: false,
  prescriptionType: "UNREVIEWED", isPopularPharmacy: false,
  catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false },
};

type Reminder = {
  customerId: string; cartKey: string; email: string; productIds: string[];
  optedInAt: Date; availableAt: Date; expiresAt: Date; canceledAt: Date | null; claimedAt: Date | null;
};
type Event = {
  eventKey: string; cartCustomerId: string; kind: string; state: string; createdAt: Date;
  availableAt: Date; claimedAt: Date | null; finishedAt: Date | null;
};

function matches(record: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, filter]) => {
    const value = record[key];
    if (!filter || typeof filter !== "object" || filter instanceof Date) return value === filter;
    if ("in" in filter && Array.isArray(filter.in)) return filter.in.includes(value);
    if (!(value instanceof Date)) return false;
    if ("lte" in filter && filter.lte instanceof Date) return value <= filter.lte;
    if ("lt" in filter && filter.lt instanceof Date) return value < filter.lt;
    return false;
  });
}

function harness() {
  const customer = { status: "ACTIVE", email, passwordRecoveryVerifiedEmail: email, passwordRecoveryVerifiedAt: new Date(0) };
  let reminder: Reminder | null = null;
  let purchase: Date | null = null;
  let event: Event | null = null;
  const sent: Parameters<typeof submitBrevoEmail>[0][] = [];
  const db = {
    $queryRaw: async () => [],
    customer: { findUnique: async () => customer },
    user: { findFirst: async () => null },
    order: { findFirst: async ({ where }: { where: { customerId: string; createdAt: { gte: Date } } }) =>
      purchase && where.customerId === customerId && purchase >= where.createdAt.gte ? { id: "synthetic-order" } : null },
    product: { findMany: async () => [product] },
    customerCartEmailReminder: {
      findUnique: async ({ where }: { where: Record<string, unknown> }) => reminder && matches(reminder, where) ? { ...reminder, customer } : null,
      upsert: async ({ create }: { create: Reminder }) => { reminder = { ...create }; },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Reminder> }) => {
        if (!reminder || !matches(reminder, where)) return { count: 0 };
        Object.assign(reminder, data);
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    customerEmailEvent: {
      upsert: async ({ create }: { create: Pick<Event, "eventKey" | "cartCustomerId" | "kind" | "availableAt"> }) => {
        event ??= { ...create, state: "PENDING", createdAt: new Date(), claimedAt: null, finishedAt: null };
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => event && matches(event, where) ? [{ ...event }] : [],
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Event> }) => {
        if (!event || !matches(event, where)) return { count: 0 };
        Object.assign(event, data);
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    $transaction<T>(run: (tx: unknown) => Promise<T>) { return run(db); },
  };
  const run = (now?: Date) => processCustomerEmails(db as unknown as PrismaClient, now, async input => {
    sent.push(input);
    return { status: "accepted" };
  });
  return {
    db, sent, run, reminder: () => reminder!, event: () => event!,
    purchase: () => { purchase = new Date(); },
    advancePastDelay() {
      reminder!.optedInAt = new Date(Date.now() - day - 1000);
      reminder!.availableAt = new Date(reminder!.optedInAt.getTime() + day);
      reminder!.expiresAt = new Date(reminder!.availableAt.getTime() + day);
      event!.createdAt = reminder!.optedInAt;
      event!.availableAt = reminder!.availableAt;
    },
  };
}

test("carrinho autorizado percorre fila, prazo, renderização e submissão única; compra e descadastro suprimem", async t => {
  const env = { CUSTOMER_ORDER_EMAIL_MODE: "disabled", CUSTOMER_CART_EMAIL_MODE: "enabled", BREVO_API_KEY: "synthetic-only",
    BREVO_SENDER_EMAIL: "pedidos@emails.wimifarma.com.br", BREVO_SENDER_NAME: "Wimifarma" };
  const previous = Object.entries(env).map(([key]) => [key, process.env[key]] as const);
  Object.assign(process.env, env);
  const runtime = globalThis as typeof globalThis & { prisma?: unknown };
  const previousDb = runtime.prisma;
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (previousDb === undefined) delete runtime.prisma;
    else runtime.prisma = previousDb;
  });
  async function arm() {
    const h = harness();
    runtime.prisma = h.db;
    const result = await updateCartEmailReminder(customerId, { action: "arm", consent: true, items: [{ productId: product.id, quantity: 1 }] });
    assert.ok(result.cartKey);
    return h;
  }

  const eligible = await arm();
  const due = eligible.reminder().availableAt;
  assert.equal(due.getTime() - eligible.reminder().optedInAt.getTime(), day);
  assert.equal(eligible.reminder().expiresAt.getTime() - due.getTime(), day);
  assert.equal(eligible.event().availableAt, due);
  await eligible.run(new Date(due.getTime() - 1));
  assert.equal(eligible.event().state, "PENDING");
  assert.equal(eligible.sent.length, 0);
  eligible.advancePastDelay();
  await Promise.all([eligible.run(), eligible.run()]);
  await eligible.run();
  assert.equal(eligible.event().state, "ACCEPTED");
  assert.equal(eligible.sent.length, 1);
  const [delivery] = eligible.sent;
  assert.equal(delivery.recipient, email);
  assert.equal(delivery.disablePixel, true);
  for (const body of [delivery.email.html, delivery.email.text]) {
    assert.match(body, /wimifarma\.com\.br\/carrinho/);
    assert.ok(body.includes(`/api/carrinho/descadastrar-email?chave=${eligible.reminder().cartKey}`));
    assert.doesNotMatch(body, /Sabonete QA|synthetic-product|R\$|Brevo/);
  }
  assert.match(delivery.email.html, /logo-wimifarma-email-contraste\.png/);
  assert.match(delivery.email.text, /preços e a disponibilidade/);
  assert.deepEqual(eligible.reminder().productIds, []);

  const converted = await arm();
  converted.advancePastDelay();
  converted.purchase();
  await converted.run();
  assert.equal(converted.event().state, "SKIPPED");
  assert.equal(converted.sent.length, 0);

  const unsubscribed = await arm();
  const url = `https://example.invalid/api/carrinho/descadastrar-email?chave=${unsubscribed.reminder().cartKey}`;
  assert.equal(GET(new Request(url)).status, 200);
  assert.equal(unsubscribed.reminder().canceledAt, null);
  const body = new URLSearchParams({ chave: unsubscribed.reminder().cartKey });
  assert.equal((await POST(new Request(url, { method: "POST", body }))).status, 200);
  unsubscribed.advancePastDelay();
  await unsubscribed.run();
  assert.equal(unsubscribed.event().state, "SKIPPED");
  assert.equal(unsubscribed.sent.length, 0);
});
