import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { isCustomerCartEmailConfigured, queueCustomerEmail } from "./customer-email-outbox";
import { cartReminderProductSelect, isCartReminderProductAllowed } from "./cart-email-reminder-policy";
import { commerceEmailIdentitySelect, hasVerifiedCommerceEmail } from "./customer-email-identity";

const day = 24 * 60 * 60 * 1000;
const cartKeySchema = z.uuidv4();
const itemsSchema = z.array(z.object({
  productId: z.string().trim().min(1).max(80), quantity: z.number().int().min(1).max(99),
}).strict()).max(30).refine(items => new Set(items.map(item => item.productId)).size === items.length);

export const cartReminderRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("arm"), items: itemsSchema, consent: z.literal(true) }).strict(),
  z.object({ action: z.literal("sync"), cartKey: cartKeySchema, items: itemsSchema }).strict(),
  z.object({ action: z.literal("disarm"), cartKey: cartKeySchema }).strict(),
]);

export const cartReminderUnsubscribeSchema = z.object({ chave: cartKeySchema }).strict();

async function verifiedCartEmail(tx: Pick<Prisma.TransactionClient, "customer" | "user">, customerId: string, now: Date) {
  const customer = await tx.customer.findUnique({ where: { id: customerId }, select: commerceEmailIdentitySelect });
  if (!customer?.email || !hasVerifiedCommerceEmail(customer, now)) return null;
  const staff = await tx.user.findFirst({ where: { OR: [{ customerId }, { email: { equals: customer.email, mode: "insensitive" } }] }, select: { id: true } });
  return staff ? null : customer.email;
}

function pendingReminder(row: { expiresAt: Date; canceledAt: Date | null; claimedAt: Date | null } | null, now: Date) {
  return row && !row.canceledAt && !row.claimedAt && row.expiresAt > now;
}

export async function getCartEmailReminderStatus(customerId: string) {
  const db = getPrisma();
  const now = new Date();
  const row = await db.customerCartEmailReminder.findUnique({ where: { customerId } });
  const email = isCustomerCartEmailConfigured() ? await verifiedCartEmail(db, customerId, now) : null;
  return { eligible: Boolean(email), cartKey: pendingReminder(row, now) ? row?.cartKey ?? null : null };
}

export async function cancelCartEmailReminder(tx: Prisma.TransactionClient, customerId: string, now = new Date()) {
  await tx.customerCartEmailReminder.updateMany({ where: { customerId, canceledAt: null }, data: { canceledAt: now, productIds: [] } });
}

export async function updateCartEmailReminder(customerId: string, request: z.infer<typeof cartReminderRequestSchema>) {
  return getPrisma().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
    const now = new Date();
    const current = await tx.customerCartEmailReminder.findUnique({ where: { customerId } });

    if (request.action === "disarm") {
      if (current?.cartKey === request.cartKey) await cancelCartEmailReminder(tx, customerId, now);
      return { cartKey: null };
    }
    if (request.action === "sync" && (!pendingReminder(current, now) || current?.cartKey !== request.cartKey)) return { cartKey: null };

    const email = isCustomerCartEmailConfigured() ? await verifiedCartEmail(tx, customerId, now) : null;
    if (!email || !request.items.length || (request.action === "sync" && current?.email !== email)) {
      if (request.action === "sync") await cancelCartEmailReminder(tx, customerId, now);
      return { cartKey: null };
    }

    const products = await tx.product.findMany({ where: { id: { in: request.items.map(item => item.productId) } }, select: cartReminderProductSelect });
    const quantities = new Map(request.items.map(item => [item.productId, item.quantity]));
    if (products.length !== request.items.length || products.some(product => !isCartReminderProductAllowed(product) || product.stock < (quantities.get(product.id) ?? Infinity))) {
      if (request.action === "sync") await cancelCartEmailReminder(tx, customerId, now);
      return { cartKey: null };
    }

    if (request.action === "arm" && pendingReminder(current, now)) return { cartKey: null };
    if (request.action === "arm" && current?.claimedAt && now.getTime() - current.claimedAt.getTime() < day) return { cartKey: null };

    const cartKey = request.action === "sync" ? request.cartKey : randomUUID();
    const availableAt = new Date(now.getTime() + day);
    const expiresAt = new Date(availableAt.getTime() + day);
    const productIds = products.map(product => product.id).sort();
    const data = { email, cartKey, availableAt, expiresAt, productIds, optedInAt: request.action === "sync" ? current!.optedInAt : now, canceledAt: null, claimedAt: null };
    if (request.action === "sync") {
      const changed = await tx.customerCartEmailReminder.updateMany({ where: { customerId, cartKey, canceledAt: null, claimedAt: null }, data });
      if (!changed.count) return { cartKey: null };
    } else {
      await tx.customerCartEmailReminder.upsert({ where: { customerId }, create: { customerId, ...data }, update: data });
    }
    await queueCustomerEmail(tx, { eventKey: `cart-reminder:v1:${cartKey}`, kind: "ABANDONED_CART", cartCustomerId: customerId, availableAt });
    return { cartKey };
  });
}

export async function unsubscribeCartEmailReminder(cartKey: string) {
  await getPrisma().customerCartEmailReminder.updateMany({ where: { cartKey, canceledAt: null }, data: { canceledAt: new Date(), productIds: [] } });
}
