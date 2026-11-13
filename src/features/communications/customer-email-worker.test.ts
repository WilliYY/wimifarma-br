import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import type { submitBrevoEmail } from "./brevo-email";
import { processCustomerEmails } from "./customer-email-worker";
import { queueOrderReceivedEmail, queueOrderStatusEmail, type orderEmailProductSelect } from "./order-email-events";

const now = new Date();
const env = {
  CUSTOMER_ORDER_EMAIL_MODE: "enabled", CUSTOMER_CART_EMAIL_MODE: "disabled", BREVO_API_KEY: "synthetic-only",
  BREVO_SENDER_EMAIL: "pedidos@emails.wimifarma.com.br", BREVO_SENDER_NAME: "Wimifarma",
};

type Product = Prisma.ProductGetPayload<{ select: typeof orderEmailProductSelect }>;

function fixture(kind = "ORDER_RECEIVED", status: OrderStatus | null = null) {
  const event = { eventKey: "synthetic-order", kind, orderId: "order-example", status,
    state: "PENDING", createdAt: now, availableAt: now, discloseProductIds: ["ordinary", "medicine"] };
  const customer = { status: "ACTIVE", email: "qa@example.test", passwordRecoveryVerifiedEmail: "qa@example.test", passwordRecoveryVerifiedAt: now };
  const order = { id: event.orderId, number: "SAMPLE-001", status: status ?? "PENDING", customerEmail: customer.email, customer,
    fulfillmentMethod: "PICKUP", paymentMethod: "CASH", paymentStatus: "PENDING" };
  const product = { activeIngredients: [], cmedReference: null, isPopularPharmacy: false, prescriptionType: "UNREVIEWED", requiresPrescription: false } as const;
  const items = [
    { productId: "ordinary", productName: "Sabonete sintético", quantity: 2, product: { ...product, id: "ordinary", activeIngredients: [], catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } } },
    { productId: "medicine", productName: "Medicamento fictício secreto", quantity: 1, product: { ...product, id: "medicine", activeIngredients: [], catalogClassification: null, requiresPrescription: true } },
  ] satisfies { productId: string; productName: string; quantity: number; product: Product }[];
  const effects = { states: [] as string[], sent: [] as Parameters<typeof submitBrevoEmail>[0][], orderReads: 0 };
  const hooks = { beforeRead: () => {}, failSubmission: false };
  const db = {
    customerCartEmailReminder: { deleteMany: async () => ({ count: 0 }) },
    customerEmailEvent: {
      findMany: async ({ where }: { where: { availableAt: { lte: Date } } }) => event.state === "PENDING" && event.availableAt <= where.availableAt.lte ? [{ ...event }] : [],
      deleteMany: async () => ({ count: 0 }),
      updateMany: async ({ where, data }: { where: { eventKey?: string; state: string; availableAt?: { lte: Date } }; data: { state: string } }) => {
        if (where.eventKey !== event.eventKey || where.state !== event.state || (where.availableAt && event.availableAt > where.availableAt.lte)) return { count: 0 };
        effects.states.push(data.state);
        Object.assign(event, data);
        return { count: 1 };
      },
    },
    order: { findUnique: async () => { effects.orderReads++; hooks.beforeRead(); return { ...order, customer: { ...customer } }; } },
    orderItem: { findMany: async () => items },
  } as unknown as PrismaClient;
  const run = (at = now) => processCustomerEmails(db, at, async input => {
    effects.sent.push(input);
    if (hooks.failSubmission) throw new Error("synthetic timeout");
    return { status: "accepted" };
  });
  return { run, effects, hooks, order, customer, event, items };
}

test("commercial worker uses verified destination, safe snapshot and a single submission", async () => {
  Object.assign(process.env, env);
  const { run, effects } = fixture();
  await Promise.all([run(), run()]);
  await run();
  assert.deepEqual(effects.states, ["SENDING", "ACCEPTED"]);
  const [sent] = effects.sent;
  assert.equal(effects.sent.length, 1);
  assert.equal(sent.recipient, "qa@example.test");
  assert.match(sent.email.text, /2 × Sabonete sintético/);
  assert.match(sent.email.text, /pagamento ainda está pendente/);
  assert.doesNotMatch(sent.email.html, /Medicamento fictício secreto|Brevo/);
  assert.match(sent.email.html, /logo-wimifarma-email\.png/);
});

test("worker checks proof and stage again and never retries an uncertain submission", async () => {
  Object.assign(process.env, env);
  const revoked = fixture();
  revoked.hooks.beforeRead = () => {
    if (revoked.effects.orderReads === 2) revoked.customer.status = "INACTIVE";
  };
  await revoked.run();
  assert.equal(revoked.effects.sent.length, 0);

  const ready = fixture("ORDER_STATUS", "READY");
  ready.hooks.failSubmission = true;
  await ready.run();
  await ready.run();
  assert.equal(ready.effects.sent.length, 1);
  assert.equal(ready.effects.sent[0].email.subject, "Pedido pronto para retirada");
  assert.deepEqual(ready.effects.states, ["SENDING", "UNCERTAIN"]);

  const outdated = fixture("ORDER_STATUS", "PREPARING");
  outdated.order.status = "READY";
  await outdated.run();
  assert.equal(outdated.effects.sent.length, 0);
});

test("delivery and pickup queue each valid stage and render the matching message", async () => {
  Object.assign(process.env, env);
  const stages = [
    ["CONFIRMED", "Pedido confirmado"], ["PREPARING", "Seu pedido está em separação"], ["COMPLETED", "Pedido concluído"],
    ["CANCELED", "Pedido cancelado"],
  ] as const;
  for (const method of ["DELIVERY", "PICKUP"] as const) {
    const steps: readonly (readonly [OrderStatus, string | null])[] = [
      ...stages.slice(0, 2), ["READY", method === "PICKUP" ? "Pedido pronto para retirada" : "Pedido pronto para envio"],
      ["OUT_FOR_DELIVERY", method === "DELIVERY" ? "Seu pedido saiu para entrega" : null], ...stages.slice(2),
    ];
    for (const [status, subject] of steps) {
      const { run, effects, event, order } = fixture("ORDER_STATUS", status);
      order.fulfillmentMethod = method;
      const queueCalls: unknown[] = [];
      const transaction = { customerEmailEvent: { upsert: async (input: { where: { eventKey: string } }) => {
        event.eventKey = input.where.eventKey;
        queueCalls.push(input);
      } } } as unknown as Prisma.TransactionClient;
      await queueOrderStatusEmail(transaction, { id: order.id, customerId: "synthetic-customer", status });
      assert.deepEqual(queueCalls, [{ where: { eventKey: `order-status:v1:${order.id}:${status}` }, update: {},
        create: { eventKey: `order-status:v1:${order.id}:${status}`, kind: "ORDER_STATUS", orderId: order.id, status } }]);
      await run();
      await run();
      assert.deepEqual(effects.sent.map(sent => sent.email.subject), subject ? [subject] : []);
      if (subject) assert.match(effects.sent[0].email.html, /https:\/\/wimifarma\.com\.br\/minha-conta#pedidos/);
    }
  }
});

test("receipt waits for availability and honors the original allowlist and later classification", async () => {
  Object.assign(process.env, env);
  const { run, effects, event, items, order, hooks } = fixture();
  const transaction = { customerEmailEvent: { upsert: async ({ create }: { create: { discloseProductIds: string[] } }) => {
    event.discloseProductIds = create.discloseProductIds;
  } } } as unknown as Prisma.TransactionClient;
  await queueOrderReceivedEmail(transaction, { id: order.id, customerId: "synthetic-customer" }, items.map(item => item.product));
  assert.deepEqual(event.discloseProductIds, ["ordinary"]);

  // A newly safe classification cannot expand what was authorized when the order was created.
  Object.assign(items[1].product, { catalogClassification: items[0].product.catalogClassification, requiresPrescription: false });
  event.availableAt = new Date(now.getTime() + 30_000);
  await run(new Date(event.availableAt.getTime() - 1));
  assert.equal(effects.sent.length, 0);
  assert.deepEqual(effects.states, []);

  // Reclassification after the first read invalidates the prepared message and causes a safe re-read.
  hooks.beforeRead = () => { if (effects.orderReads === 2) items[0].product.requiresPrescription = true; };
  await Promise.all([run(event.availableAt), run(event.availableAt)]);
  assert.equal(effects.sent.length, 0);
  assert.deepEqual(effects.states, ["SENDING", "PENDING"]);
  await run(event.availableAt);
  assert.equal(effects.sent.length, 1);
  assert.doesNotMatch(effects.sent[0].email.text, /Sabonete sintético|Medicamento fictício secreto/);
  assert.match(effects.sent[0].email.text, /lista completa/);
});
