import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { formatCustomerOrderStatus } from "@/features/miauby/customer-order-status";
import { getPrisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { submitBrevoEmail } from "./brevo-email";
import { cartReminderProductSelect, isCartReminderProductAllowed } from "./cart-email-reminder-policy";
import { commerceEmailIdentitySelect, hasVerifiedCommerceEmail } from "./customer-email-identity";
import { isCustomerCartEmailConfigured, isCustomerOrderEmailConfigured, readCommerceEmailSender } from "./customer-email-outbox";
import { renderWimifarmaEmail } from "./customer-email";
import { canShowProductInOrderEmail, orderEmailProductSelect } from "./order-email-events";

const dayMs = 86_400_000;
const interruptedMs = 15 * 60_000;
const stageSubjects = {
  CONFIRMED: "Pedido confirmado", PREPARING: "Seu pedido está em separação", OUT_FOR_DELIVERY: "Seu pedido saiu para entrega",
  COMPLETED: "Pedido concluído", CANCELED: "Pedido cancelado",
};
const orderSelect = {
  id: true, number: true, status: true, paymentMethod: true, paymentStatus: true, fulfillmentMethod: true,
  customerEmail: true, requiresPrescriptionReview: true, prescriptionReviewedAt: true,
  customer: { select: commerceEmailIdentitySelect }, onlinePayment: { select: { environment: true } },
} as const satisfies Prisma.OrderSelect;
type EmailEvent = Prisma.CustomerEmailEventGetPayload<object>;
type Email = Parameters<typeof renderWimifarmaEmail>[0];
type Delivery = { recipient: string; email: Email };

function orderAction() {
  return { label: "Acompanhar meu pedido", url: `${SITE_URL}/minha-conta#pedidos` };
}

async function prepareOrder(db: PrismaClient, event: EmailEvent, now: Date): Promise<Delivery | null> {
  if (!event.orderId || event.createdAt.getTime() + dayMs <= now.getTime()) return null;
  const order = await db.order.findUnique({ where: { id: event.orderId }, select: orderSelect });
  if (!order || !hasVerifiedCommerceEmail(order.customer, now) || order.customerEmail?.toLowerCase() !== order.customer.email ||
      !/^[a-z0-9-]{1,64}$/i.test(order.number) || (order.paymentMethod === "ONLINE" && order.onlinePayment?.environment !== "production")) return null;

  if (event.kind === "ORDER_RECEIVED") {
    if (order.status === "CANCELED") return null;
    const items = await db.orderItem.findMany({ where: { orderId: order.id }, orderBy: { id: "asc" }, select: {
      productId: true, productName: true, quantity: true, product: { select: orderEmailProductSelect },
    } });
    const allowed = new Set(event.discloseProductIds);
    const shown = items.filter(item => item.productId && allowed.has(item.productId) && item.product && canShowProductInOrderEmail(item.product));
    return { recipient: order.customer.email, email: {
      subject: "Recebemos seu pedido na Wimifarma",
      lines: [
        `Recebemos o pedido ${order.number}. Você pode acompanhar o andamento pela sua conta.`,
        ...(order.paymentStatus === "PENDING" ? ["O pagamento ainda está pendente."] : []),
        ...(shown.length ? ["Itens do pedido", ...shown.map(item => `${item.quantity} × ${item.productName}`)] : []),
        ...(shown.length !== items.length ? ["Veja a lista completa dos itens na sua conta."] : []),
      ], action: orderAction(),
    } };
  }

  const stage = event.status;
  if (!stage || stage === "PENDING" || stage !== order.status ||
      (["READY", "OUT_FOR_DELIVERY", "COMPLETED"].includes(stage) && order.requiresPrescriptionReview && !order.prescriptionReviewedAt)) return null;
  const formatted = formatCustomerOrderStatus({ ...order, customerPhone: "" });
  if (!formatted) return null;
  const subject = stage === "READY" ? (order.fulfillmentMethod === "PICKUP" ? "Pedido pronto para retirada" : "Pedido pronto para envio") : stageSubjects[stage];
  return { recipient: order.customer.email, email: { subject, lines: formatted.split("\n\n"), action: orderAction() } };
}

async function prepareCart(db: PrismaClient, event: EmailEvent, now: Date, claimForSubmission: boolean): Promise<Delivery | "RESCHEDULED" | null> {
  const customerId = event.cartCustomerId;
  if (!customerId) return null;
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
    const reminder = await tx.customerCartEmailReminder.findUnique({ where: { customerId }, include: { customer: { select: commerceEmailIdentitySelect } } });
    if (!reminder || event.eventKey !== `cart-reminder:v1:${reminder.cartKey}` || reminder.canceledAt || reminder.claimedAt || reminder.expiresAt <= now ||
        !hasVerifiedCommerceEmail(reminder.customer, now) || reminder.email !== reminder.customer.email || !reminder.productIds.length) return null;
    if (reminder.availableAt > now) {
      await tx.customerEmailEvent.updateMany({ where: { eventKey: event.eventKey, state: "SENDING" },
        data: { state: "PENDING", claimedAt: null, availableAt: reminder.availableAt } });
      return "RESCHEDULED";
    }
    const purchase = await tx.order.findFirst({ where: { customerId, createdAt: { gte: reminder.optedInAt } }, select: { id: true } });
    if (purchase) return null;
    const products = await tx.product.findMany({ where: { id: { in: reminder.productIds } }, select: cartReminderProductSelect });
    if (products.length !== reminder.productIds.length || !products.every(isCartReminderProductAllowed)) return null;
    if (await tx.user.findFirst({ where: { OR: [{ customerId }, { email: { equals: reminder.email, mode: "insensitive" } }] }, select: { id: true } })) return null;
    if (claimForSubmission) {
      const claimed = await tx.customerCartEmailReminder.updateMany({ where: { customerId, cartKey: reminder.cartKey, canceledAt: null, claimedAt: null },
        data: { claimedAt: now, productIds: [] } });
      if (!claimed.count) return null;
    }
    return {
      recipient: reminder.email,
      email: {
        subject: "Seu carrinho está esperando por você",
        lines: ["Ainda quer finalizar sua compra na Wimifarma? Volte ao carrinho para conferir os itens, os preços e a disponibilidade."],
        action: { label: "Voltar ao carrinho", url: `${SITE_URL}/carrinho` },
        unsubscribe: `${SITE_URL}/api/carrinho/descadastrar-email?chave=${encodeURIComponent(reminder.cartKey)}`,
      },
    };
  });
}

export async function processCustomerEmails(db: PrismaClient, now = new Date(), send = submitBrevoEmail) {
  const configuration = readCommerceEmailSender();
  if (!configuration) return;
  const kinds: string[] = [];
  if (isCustomerOrderEmailConfigured()) kinds.push("ORDER_RECEIVED", "ORDER_STATUS");
  if (isCustomerCartEmailConfigured()) kinds.push("ABANDONED_CART");
  if (!kinds.length) return;

  await db.customerEmailEvent.updateMany({ where: { state: "SENDING", claimedAt: { lt: new Date(now.getTime() - interruptedMs) } },
    data: { state: "UNCERTAIN", finishedAt: now, discloseProductIds: [] } });
  await db.customerCartEmailReminder.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - dayMs) } } });
  await db.customerEmailEvent.deleteMany({ where: { finishedAt: { lt: new Date(now.getTime() - 60 * dayMs) } } });
  const events = await db.customerEmailEvent.findMany({ where: { kind: { in: kinds }, state: "PENDING", availableAt: { lte: now } },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }, { eventKey: "asc" }], take: 8 });

  for (const event of events) {
    const claim = await db.customerEmailEvent.updateMany({ where: { eventKey: event.eventKey, state: "PENDING", availableAt: { lte: now } },
      data: { state: "SENDING", claimedAt: now } });
    if (!claim.count) continue;
    let state = "SKIPPED";
    try {
      const isCart = event.kind === "ABANDONED_CART";
      const delivery = isCart ? await prepareCart(db, event, now, false) : await prepareOrder(db, event, now);
      if (delivery === "RESCHEDULED") continue;
      if (delivery) {
        const email = await renderWimifarmaEmail(delivery.email);
        const latest = isCart ? await prepareCart(db, event, new Date(), true) : await prepareOrder(db, event, new Date());
        if (latest === "RESCHEDULED") continue;
        if (latest && JSON.stringify(latest) !== JSON.stringify(delivery) && !isCart) {
          await db.customerEmailEvent.updateMany({ where: { eventKey: event.eventKey, state: "SENDING", claimedAt: now },
            data: { state: "PENDING", claimedAt: null, availableAt: new Date(now.getTime() + 30_000) } });
          continue;
        }
        if (latest && JSON.stringify(latest) === JSON.stringify(delivery)) {
          state = "UNCERTAIN";
          const result = await send({ configuration, recipient: delivery.recipient, email, disablePixel: true });
          state = result.status === "accepted" ? "ACCEPTED" : result.status === "rejected" ? "REJECTED" : "UNCERTAIN";
        }
      }
    } catch {
      console.warn("CUSTOMER_EMAIL_PROCESSING_FAILED", event.kind, state);
      if (state === "SKIPPED" && event.createdAt.getTime() + 2 * dayMs > now.getTime()) {
        await db.customerEmailEvent.updateMany({ where: { eventKey: event.eventKey, state: "SENDING", claimedAt: now },
          data: { state: "PENDING", claimedAt: null, availableAt: new Date(now.getTime() + 5 * 60_000) } });
        continue;
      }
    }
    await db.customerEmailEvent.updateMany({ where: { eventKey: event.eventKey, state: "SENDING", claimedAt: now },
      data: { state, finishedAt: new Date(), discloseProductIds: [] } });
  }
}

let started = false;
export function startCustomerEmailMaintenance() {
  if (started || (!isCustomerOrderEmailConfigured() && !isCustomerCartEmailConfigured())) return;
  started = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await processCustomerEmails(getPrisma()); }
    catch { console.warn("CUSTOMER_EMAIL_MAINTENANCE_FAILED"); }
    finally { running = false; }
  };
  setTimeout(() => { void tick(); }, 20_000).unref();
  setInterval(() => { void tick(); }, 30_000).unref();
}
