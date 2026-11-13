import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import type { submitBrevoEmail } from "./brevo-email";
import { processCustomerEmails } from "./customer-email-worker";

const now = new Date();
const env = {
  CUSTOMER_ORDER_EMAIL_MODE: "enabled", CUSTOMER_CART_EMAIL_MODE: "disabled", BREVO_API_KEY: "synthetic-only",
  BREVO_SENDER_EMAIL: "pedidos@emails.wimifarma.com.br", BREVO_SENDER_NAME: "Wimifarma",
};

function fixture(kind = "ORDER_RECEIVED", status: string | null = null) {
  const event = { eventKey: "synthetic-order", kind, orderId: "order-example", status,
    state: "PENDING", createdAt: now, availableAt: now, discloseProductIds: ["ordinary", "medicine"] };
  const customer = { status: "ACTIVE", email: "qa@example.test", passwordRecoveryVerifiedEmail: "qa@example.test", passwordRecoveryVerifiedAt: now };
  const order = { id: event.orderId, number: "SAMPLE-001", status: status ?? "PENDING", customerEmail: customer.email, customer,
    fulfillmentMethod: "PICKUP", paymentMethod: "CASH", paymentStatus: "PENDING" };
  const product = { activeIngredients: [], cmedReference: null, isPopularPharmacy: false, prescriptionType: "UNREVIEWED", requiresPrescription: false };
  const items = [
    { productId: "ordinary", productName: "Sabonete sintético", quantity: 2, product: { ...product, catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false } } },
    { productId: "medicine", productName: "Medicamento fictício secreto", quantity: 1, product: { ...product, requiresPrescription: true } },
  ];
  const effects = { states: [] as string[], sent: [] as Parameters<typeof submitBrevoEmail>[0][], orderReads: 0 };
  const hooks = { beforeRead: () => {}, failSubmission: false };
  const db = {
    customerCartEmailReminder: { deleteMany: async () => ({ count: 0 }) },
    customerEmailEvent: {
      findMany: async () => event.state === "PENDING" ? [{ ...event }] : [],
      deleteMany: async () => ({ count: 0 }),
      updateMany: async ({ where, data }: { where: { eventKey?: string; state: string }; data: { state: string } }) => {
        if (where.eventKey !== event.eventKey || where.state !== event.state) return { count: 0 };
        effects.states.push(data.state);
        Object.assign(event, data);
        return { count: 1 };
      },
    },
    order: { findUnique: async () => { effects.orderReads++; hooks.beforeRead(); return { ...order, customer: { ...customer } }; } },
    orderItem: { findMany: async () => items },
  } as unknown as PrismaClient;
  const run = () => processCustomerEmails(db, now, async input => {
    effects.sent.push(input);
    if (hooks.failSubmission) throw new Error("synthetic timeout");
    return { status: "accepted" };
  });
  return { run, effects, hooks, order, customer };
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
