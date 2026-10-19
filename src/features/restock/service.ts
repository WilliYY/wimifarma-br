import type { Prisma } from "@/generated/prisma/client";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { restockContactLinks } from "@/features/communications/restock-contact";
import { toSaleProduct } from "@/features/supplier-catalog/commerce";
import { RestockError, type NotificationInput, type RestockInterestDto, type SubscribeInput } from "./contracts";
import { assertSubscription, contactChannels, currentContacts, restockAvailability, restockContactsMatch } from "./rules";

type Session = { user?: { id?: string; role?: string; customerId?: string } } | null;
type Tx = Prisma.TransactionClient;
const productInclude = { supplierOffers: true } satisfies Prisma.ProductInclude;
const include = { product: { include: productInclude } } as const;
type Interest = Prisma.RestockInterestGetPayload<{ include: typeof include }>;
const retention = 30 * 24 * 60 * 60 * 1000;

async function refreshContactConsent<T extends Interest>(tx: Tx, row: T, customer: { phone: string | null; email: string | null }, now: Date, persist = true): Promise<T> {
  if (row.status !== "WAITING" || restockContactsMatch(row, customer)) return row;
  const data = { status: "EXPIRED" as const, phone: null, email: null, expiresAt: now, updatedAt: new Date(Math.max(now.getTime(), row.updatedAt.getTime() + 1)) };
  if (persist) {
    const changed = await tx.restockInterest.updateMany({ where: { id: row.id, status: row.status, updatedAt: row.updatedAt }, data });
    if (changed.count !== 1) throw new RestockError("Aviso atualizado. Recarregue a lista.", 409);
  }
  return { ...row, ...data };
}

async function customerForSession(tx: Tx, session: Session, lock = false) {
  const id = sessionCustomerId(session);
  if (!session?.user?.id || !id) throw new RestockError("Entre na sua conta.", 401);
  if (lock) await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${id} FOR UPDATE`;
  const customer = await tx.customer.findUnique({ where: { id }, select: { id: true, phone: true, email: true, status: true } });
  if (customer?.status !== "ACTIVE") throw new RestockError("Conta indisponível.", 401);
  return customer;
}

/** Bounded opportunistic retention; no contact snapshots survive cancellation or processed expiry. */
export async function cleanupRestockInterests(tx: Tx, now = new Date()) {
  const rows = await tx.restockInterest.findMany({
    where: { expiresAt: { lte: now }, OR: [{ status: { in: ["WAITING", "NOTIFIED"] } }, { phone: { not: null } }, { email: { not: null } }] },
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: 100, select: { id: true },
  });
  if (rows.length) await tx.restockInterest.updateMany({ where: { id: { in: rows.map(row => row.id) }, expiresAt: { lte: now } }, data: { status: "EXPIRED", phone: null, email: null } });
}

function dto(row: Interest, now: Date, admin = false): RestockInterestDto {
  const expired = row.expiresAt <= now && row.status !== "CANCELED";
  const privateContact = !expired && row.status === "WAITING";
  const sale = toSaleProduct(row.product, now.getTime());
  return {
    id: row.id, product: { id: row.product.id, name: row.product.name, slug: row.product.slug, ...(!admin ? { imageUrl: sale.imageUrl } : {}) },
    whatsapp: row.whatsapp, emailEnabled: row.emailEnabled,
    phone: privateContact && row.whatsapp ? row.phone : null, email: privateContact && row.emailEnabled ? row.email : null,
    whatsappNotifiedAt: row.whatsappNotifiedAt?.toISOString() ?? null, emailNotifiedAt: row.emailNotifiedAt?.toISOString() ?? null,
    status: expired ? "EXPIRED" : row.status,
    createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    available: restockAvailability(row.product, now.getTime()).available,
  };
}

export async function getCustomerRestock(tx: Tx, session: Session, productId?: string, now = new Date()) {
  const customer = await customerForSession(tx, session);
  await cleanupRestockInterests(tx, now);
  if (productId) {
    const row = await tx.restockInterest.findUnique({ where: { customerId_productId: { customerId: customer.id, productId } }, include });
    const product = await tx.product.findUnique({ where: { id: productId }, include: productInclude });
    if (!product || !restockAvailability(product, now.getTime()).eligible) throw new RestockError("Produto indisponível para avisos.", 404);
    return { contact: currentContacts(customer), interest: row ? dto(await refreshContactConsent(tx, row, customer, now), now) : null, available: restockAvailability(product, now.getTime()).available };
  }
  const rows = await tx.restockInterest.findMany({ where: { customerId: customer.id }, include, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const interests: RestockInterestDto[] = [];
  let invalidated = 0;
  for (const row of rows) {
    const stale = row.status === "WAITING" && !restockContactsMatch(row, customer);
    interests.push(dto(await refreshContactConsent(tx, row, customer, now, !stale || invalidated++ < 100), now));
  }
  return { interests };
}

export async function subscribeRestock(tx: Tx, session: Session, input: SubscribeInput, now = new Date()) {
  const customer = await customerForSession(tx, session, true);
  await cleanupRestockInterests(tx, now);
  const product = await tx.product.findUnique({ where: { id: input.productId }, include: productInclude });
  if (!product) throw new RestockError("Produto indisponível para avisos.", 404);
  assertSubscription(product, now.getTime());
  const contacts = contactChannels(customer, input);
  const key = { customerId: customer.id, productId: product.id };
  const existing = await tx.restockInterest.findUnique({ where: { customerId_productId: key } });
  const waiting = await tx.restockInterest.count({ where: { customerId: customer.id, status: "WAITING", expiresAt: { gt: now } } });
  if (waiting >= 50 && !(existing?.status === "WAITING" && existing.expiresAt > now)) throw new RestockError("Limite de 50 avisos ativos atingido.", 409);
  const data = { ...contacts, whatsapp: input.whatsapp, emailEnabled: input.email, status: "WAITING" as const, consentAt: now, expiresAt: new Date(now.getTime() + retention), whatsappNotifiedAt: null, emailNotifiedAt: null,
    updatedAt: new Date(Math.max(now.getTime(), (existing?.updatedAt.getTime() ?? 0) + 1)),
  };
  const row = await tx.restockInterest.upsert({ where: { customerId_productId: key }, create: { ...key, ...data }, update: data, include });
  await tx.auditLog.create({ data: { action: "RESTOCK_SUBSCRIBED", entity: "RestockInterest", entityId: row.id } });
  return { interest: dto(row, now) };
}

export async function cancelRestock(tx: Tx, session: Session, id: string, now = new Date()) {
  const customer = await customerForSession(tx, session, true);
  const row = await tx.restockInterest.findFirst({ where: { id, customerId: customer.id }, include });
  if (!row) throw new RestockError("Aviso não localizado.", 404);
  const canceled = await tx.restockInterest.update({ where: { id }, data: { status: "CANCELED", phone: null, email: null, updatedAt: new Date(Math.max(now.getTime(), row.updatedAt.getTime() + 1)) }, include });
  await tx.auditLog.create({ data: { action: "RESTOCK_CANCELED", entity: "RestockInterest", entityId: id } });
  await cleanupRestockInterests(tx, now);
  return { interest: dto(canceled, now) };
}

export async function getAdminRestock(tx: Tx, page: number, filter: "all" | "available", now = new Date()) {
  await cleanupRestockInterests(tx, now);
  const data: (RestockInterestDto & { customer: { name: string } })[] = [];
  let waiting = 0, available = 0, total = 0, invalidated = 0, cursor: string | undefined;
  // Availability includes offer TTLs, allocation and reservations; evaluate the canonical helper.
  // Scan bounded batches, retaining only the requested page and numeric counts.
  while (true) {
    const rows = await tx.restockInterest.findMany({ where: { status: "WAITING", expiresAt: { gt: now }, customer: { status: "ACTIVE" }, product: { status: "ACTIVE", deletedAt: null } },
      include: { ...include, customer: { select: { name: true, phone: true, email: true } } }, orderBy: { id: "asc" }, take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const row of rows) {
      if (!restockContactsMatch(row, row.customer)) {
        await refreshContactConsent(tx, row, row.customer, now, invalidated++ < 100);
        continue;
      }
      const state = restockAvailability(row.product, now.getTime());
      if (!state.eligible) continue;
      waiting++;
      if (state.available) available++;
      if (filter === "available" && !state.available) continue;
      if (total >= (page - 1) * 30 && data.length < 30) data.push({ ...dto(row, now, true), customer: { name: row.customer.name } });
      total++;
    }
    if (rows.length < 200) break;
    cursor = rows.at(-1)!.id;
  }
  return { data, counts: { waiting, available }, page, pages: Math.max(1, Math.ceil(total / 30)), total };
}

async function validateRestockContact(tx: Tx, input: NotificationInput, now: Date) {
  const identity = await tx.restockInterest.findUnique({ where: { id: input.id }, select: { customerId: true } });
  if (!identity) throw new RestockError("Aviso não localizado.", 404);
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${identity.customerId} FOR UPDATE`;
  const row = await tx.restockInterest.findUnique({ where: { id: input.id }, include: { ...include, customer: { select: { status: true, phone: true, email: true } } } });
  if (!row || row.status !== "WAITING" || row.updatedAt.toISOString() !== input.updatedAt) throw new RestockError("Aviso atualizado. Recarregue a lista.", 409);
  if (row.customer.status !== "ACTIVE" || row.expiresAt <= now || row.consentAt > now || row.consentAt.getTime() + retention <= now.getTime()) throw new RestockError("Consentimento indisponível ou expirado.", 409);
  if (!restockAvailability(row.product, now.getTime()).available) throw new RestockError("Produto indisponível para contato.", 409);
  if (!restockContactsMatch(row, row.customer)) throw new RestockError("Contato alterado. O cliente precisa renovar o aviso.", 409);
  const contacts = currentContacts(row.customer);
  const whatsapp = input.channel === "WHATSAPP";
  if (whatsapp ? !row.whatsapp || !row.phone || row.phone !== contacts.phone || row.whatsappNotifiedAt : !row.emailEnabled || !row.email || row.email !== contacts.email || row.emailNotifiedAt) throw new RestockError("Canal sem consentimento válido ou já registrado.", 409);
  return row;
}

/** Prepare a human-operated draft only after fresh validation; no send or state transition. */
export async function prepareRestockDraft(tx: Tx, input: NotificationInput, now = new Date()) {
  const row = await validateRestockContact(tx, input, now);
  const links = restockContactLinks({ phone: row.phone, email: row.email, slug: row.product.slug });
  const url = input.channel === "WHATSAPP" ? links.whatsapp : links.email;
  if (!url) throw new RestockError("Contato indisponível para rascunho.", 409);
  return { draft: { url } };
}

export async function markRestockNotified(tx: Tx, actorId: string, input: NotificationInput, now = new Date()) {
  const row = await validateRestockContact(tx, input, now);
  const whatsapp = input.channel === "WHATSAPP";
  const complete = whatsapp ? !row.emailEnabled || Boolean(row.emailNotifiedAt) : !row.whatsapp || Boolean(row.whatsappNotifiedAt);
  const updated = await tx.restockInterest.updateMany({ where: { id: row.id, status: "WAITING", updatedAt: new Date(input.updatedAt), expiresAt: { gt: now } },
    data: { ...(whatsapp ? { whatsappNotifiedAt: now } : { emailNotifiedAt: now }), ...(complete ? { phone: null, email: null } : {}), status: complete ? "NOTIFIED" : "WAITING", updatedAt: new Date(Math.max(now.getTime(), row.updatedAt.getTime() + 1)) },
  });
  if (updated.count !== 1) throw new RestockError("Aviso atualizado. Recarregue a lista.", 409);
  await tx.auditLog.create({ data: { userId: actorId, action: whatsapp ? "RESTOCK_WHATSAPP_RECORDED" : "RESTOCK_EMAIL_RECORDED", entity: "RestockInterest", entityId: row.id } });
  const result = await tx.restockInterest.findUniqueOrThrow({ where: { id: row.id }, include });
  await cleanupRestockInterests(tx, now);
  return { interest: dto(result, now, true) };
}
